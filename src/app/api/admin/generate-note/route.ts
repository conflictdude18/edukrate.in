import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { GoogleGenAI } from "@google/genai";
import PDFDocument from "pdfkit";
import { randomUUID } from "crypto";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(`${process.cwd()}/package.json`);

pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")
).href;

import { adminDb, adminStorage } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type GeneratedSection = {
  heading: string;
  content: string[];
};

type GeneratedNote = {
  title: string;
  description: string;
  sections: GeneratedSection[];
  keyPoints: string[];
  questions: string[];
};

function cleanText(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function createPdf(note: GeneratedNote): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 55, bottom: 55, left: 55, right: 55 },
      bufferPages: true,
      info: {
        Title: note.title,
        Author: "Edukrate AI Notes",
      },
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.font("Helvetica-Bold").fontSize(22).text(note.title, {
      align: "center",
    });

    doc.moveDown(0.5);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#555555")
      .text(note.description, { align: "center" });

    doc.moveDown(1.5);
    doc.fillColor("#111111");

    for (const section of note.sections) {
      doc.font("Helvetica-Bold").fontSize(15).text(section.heading);
      doc.moveDown(0.4);

      for (const paragraph of section.content) {
        doc.font("Helvetica").fontSize(11).text(paragraph, {
          lineGap: 4,
          paragraphGap: 7,
        });
        doc.moveDown(0.4);
      }

      doc.moveDown(0.6);
    }

    if (note.keyPoints.length) {
      doc.font("Helvetica-Bold").fontSize(15).text("Key Points");
      doc.moveDown(0.4);

      for (const point of note.keyPoints) {
        doc.font("Helvetica").fontSize(11).text(`• ${point}`, {
          lineGap: 3,
        });
      }

      doc.moveDown();
    }

    if (note.questions.length) {
      doc.font("Helvetica-Bold").fontSize(15).text("Practice Questions");
      doc.moveDown(0.4);

      note.questions.forEach((question, index) => {
        doc.font("Helvetica").fontSize(11).text(`${index + 1}. ${question}`, {
          lineGap: 3,
        });
        doc.moveDown(0.3);
      });
    }

    doc.end();
  });
}

export async function POST(request: Request) {
  let uploadedFilePath: string | null = null;
  let uploadedThumbnailPath: string | null = null;

  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const idToken = authorization.slice("Bearer ".length);
    const decodedToken = await getAuth().verifyIdToken(idToken);

    const userSnapshot = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (userSnapshot.data()?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const className = cleanText(body.class, 30);
    const board = cleanText(body.board, 80);
    const subject = cleanText(body.subject, 100);
    const topic = cleanText(body.topic, 200);

    if (!className || !subject || !topic) {
      return NextResponse.json(
        { error: "Class, subject, and topic are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_NOTES_MODEL || "gemini-2.5-flash",
      contents: `Create clear, accurate, student-friendly study notes for:
Class: ${className}
Board: ${board || "Not specified"}
Subject: ${subject}
Topic: ${topic}

Use the requested class level and curriculum context.
Do not invent textbook page numbers or claim official endorsement.
Include useful explanations, definitions, examples where relevant,
a concise key-points section, and practice questions.
Write in English.

Return data matching the requested JSON schema.`,
      config: {
        systemInstruction:
          "You are an educational content writer for Edukrate. Create accurate and clear study notes. If uncertain about a detail, avoid presenting it as fact.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            description: { type: "STRING" },
            sections: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  heading: { type: "STRING" },
                  content: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                  },
                },
                required: ["heading", "content"],
              },
            },
            keyPoints: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            questions: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
          },
          required: [
            "title",
            "description",
            "sections",
            "keyPoints",
            "questions",
          ],
        },
      },
    });

    const rawContent = response.text;

    if (!rawContent) {
      throw new Error("Gemini returned an empty response.");
    }

    const note = JSON.parse(rawContent) as GeneratedNote;

    if (
      !note.title ||
      !note.description ||
      !Array.isArray(note.sections) ||
      !Array.isArray(note.keyPoints) ||
      !Array.isArray(note.questions) ||
      !note.sections.every(
        (section) =>
          typeof section.heading === "string" &&
          Array.isArray(section.content) &&
          section.content.every((item) => typeof item === "string")
      )
    ) {
      throw new Error("The AI response did not match the expected format.");
    }

    const pdfBuffer = await createPdf(note);

    async function renderFirstPage(buffer: Buffer): Promise<Buffer> {
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
      });

      try {
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.25 });

        const canvas = createCanvas(
          Math.ceil(viewport.width),
          Math.ceil(viewport.height)
        );

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Failed to create a 2D canvas context.");
        }

        await page.render({
          canvas: canvas as unknown as HTMLCanvasElement,
          canvasContext:
            context as unknown as CanvasRenderingContext2D,
          viewport,
        }).promise;

        return Buffer.from(await canvas.encode("png"));
      } finally {
        await loadingTask.destroy();
      }
    }

    const noteId = randomUUID();
    const fileName = `${noteId}.pdf`;
    uploadedFilePath = `ai-notes/${fileName}`;

    const bucket = adminStorage.bucket();
    const file = bucket.file(uploadedFilePath);

    await file.save(pdfBuffer, {
      resumable: false,
      metadata: {
        contentType: "application/pdf",
        metadata: {
          generatedBy: decodedToken.uid,
          noteId,
        },
      },
    });

    const [pdfURL] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const thumbnailBuffer = await renderFirstPage(pdfBuffer);

    const thumbnailPath =
      `notes/thumbnails/${noteId}-${Date.now()}.png`;

    uploadedThumbnailPath = thumbnailPath;

    const thumbnailToken = randomUUID();
    const thumbnailFile = bucket.file(thumbnailPath);

    await thumbnailFile.save(thumbnailBuffer, {
      resumable: false,
      contentType: "image/png",
      metadata: {
        contentType: "image/png",
        metadata: {
          firebaseStorageDownloadTokens: thumbnailToken,
        },
      },
    });

    const thumbnailUrl =
      "https://firebasestorage.googleapis.com/v0/b/" +
      bucket.name +
      "/o/" +
      encodeURIComponent(thumbnailPath) +
      "?alt=media&token=" +
      thumbnailToken;

    const userData = userSnapshot.data() || {};

    const noteRecord = {
      title: cleanText(note.title, 200),
      description: cleanText(note.description, 1000),
      class: className,
      subject,
      topic,
      tags: [subject, topic, "AI Generated"],
      pdfURL,
      thumbnailUrl,
      uploaderId: decodedToken.uid,
      uploaderName: cleanText(userData.name || userData.displayName, 100),
      uploaderEmail: decodedToken.email || "",
      uploadDate: new Date(),
      downloadsCount: 0,
      status: "pending" as const,
      board,
      type: "AI Generated",
      keywords: [subject, topic, className],
      likes: 0,
      views: 0,
      downloads: 0,
      saves: 0,
      reports: 0,
      fileSize: pdfBuffer.length,
      fileName,
      filePath: uploadedFilePath,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await adminDb.collection("notes").doc(noteId).set(noteRecord);

    return NextResponse.json({
      success: true,
      noteId,
      title: noteRecord.title,
      status: noteRecord.status,
    });
  } catch (error) {
    console.error("AI note generation failed:", error);

    if (uploadedFilePath) {
      try {
        await adminStorage.bucket().file(uploadedFilePath).delete();
      } catch {
        // Ignore cleanup errors.
      }
    }

    if (uploadedThumbnailPath) {
      try {
        await adminStorage
          .bucket()
          .file(uploadedThumbnailPath)
          .delete();
      } catch {
        // Ignore cleanup errors.
      }
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate the note.",
      },
      { status: 500 }
    );
  }
}
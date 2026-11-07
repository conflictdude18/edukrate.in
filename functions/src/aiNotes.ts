
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { GoogleGenAI } from "@google/genai";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import PDFDocument from "pdfkit";
import { randomUUID } from "node:crypto";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { getApps, initializeApp } from "firebase-admin/app";

const nodeRequire = createRequire(
  `${process.cwd()}/package.json`
);

pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    nodeRequire.resolve(
    "pdfjs-dist/legacy/build/pdf.worker.mjs"
    )
).href;

const app = getApps().length > 0
  ? getApps()[0]
  : initializeApp();

const db = getFirestore(app);
const bucket = getStorage(app).bucket();

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const DAILY_LIMIT = 10;


async function generateRandomTopics(
  apiKey: string,
  count: number
): Promise<Topic[]> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await retryGemini(
    () => ai.models.generateContent({
    model: process.env.GEMINI_NOTES_MODEL || "gemini-2.5-flash",

    contents: `
Generate exactly ${count} diverse educational topics for Edukrate.

Cover a broad range of educational areas:
- School education, Classes 1 through 12.
- Different school boards, including CBSE, ICSE and state boards.
- Undergraduate and graduation-level courses.
- Science, mathematics, commerce, arts, humanities and technology.
- Competitive examinations and their subjects.
- General knowledge and useful educational topics.

Requirements:
- Select varied subjects and education levels.
- Avoid generating multiple topics that cover essentially the same concept.
- Choose specific, useful topics suitable for detailed study notes.
- Do not generate fictional subjects or courses.
- Use English.
- Do not claim affiliation with any educational board.
- Generate exactly ${count} topics.

For school topics, provide the class and education level.
For college topics, provide the course and education level.
For competitive examination topics, identify the relevant exam in the course field.
For general education, use General Education as the education level.

Return JSON matching the required schema.
`,

    config: {
      systemInstruction:
        "You are an educational curriculum planner. Generate diverse, academically appropriate topics.",

      responseMimeType: "application/json",

      responseSchema: {
        type: "OBJECT",
        properties: {
          topics: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                educationLevel: { type: "STRING" },
                class: { type: "STRING" },
                course: { type: "STRING" },
                board: { type: "STRING" },
                subject: { type: "STRING" },
                topic: { type: "STRING" },
              },
              required: [
                "educationLevel",
                "class",
                "course",
                "board",
                "subject",
                "topic",
              ],
            },
          },
        },
        required: ["topics"],
      },
    },
  }),
  "topic generation"
);

  if (!response.text) {
    throw new Error("Gemini returned empty topic suggestions");
  }

  const parsed = JSON.parse(response.text) as {
    topics: Topic[];
  };

  if (
    !Array.isArray(parsed.topics) ||
    parsed.topics.length !== count
  ) {
    throw new Error("Gemini returned an invalid number of topics");
  }

  return parsed.topics.map((topic) => {
    const normalized: Topic = {
      educationLevel: cleanText(topic.educationLevel, 100),
      class: cleanText(topic.class, 50),
      course: cleanText(topic.course, 150),
      board: cleanText(topic.board, 150),
      subject: cleanText(topic.subject, 150),
      topic: cleanText(topic.topic, 200),
    };

    if (
      !normalized.educationLevel ||
      !normalized.subject ||
      !normalized.topic
    ) {
      throw new Error("Gemini generated an incomplete topic");
    }

    return normalized;
  });
}

async function ensurePendingTopics(
  apiKey: string,
  date: string
): Promise<void> {
  const statsRef = db.collection("aiNoteDailyStats").doc(date);
  const topicsRef = db.collection("aiNoteTopics");

  const seedLockId = randomUUID();

  // Reserve topic generation so concurrent executions
  // do not generate duplicate batches.
  const shouldGenerate = await db.runTransaction(
    async (transaction) => {
      const [statsSnapshot, pendingSnapshot] = await Promise.all([
        transaction.get(statsRef),
        transaction.get(
          topicsRef.where("status", "==", "pending").limit(1)
        ),
      ]);

      const stats = statsSnapshot.data() || {};
      const count = Number(stats.count || 0);

      const seedLockUntil =
        stats.topicSeedLockUntil?.toMillis?.() || 0;

      if (count >= DAILY_LIMIT || !pendingSnapshot.empty) {
        return false;
      }

      if (seedLockUntil > Date.now()) {
        return false;
      }

      transaction.set(
        statsRef,
        {
          topicSeedLockId: seedLockId,
          topicSeedLockUntil: Timestamp.fromMillis(
            Date.now() + 5 * 60 * 1000
          ),
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      return true;
    }
  );

  if (!shouldGenerate) {
    return;
  }

  try {
    const statsSnapshot = await statsRef.get();
    const currentCount = Number(
      statsSnapshot.data()?.count || 0
    );

    const remaining = Math.max(
      0,
      DAILY_LIMIT - currentCount
    );

    if (remaining === 0) {
      return;
    }

    const generatedTopics = await generateRandomTopics(
      apiKey,
      remaining
    );

    const batch = db.batch();

    for (const topic of generatedTopics) {
      const topicRef = topicsRef.doc();

      batch.set(topicRef, {
        ...topic,
        status: "pending",
        generatedByAI: true,
        createdAt: Timestamp.now(),
      });
    }

    await batch.commit();

    logger.info("Automatically generated educational topics", {
      date,
      count: generatedTopics.length,
    });
  } finally {
    // Release only this execution's topic-generation lock.
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(statsRef);
      const stats = snapshot.data() || {};

      if (stats.topicSeedLockId === seedLockId) {
        transaction.set(
          statsRef,
          {
            topicSeedLockId: "",
            topicSeedLockUntil: Timestamp.fromMillis(0),
            updatedAt: Timestamp.now(),
          },
          { merge: true }
        );
      }
    });
  }
}

type Topic = {
  educationLevel: string;
  class: string;
  course: string;
  board: string;
  subject: string;
  topic: string;
  generatedNoteId?: string;
};

type GeneratedNote = {
  title: string;
  description: string;
  sections: {
    heading: string;
    content: string[];
  }[];
  keyPoints: string[];
  questions: string[];
};

function cleanText(value: unknown, max = 500): string {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryGemini<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const delays = [10_000, 30_000, 60_000];

  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const details = error as {
        status?: unknown;
        statusCode?: unknown;
        message?: unknown;
        code?: unknown;
      };

      const message = String(
        details?.message || error
      );

      const status = Number(
        details?.status ?? details?.statusCode
      );

      const retryable =
        [429, 500, 502, 503, 504].includes(status) ||
        /\b(429|500|502|503|504)\b/.test(message) ||
        /ECONNRESET|ETIMEDOUT|ECONNREFUSED|fetch failed/i.test(message);

      if (!retryable || attempt >= delays.length) {
        logger.error("Gemini generation failed after retries", {
          operationName,
          attempts: attempt + 1,
          message,
        });

        throw error;
      }

      const delay = delays[attempt];

      logger.warn("Retrying Gemini generation", {
        operationName,
        attempt: attempt + 1,
        nextAttempt: attempt + 2,
        delayMs: delay,
        message,
      });

      await sleep(delay);
    }
  }
}

function indiaDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function createPdf(note: GeneratedNote): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 55,
        bottom: 55,
        left: 55,
        right: 55,
      },
      bufferPages: true,
      info: {
        Title: note.title,
        Author: "Edukrate AI Notes",
      },
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    doc.on("error", reject);

    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    doc.font("Helvetica-Bold")
      .fontSize(22)
      .text(note.title, { align: "center" });

    doc.moveDown();

    doc.font("Helvetica")
      .fontSize(10)
      .fillColor("#555555")
      .text(note.description, { align: "center" });

    doc.moveDown(1.5);
    doc.fillColor("#111111");

    for (const section of note.sections) {
      doc.font("Helvetica-Bold")
        .fontSize(15)
        .text(section.heading);

      doc.moveDown(0.4);

      for (const paragraph of section.content) {
        doc.font("Helvetica")
          .fontSize(11)
          .text(paragraph, {
            lineGap: 4,
            paragraphGap: 7,
          });

        doc.moveDown(0.4);
      }

      doc.moveDown(0.6);
    }

    if (note.keyPoints.length) {
      doc.font("Helvetica-Bold")
        .fontSize(15)
        .text("Key Points");

      doc.moveDown(0.4);

      for (const point of note.keyPoints) {
        doc.font("Helvetica")
          .fontSize(11)
          .text(`• ${point}`, { lineGap: 3 });
      }

      doc.moveDown();
    }

    if (note.questions.length) {
      doc.font("Helvetica-Bold")
        .fontSize(15)
        .text("Practice Questions");

      doc.moveDown(0.4);

      note.questions.forEach((question, index) => {
        doc.font("Helvetica")
          .fontSize(11)
          .text(`${index + 1}. ${question}`, {
            lineGap: 3,
          });

        doc.moveDown(0.3);
      });
    }

    doc.end();
  });
}

async function renderThumbnail(
  buffer: Buffer
): Promise<Buffer> {
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.25 });

    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas context unavailable");
    }

    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext:
        context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    return Buffer.from(await canvas.encode("png"));
  } finally {
    await task.destroy();
  }
}

async function generateContent(
  topic: Topic,
  apiKey: string
): Promise<GeneratedNote> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await retryGemini(
    () => ai.models.generateContent({
    model: process.env.GEMINI_NOTES_MODEL || "gemini-2.5-flash",

    contents: `
Create accurate, detailed, student-friendly study notes.

Education level: ${topic.educationLevel}
Class: ${topic.class || "Not applicable"}
Course: ${topic.course || "Not specified"}
Board: ${topic.board || "Not specified"}
Subject: ${topic.subject}
Topic: ${topic.topic}

Requirements:
- Match the appropriate education level.
- Explain concepts clearly.
- Include definitions and examples.
- Include key points and practice questions.
- Do not invent facts or textbook page numbers.
- Write in English.
- Avoid unsupported claims of official endorsement.

Return JSON matching the required schema.
`,

    config: {
      systemInstruction:
        "You are an educational content writer for Edukrate. Prioritize accuracy, clarity, and age-appropriate explanations.",

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
  }),
  "note content"
);

  if (!response.text) {
    throw new Error("Gemini returned an empty response");
  }

  const note = JSON.parse(response.text) as GeneratedNote;

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
        section.content.every(
          (item) => typeof item === "string"
        )
    )
  ) {
    throw new Error("Invalid Gemini note response");
  }

  return note;
}


async function claimTopic(date: string) {
  const statsRef = db.collection("aiNoteDailyStats").doc(date);
  const topicsRef = db.collection("aiNoteTopics");

  return db.runTransaction(async (transaction) => {
    const statsSnapshot = await transaction.get(statsRef);
    const stats = statsSnapshot.data() || {};

    const count = Number(stats.count || 0);
    const now = Date.now();

    const lockUntil = stats.lockUntil?.toMillis?.() || 0;
    const lockedTopicId = cleanText(stats.lockedTopicId, 150);
    const lockedNoteId = cleanText(stats.lockNoteId, 150);

    if (lockUntil > now) {
      return null;
    }

    // Recover an interrupted generation.
    if (lockedTopicId && lockedNoteId) {
      const oldTopicRef = topicsRef.doc(lockedTopicId);
      const oldTopicSnapshot = await transaction.get(oldTopicRef);

      if (
        oldTopicSnapshot.exists &&
        oldTopicSnapshot.data()?.status === "processing"
      ) {
        const oldTopic = oldTopicSnapshot.data() as Topic;

        transaction.update(oldTopicRef, {
          processingAt: Timestamp.now(),
        });

        transaction.set(
          statsRef,
          {
            lockUntil: Timestamp.fromMillis(
              now + 25 * 60 * 1000
            ),
            updatedAt: Timestamp.now(),
          },
          { merge: true }
        );

        return {
          topic: oldTopic,
          topicRef: oldTopicRef,
          statsRef,
          noteId: lockedNoteId,
        };
      }
    }

    // Remove expired or invalid lock information.
    if (lockedTopicId || lockedNoteId || lockUntil) {
      transaction.set(
        statsRef,
        {
          lockUntil: Timestamp.fromMillis(0),
          lockedTopicId: "",
          lockNoteId: "",
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    }

    if (count >= DAILY_LIMIT) {
      return null;
    }

    const pendingQuery = topicsRef
      .where("status", "==", "pending")
      .limit(1);

    const pendingSnapshot = await transaction.get(pendingQuery);

    if (pendingSnapshot.empty) {
      return null;
    }

    const topicDoc = pendingSnapshot.docs[0];
    const topic = topicDoc.data() as Topic;

    const noteId =
      cleanText(topic.generatedNoteId, 150) || randomUUID();

    transaction.update(topicDoc.ref, {
      status: "processing",
      generatedNoteId: noteId,
      processingAt: Timestamp.now(),
    });

    transaction.set(
      statsRef,
      {
        count,
        lockUntil: Timestamp.fromMillis(
          now + 25 * 60 * 1000
        ),
        lockedTopicId: topicDoc.id,
        lockNoteId: noteId,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    return {
      topic,
      topicRef: topicDoc.ref,
      statsRef,
      noteId,
    };
  });
}

async function generateOneNote(apiKey: string) {
  const date = indiaDate();

  await ensurePendingTopics(apiKey, date);

  const claim = await claimTopic(date);

  if (!claim) {
    logger.info("No available topic or daily limit reached", { date });
    return;
  }

  const { topic, topicRef, statsRef, noteId } = claim;
  const noteRef = db.collection("notes").doc(noteId);

  const pdfPath = `ai-notes/${noteId}.pdf`;
  const thumbnailPath = `notes/thumbnails/${noteId}.png`;

  try {
    const existingNote = await noteRef.get();

    if (!existingNote.exists) {
      const generated = await generateContent(topic, apiKey);
      const pdfBuffer = await createPdf(generated);
      const thumbnailBuffer = await renderThumbnail(pdfBuffer);

      const pdfToken = randomUUID();
      const thumbnailToken = randomUUID();

      const pdfFile = bucket.file(pdfPath);
      const thumbnailFile = bucket.file(thumbnailPath);

      await pdfFile.save(pdfBuffer, {
        resumable: false,
        metadata: {
          contentType: "application/pdf",
          metadata: {
            firebaseStorageDownloadTokens: pdfToken,
            generatedBy: "Edukrate AI Scheduler",
            noteId,
          },
        },
      });

      await thumbnailFile.save(thumbnailBuffer, {
        resumable: false,
        metadata: {
          contentType: "image/png",
          metadata: {
            firebaseStorageDownloadTokens: thumbnailToken,
          },
        },
      });

      const pdfURL =
        `https://firebasestorage.googleapis.com/v0/b/` +
        `${bucket.name}/o/${encodeURIComponent(pdfPath)}` +
        `?alt=media&token=${pdfToken}`;

      const thumbnailUrl =
        `https://firebasestorage.googleapis.com/v0/b/` +
        `${bucket.name}/o/${encodeURIComponent(thumbnailPath)}` +
        `?alt=media&token=${thumbnailToken}`;

      const now = Timestamp.now();

      await noteRef.create({
        title: cleanText(generated.title, 200),
        description: cleanText(generated.description, 1000),

        class: topic.class || topic.educationLevel,
        board: topic.board || "",
        course: topic.course || "",

        subject: topic.subject,
        topic: topic.topic,

        tags: [
          topic.subject,
          topic.topic,
          "AI Generated",
        ],

        keywords: [
          topic.subject,
          topic.topic,
          topic.class || topic.educationLevel,
        ],

        pdfURL,
        thumbnailUrl,

        uploaderId: "edukrate-ai",
        uploaderName: "Edukrate AI",
        uploaderEmail: "",

        uploadDate: now,
        createdAt: now,
        updatedAt: now,

        downloadsCount: 0,
        downloads: 0,
        likes: 0,
        views: 0,
        saves: 0,
        reports: 0,

        fileSize: pdfBuffer.length,
        fileName: `${noteId}.pdf`,
        filePath: pdfPath,

        status: "approved",
        type: "AI Generated",

        generatedByScheduler: true,
        sourceTopicId: topicRef.id,
      });
    }

    // Complete the topic and increment the daily count atomically.
    await db.runTransaction(async (transaction) => {
      const [topicSnapshot, statsSnapshot] = await Promise.all([
        transaction.get(topicRef),
        transaction.get(statsRef),
      ]);

      if (topicSnapshot.data()?.status === "completed") {
        return;
      }

      const currentCount = Number(
        statsSnapshot.data()?.count || 0
      );

      transaction.update(topicRef, {
        status: "completed",
        generatedNoteId: noteId,
        completedAt: Timestamp.now(),
      });

      transaction.set(
        statsRef,
        {
          count: currentCount + 1,
          lockUntil: Timestamp.fromMillis(0),
          lockedTopicId: "",
          lockNoteId: "",
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    });

    logger.info("AI note generated and approved", {
      noteId,
      topic: topic.topic,
      date,
    });
  } catch (error) {
    logger.error("AI note generation failed", {
      noteId,
      error,
    });

    const savedNote = await noteRef.get().catch(() => null);

    // If the note exists, preserve the lock for recovery.
    // The next scheduled execution can finalize this same note.
    if (!savedNote?.exists) {
      await Promise.all([
        bucket.file(pdfPath).delete({ ignoreNotFound: true }).catch(() => {}),
        bucket.file(thumbnailPath).delete({ ignoreNotFound: true }).catch(() => {}),
      ]);

      await db.runTransaction(async (transaction) => {
        const [topicSnapshot, statsSnapshot] = await Promise.all([
          transaction.get(topicRef),
          transaction.get(statsRef),
        ]);

        if (topicSnapshot.data()?.status === "completed") {
          return;
        }

        const stats = statsSnapshot.data() || {};

        // Release only this job's lock.
        if (
          stats.lockedTopicId === topicRef.id &&
          stats.lockNoteId === noteId
        ) {
          transaction.update(topicRef, {
            status: "pending",
            lastError:
              error instanceof Error ? error.message : String(error),
            lastAttemptAt: Timestamp.now(),
          });

          transaction.set(
            statsRef,
            {
              lockUntil: Timestamp.fromMillis(0),
              lockedTopicId: "",
              lockNoteId: "",
              updatedAt: Timestamp.now(),
            },
            { merge: true }
          );
        }
      });
    }

    throw error;
  }
}


export const generateDailyAiNotes = onSchedule(
  {
    schedule: "*/30 6-22 * * *",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
    maxInstances: 1,
    timeoutSeconds: 540,
    memory: "1GiB",
    secrets: [geminiApiKey],
  },
  async () => {
    const apiKey = geminiApiKey.value();

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is empty");
    }

    await generateOneNote(apiKey);
  }
);

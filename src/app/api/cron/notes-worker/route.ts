import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { extractText } from "unpdf";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import {
  getUrlHash,
  updateJob,
} from "@/lib/notes-import/queue";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PDF_SIZE = 20 * 1024 * 1024;
const MAX_TEXT_SIZE = 500_000;
const MAX_JOBS_PER_RUN = 3;

async function processJob(
  id: string,
  job: {
    url: string;
    title: string;
    attempts?: number;
  }
) {
  const hash = getUrlHash(job.url);

  const existing = await adminDb
    .collection("notes")
    .where("sourceHash", "==", hash)
    .limit(1)
    .get();

  if (!existing.empty) {
    await updateJob(id, { status: "duplicate" });
    return "duplicate";
  }

  await updateJob(id, {
    status: "processing",
    attempts: (job.attempts ?? 0) + 1,
  });

  const response = await fetch(job.url, {
    redirect: "error",
    signal: AbortSignal.timeout(25_000),
    headers: {
      "User-Agent": "EdukrateNotesImporter/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`PDF download failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (
    !contentType.includes("pdf") &&
    !job.url.toLowerCase().includes(".pdf")
  ) {
    throw new Error("The source does not appear to be a PDF");
  }

  const contentLength = Number(
    response.headers.get("content-length") ?? 0
  );

  if (contentLength > MAX_PDF_SIZE) {
    throw new Error("PDF exceeds the 20 MB limit");
  }

  const buffer = await response.arrayBuffer();

  if (buffer.byteLength > MAX_PDF_SIZE) {
    throw new Error("PDF exceeds the 20 MB limit");
  }

  const pdf = new Uint8Array(buffer);

  const signature = new TextDecoder().decode(pdf.slice(0, 5));

  if (signature !== "%PDF-") {
    throw new Error("Downloaded file is not a valid PDF");
  }

  const extracted = await extractText(pdf);

  const rawText = Array.isArray(extracted.text)
    ? extracted.text.join("\n")
    : extracted.text || "";

  const text = rawText.slice(0, MAX_TEXT_SIZE);

  if (text.trim().length < 300) {
    throw new Error("Insufficient extractable text");
  }

  const bucket = adminStorage.bucket();

  const storagePath = `imported-notes/${hash}.pdf`;

  await bucket.file(storagePath).save(Buffer.from(pdf), {
    resumable: false,
    metadata: {
      contentType: "application/pdf",
    },
  });

  const file = bucket.file(storagePath);

  const [downloadUrl] = await file.getSignedUrl({
    action: "read",
    expires: "2500-01-01",
  });

  const noteRef = adminDb.collection("notes").doc();

  await noteRef.set({
    title: job.title,
    description: text.slice(0, 1000),
    content: text,
    fileUrl: downloadUrl,
    pdfUrl: downloadUrl,
    sourceUrl: job.url,
    sourceHash: hash,
    storagePath,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    importedBy: "automated-importer",
  });

  await updateJob(id, {
    status: "imported",
    error: undefined,
  });

  return "imported";
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (
    !cronSecret ||
    authHeader !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const queue = adminDb.collection("notesImportQueue");

  const snapshot = await queue
    .where("status", "==", "queued")
    .limit(MAX_JOBS_PER_RUN)
    .get();

  let imported = 0;
  let duplicate = 0;
  let failed = 0;

  for (const document of snapshot.docs) {
    const job = document.data() as {
      url: string;
      title: string;
      attempts?: number;
    };

    try {
      const result = await processJob(document.id, job);

      if (result === "imported") imported++;
      if (result === "duplicate") duplicate++;
    } catch (error) {
      failed++;

      await updateJob(document.id, {
        status: "failed",
        error:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Unknown worker error",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: snapshot.size,
    imported,
    duplicate,
    failed,
  });
}

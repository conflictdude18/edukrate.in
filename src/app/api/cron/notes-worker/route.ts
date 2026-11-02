import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { adminStorage } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { extractText } from "unpdf";
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_PDF_SIZE = 20 * 1024 * 1024;
const MAX_TEXT_SIZE = 100_000;
const MAX_JOBS_PER_RUN = 3;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  return (
    !!secret &&
    request.headers.get("authorization") === `Bearer ${secret}`
  );
}

function isPublicAddress(address: string) {
  try {
    const parsed = ipaddr.parse(address);

    if (parsed.kind() === "ipv6" && parsed.isIPv4MappedAddress()) {
      return parsed.toIPv4Address().range() === "unicast";
    }

    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}

async function validateUrl(rawUrl: string) {
  const url = new URL(rawUrl);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Unsupported protocol");
  }

  if (url.username || url.password) {
    throw new Error("URL credentials are not allowed");
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Local addresses are not allowed");
  }

  const addresses = await lookup(hostname, { all: true });

  if (!addresses.length || addresses.some((entry) => !isPublicAddress(entry.address))) {
    throw new Error("Non-public address rejected");
  }

  return url;
}

async function fetchPdf(url: URL) {
  const response = await fetch(url.toString(), {
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "Edukrate-NotesImporter/1.0",
    },
  });

  if (response.status >= 300 && response.status < 400) {
    throw new Error("Redirects are not allowed");
  }

  if (!response.ok) {
    throw new Error(`PDF request failed: ${response.status}`);
  }

  const contentLength = Number(response.headers.get("content-length") || 0);

  if (contentLength > MAX_PDF_SIZE) {
    throw new Error("PDF exceeds size limit");
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length > MAX_PDF_SIZE) {
    throw new Error("PDF exceeds size limit");
  }

  if (buffer.length < 5 || buffer.subarray(0, 5).toString() !== "%PDF-") {
    throw new Error("Response is not a valid PDF");
  }

  return buffer;
}

function cleanFileName(title: string) {
  return (
    title
      .replace(/[^\w\s.-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 100) || "imported-notes"
  );
}

async function processJob(
  id: string,
  job: { url: string; title: string }
) {
  const jobRef = adminDb.collection("notesImportQueue").doc(id);

  await jobRef.update({
    status: "processing",
    attempts: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });

  try {
    const url = await validateUrl(job.url);

    const sourceHash = crypto
      .createHash("sha256")
      .update(job.url)
      .digest("hex");

    const sourceRef = adminDb
      .collection("notesImportSources")
      .doc(sourceHash);

    const existingSource = await sourceRef.get();

    if (existingSource.exists) {
      await jobRef.update({
        status: "duplicate",
        updatedAt: FieldValue.serverTimestamp(),
      });

      return "duplicate";
    }

    const existingNote = await adminDb
      .collection("notes")
      .where("sourceUrl", "==", job.url)
      .limit(1)
      .get();

    if (!existingNote.empty) {
      await jobRef.update({
        status: "duplicate",
        updatedAt: FieldValue.serverTimestamp(),
      });

      return "duplicate";
    }

    const pdf = await fetchPdf(url);
    const extracted = await extractText(new Uint8Array(pdf));

    const text = (extracted.text || "").slice(0, MAX_TEXT_SIZE);

    if (text.trim().length < 300) {
      throw new Error("Insufficient extractable text");
    }

    const bucket = adminStorage.bucket();
    const fileName = `${cleanFileName(job.title)}-${id}.pdf`;
    const filePath = `notes/imported/${fileName}`;

    const token = crypto.randomUUID();

    const file = bucket.file(filePath);

    await file.save(pdf, {
      resumable: false,
      metadata: {
        contentType: "application/pdf",
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    const pdfURL =
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}` +
      `/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;

    const noteRef = adminDb.collection("notes").doc();

    await noteRef.set({
      title: job.title,
      description: text.slice(0, 500),
      class: "",
      subject: "",
      board: "",
      topic: "",
      tags: [],
      keywords: [],
      type: "Imported",
      pdfURL,
      filePath,
      fileName,
      fileSize: pdf.length,
      thumbnailUrl: "",
      uploaderId: "system",
      uploaderName: "Edukrate Importer",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      downloadsCount: 0,
      status: "pending",
      sourceUrl: job.url,
      importSource: "web-search",
    });

    await sourceRef.set({
      sourceUrl: job.url,
      noteId: noteRef.id,
      status: "imported",
      createdAt: FieldValue.serverTimestamp(),
    });

    await jobRef.update({
      status: "imported",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return "imported";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Import failed";

    await jobRef.update({
      status: "failed",
      error: message.slice(0, 500),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return "failed";
  }
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await adminDb
    .collection("notesImportQueue")
    .where("status", "==", "queued")
    .limit(MAX_JOBS_PER_RUN)
    .get();

  let imported = 0;
  let duplicates = 0;
  let failed = 0;

  for (const document of snapshot.docs) {
    const job = document.data() as {
      url: string;
      title: string;
    };

    const result = await processJob(document.id, job);

    if (result === "imported") imported++;
    else if (result === "duplicate") duplicates++;
    else failed++;
  }

  return NextResponse.json({
    success: true,
    processed: snapshot.size,
    imported,
    duplicates,
    failed,
  });
}
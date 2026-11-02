import { NextRequest, NextResponse } from "next/server";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { extractText } from "unpdf";
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { createHash, randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_PDF_SIZE = 20_000_000;
const MAX_TEXT_SIZE = 100_000;
const MAX_RESULTS_PER_QUERY = 10;
const MAX_IMPORTS_PER_RUN = 5;
const MAX_CANDIDATES_PER_RUN = 8;
const MAX_RUN_TIME_MS = 45_000;

const SEARCH_QUERIES = [
  "Class 12 NCERT Physics chapter wise notes PDF",
  "Class 12 NCERT Chemistry chapter wise notes PDF",
  "Class 12 NCERT Mathematics chapter wise notes PDF",
  "Class 12 Biology chapter wise notes PDF",
  "Class 11 NCERT Physics chapter wise notes PDF",
  "Class 11 NCERT Chemistry chapter wise notes PDF",
  "Class 11 NCERT Mathematics chapter wise notes PDF",
  "Class 11 Biology chapter wise notes PDF",
  "CBSE Class 12 revision notes PDF",
  "CBSE Class 11 revision notes PDF",
  "Class 12 board exam preparation notes PDF",
  "Class 11 science study material PDF",
];

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const serviceAccount =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const bucket = process.env.FIREBASE_STORAGE_BUCKET;

  return initializeApp({
    credential: serviceAccount
      ? cert(JSON.parse(serviceAccount))
      : applicationDefault(),
    ...(bucket ? { storageBucket: bucket } : {}),
  });
}

const app = getAdminApp();
const db = getFirestore(app);
const storage = getStorage(app);

function urlId(url: string) {
  return createHash("sha256").update(url).digest("hex");
}

function isPublicIp(address: string) {
  try {
    return ipaddr.parse(address).range() === "unicast";
  } catch {
    return false;
  }
}

async function validateUrl(raw: string) {
  const url = new URL(raw);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Unsupported URL protocol.");
  }

  if (url.username || url.password) {
    throw new Error("URLs containing credentials are not allowed.");
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Local URLs are not allowed.");
  }

  const addresses = await lookup(hostname, { all: true });

  if (
    !addresses.length ||
    addresses.some(({ address }) => !isPublicIp(address))
  ) {
    throw new Error("URL does not resolve to a public address.");
  }

  return url;
}

async function fetchPdf(rawUrl: string) {
  const safeUrl = await validateUrl(rawUrl);

  const response = await fetch(safeUrl.toString(), {
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
    headers: {
      "User-Agent": "EdukrateNotesImporter/1.0",
      Accept: "application/pdf,application/octet-stream",
    },
  });

  if (!response.ok) {
    throw new Error(`PDF returned status ${response.status}.`);
  }

  const contentType = (
    response.headers.get("content-type") || ""
  ).toLowerCase();

  if (
    !contentType.includes("application/pdf") &&
    !/\.pdf(?:$|[?#])/i.test(safeUrl.href)
  ) {
    throw new Error("Search result is not a PDF.");
  }

  const declaredSize = Number(
    response.headers.get("content-length") || "0"
  );

  if (declaredSize > MAX_PDF_SIZE) {
    throw new Error("PDF exceeds the size limit.");
  }

  if (!response.body) {
    throw new Error("PDF has no readable body.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;
      if (!value) continue;

      size += value.byteLength;

      if (size > MAX_PDF_SIZE) {
        await reader.cancel();
        throw new Error("PDF exceeds the size limit.");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const buffer = Buffer.concat(chunks);

  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Downloaded file is not a valid PDF.");
  }

  return buffer;
}

function cleanText(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdfText(buffer: Buffer) {
  const result = await extractText(new Uint8Array(buffer), {
    mergePages: true,
  });

  const text = cleanText(String(result.text ?? "")).slice(
    0,
    MAX_TEXT_SIZE
  );

  if (text.length < 300) {
    throw new Error(
      "PDF has too little selectable text; it may be scanned."
    );
  }

  return text;
}

function titleFromUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  const filename =
    url.pathname.split("/").pop() || "Study Notes";

  let decodedFilename = filename;

  try {
    decodedFilename = decodeURIComponent(filename);
  } catch {
    // Keep the original filename.
  }

  return (
    decodedFilename
      .replace(/\.pdf$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 250) || "Study Notes"
  );
}

async function searchWeb(query: string): Promise<string[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured.");
  }

  const response = await fetch(
    "https://api.tavily.com/search",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: MAX_RESULTS_PER_QUERY,
        include_answer: false,
      }),
      signal: AbortSignal.timeout(15_000),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Tavily Search returned status ${response.status}.`
    );
  }

  const data = await response.json();

  return (data.results || [])
    .map((result: { url?: string }) => result.url)
    .filter(
      (url: unknown): url is string =>
        typeof url === "string" &&
        /\.pdf(?:$|[?#])/i.test(url)
    );
}

async function uploadPdf(buffer: Buffer, title: string) {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;

  const bucket = bucketName
    ? storage.bucket(bucketName)
    : storage.bucket();

  if (!bucket.name) {
    throw new Error(
      "FIREBASE_STORAGE_BUCKET is not configured."
    );
  }

  const safeName =
    title
      .replace(/[^\w\s.-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 100) || "study-notes";

  const filePath =
    `notes/imported/${Date.now()}-${randomUUID()}-${safeName}.pdf`;

  const token = randomUUID();

  await bucket.file(filePath).save(buffer, {
    resumable: false,
    contentType: "application/pdf",
    metadata: {
      contentType: "application/pdf",
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  return {
    filePath,
    bucketName: bucket.name,
    fileSize: buffer.byteLength,
    pdfURL:
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
      `${encodeURIComponent(filePath)}?alt=media&token=${token}`,
  };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  const startedAt = Date.now();

  const imported: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  let discovered = 0;
  let searchQuery = "";

  try {
    // Rotate to the next search query on each invocation.
    const rotationRef = db
      .collection("notesImportSources")
      .doc("_rotation");

    const rotationDoc = await rotationRef.get();

    const previousIndex = Number(
      rotationDoc.data()?.nextIndex ?? 0
    );

    const queryIndex =
      ((previousIndex % SEARCH_QUERIES.length) +
        SEARCH_QUERIES.length) %
      SEARCH_QUERIES.length;

    searchQuery = SEARCH_QUERIES[queryIndex];

    await rotationRef.set(
      {
        nextIndex:
          (queryIndex + 1) % SEARCH_QUERIES.length,
        lastQuery: searchQuery,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const urls = await searchWeb(searchQuery);

    const foundUrls = [...new Set(urls)].slice(
      0,
      MAX_CANDIDATES_PER_RUN
    );

    discovered = foundUrls.length;

    for (const sourceUrl of foundUrls) {
      if (imported.length >= MAX_IMPORTS_PER_RUN) {
        break;
      }

      if (Date.now() - startedAt > MAX_RUN_TIME_MS) {
        errors.push(
          "Stopped early to stay within the execution time limit."
        );
        break;
      }

      // sourceUrl is a string because searchWeb validates its type.
      const sourceRef = db
        .collection("notesImportSources")
        .doc(urlId(sourceUrl));

      try {
        // Avoid revisiting URLs previously processed.
        const sourceDoc = await sourceRef.get();

        if (sourceDoc.exists) {
          skipped.push(sourceUrl);
          continue;
        }

        // Check the existing notes collection as well.
        const existing = await db
          .collection("notes")
          .where("sourceUrl", "==", sourceUrl)
          .limit(1)
          .get();

        if (!existing.empty) {
          await sourceRef.set({
            sourceUrl,
            status: "duplicate",
            updatedAt: FieldValue.serverTimestamp(),
          });

          skipped.push(sourceUrl);
          continue;
        }

        const buffer = await fetchPdf(sourceUrl);
        const description = await extractPdfText(buffer);

        const title = titleFromUrl(sourceUrl);
        const storageData = await uploadPdf(buffer, title);

        const note = {
          title,
          description,
          class: "",
          subject: "",
          board: "",
          topic: "",
          tags: [],
          keywords: [],
          type: "Imported",
          pdfURL: storageData.pdfURL,
          filePath: storageData.filePath,
          fileName: `${title}.pdf`,
          fileSize: storageData.fileSize,
          thumbnailUrl: "",
          uploaderId: "edukrate-auto-import",
          uploaderName: "Edukrate Auto Import",
          uploaderEmail: "",
          uploadDate: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          downloadsCount: 0,
          status: "pending",
          sourceUrl,
          importSource: "web-search",
        };

        const noteRef = await db
          .collection("notes")
          .add(note);

        await sourceRef.set({
          sourceUrl,
          status: "imported",
          noteId: noteRef.id,
          title,
          updatedAt: FieldValue.serverTimestamp(),
        });

        imported.push(title);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Import failed.";

        errors.push(`${sourceUrl}: ${message}`);

        // Remember failures to avoid retrying indefinitely.
        await sourceRef.set({
          sourceUrl,
          status: "failed",
          error: message.slice(0, 500),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      searchQuery,
      discovered,
      imported: imported.length,
      importedTitles: imported,
      skipped: skipped.length,
      skippedUrls: skipped,
      errors,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Cron import failed.";

    console.error(
      "Scheduled notes import failed:",
      message,
      error
    );

    return NextResponse.json(
      {
        success: false,
        searchQuery,
        error: message,
        imported: imported.length,
        elapsedMs: Date.now() - startedAt,
      },
      { status: 500 }
    );
  }
}
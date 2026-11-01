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
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PDF_SIZE = 20_000_000;
const MAX_TEXT_SIZE = 100_000;
const MAX_RESULTS_PER_QUERY = 10;
const MAX_IMPORTS_PER_RUN = 5;

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
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

  if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new Error("URL does not resolve to a public address.");
  }

  return url;
}

async function fetchPdf(url: string) {
  const safeUrl = await validateUrl(url);

  const response = await fetch(safeUrl.toString(), {
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
    headers: {
      "User-Agent": "EdukrateNotesImporter/1.0",
      Accept: "application/pdf,application/octet-stream",
    },
  });

  if (!response.ok) {
    throw new Error(`PDF returned status ${response.status}.`);
  }

  const contentType = (response.headers.get("content-type") || "").toLowerCase();

  if (
    !contentType.includes("application/pdf") &&
    !/\.pdf(?:$|[?#])/i.test(safeUrl.href)
  ) {
    throw new Error("Search result is not a PDF.");
  }

  const declaredSize = Number(response.headers.get("content-length") || "0");

  if (declaredSize > MAX_PDF_SIZE) {
    throw new Error("PDF exceeds the size limit.");
  }

  if (!response.body) throw new Error("PDF has no readable body.");

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
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

async function extractPdfText(buffer: Buffer) {
  const result = await extractText(new Uint8Array(buffer), {
    mergePages: true,
  });

  const text = cleanText(String(result.text ?? "")).slice(0, MAX_TEXT_SIZE);

  if (text.length < 300) {
    throw new Error("PDF has too little selectable text; it may be scanned.");
  }

  return text;
}

function titleFromUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  const filename = url.pathname.split("/").pop() || "Study Notes";

  return decodeURIComponent(filename)
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 250) || "Study Notes";
}

async function searchWeb(query: string) {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured.");
  }

  const response = await fetch("https://api.tavily.com/search", {
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
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Tavily Search returned status ${response.status}.`);
  }

  const data = await response.json();

  return (data.results || [])
    .map((result: { url?: string }) => result.url)
    .filter(
      (url: unknown): url is string =>
        typeof url === "string" && /\.pdf(?:$|[?#])/i.test(url)
    );
}

async function uploadPdf(buffer: Buffer, title: string) {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();

  if (!bucket.name) {
    throw new Error("FIREBASE_STORAGE_BUCKET is not configured.");
  }

  const safeName =
    title.replace(/[^\w\s.-]/g, "").replace(/\s+/g, "-").slice(0, 100) ||
    "study-notes";

  const filePath = `notes/imported/${Date.now()}-${randomUUID()}-${safeName}.pdf`;
  const token = randomUUID();

  await bucket.file(filePath).save(buffer, {
    resumable: false,
    contentType: "application/pdf",
    metadata: {
      contentType: "application/pdf",
      metadata: { firebaseStorageDownloadTokens: token },
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

const SEARCH_QUERIES = [
  'Class 12 study notes PDF NCERT',
  'Class 12 revision notes PDF physics chemistry mathematics',
  'Class 11 study notes PDF NCERT',
  'Class 12 biology chapter notes PDF',
];

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const imported: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  try {
    const foundUrls = new Set<string>();

    for (const query of SEARCH_QUERIES) {
      const urls = await searchWeb(query);
      urls.forEach((url) => foundUrls.add(url));
    }

    for (const sourceUrl of foundUrls) {
      if (imported.length >= MAX_IMPORTS_PER_RUN) break;

      try {
        const existing = await db
          .collection("notes")
          .where("sourceUrl", "==", sourceUrl)
          .limit(1)
          .get();

        if (!existing.empty) {
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

        await db.collection("notes").add(note);
        imported.push(title);
      } catch (error) {
        errors.push(
          `${sourceUrl}: ${
            error instanceof Error ? error.message : "Import failed"
          }`
        );
      }
    }

    return NextResponse.json({
      success: true,
      discovered: foundUrls.size,
      imported: imported.length,
      importedTitles: imported,
      skipped: skipped.length,
      errors,
    });
  } catch (error) {
    console.error("Scheduled notes import failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Cron import failed.",
        imported: imported.length,
      },
      { status: 500 }
    );
  }
}
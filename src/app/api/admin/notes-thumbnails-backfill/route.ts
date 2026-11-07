import { NextRequest, NextResponse } from "next/server";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  FieldPath,
  getFirestore,
} from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "node:crypto";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(`${process.cwd()}/package.json`);

pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")
).href;

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PDF_SIZE = 20_000_000;
const MAX_BATCH_SIZE = 10;
const SCAN_PAGE_SIZE = 50;

function getFirebaseAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  const serviceAccountJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      ...(storageBucket ? { storageBucket } : {}),
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    ...(storageBucket ? { storageBucket } : {}),
  });
}

const app = getFirebaseAdminApp();
const adminAuth = getAuth(app);
const adminDb = getFirestore(app);
const adminStorage = getStorage(app);

function getStorageBucket() {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  const bucket = bucketName
    ? adminStorage.bucket(bucketName)
    : adminStorage.bucket();

  if (!bucket.name) {
    throw new Error("Firebase Storage bucket is not configured.");
  }

  return bucket;
}

function isTrustedFirebaseStorageUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);

    return (
      url.protocol === "https:" &&
      url.hostname === "firebasestorage.googleapis.com" &&
      url.pathname.startsWith("/v0/b/")
    );
  } catch {
    return false;
  }
}

async function downloadPdf(pdfURL: string): Promise<Buffer> {
  if (!isTrustedFirebaseStorageUrl(pdfURL)) {
    throw new Error("PDF URL is not a trusted Firebase Storage URL.");
  }

  const response = await fetch(pdfURL, {
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`PDF download returned ${response.status}.`);
  }

  const length = Number(response.headers.get("content-length") || 0);

  if (length > MAX_PDF_SIZE) {
    throw new Error("PDF exceeds the 20 MB processing limit.");
  }

  if (!response.body) {
    throw new Error("PDF response has no body.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;
      if (!value) continue;

      total += value.byteLength;

      if (total > MAX_PDF_SIZE) {
        await reader.cancel();
        throw new Error("PDF exceeds the 20 MB processing limit.");
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

async function verifyAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("AUTH_REQUIRED");
  }

  const decoded = await adminAuth.verifyIdToken(
    authorization.slice("Bearer ".length)
  );

  const userSnapshot = await adminDb
    .collection("users")
    .doc(decoded.uid)
    .get();

  if (
    !userSnapshot.exists ||
    userSnapshot.data()?.role !== "admin"
  ) {
    throw new Error("ADMIN_REQUIRED");
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message === "AUTH_REQUIRED") {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (message === "ADMIN_REQUIRED") {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Invalid or expired authentication token." },
      { status: 401 }
    );
  }

  let batchSize = MAX_BATCH_SIZE;
  let cursor = "";

  try {
    const body = await request.json().catch(() => ({}));

    if (Number.isInteger(body?.batchSize)) {
      batchSize = Math.max(
        1,
        Math.min(MAX_BATCH_SIZE, body.batchSize)
      );
    }

    if (typeof body?.cursor === "string") {
      cursor = body.cursor.trim();
    }
  } catch {
    // Use defaults.
  }

  try {
    const bucket = getStorageBucket();
    const notesRef = adminDb.collection("notes");

    let cursorDoc = cursor
      ? await notesRef.doc(cursor).get()
      : null;

    if (cursorDoc && !cursorDoc.exists) {
      cursorDoc = null;
      cursor = "";
    }

    let updated = 0;
    let failed = 0;
    let checked = 0;
    let hasMore = false;
    let nextCursor = cursor;

    const results: Array<{
      id: string;
      status: string;
      error?: string;
    }> = [];

    while (updated + failed < batchSize) {
      let query = notesRef
        .where("status", "==", "approved")
        .orderBy(FieldPath.documentId())
        .limit(SCAN_PAGE_SIZE);

      if (cursorDoc?.exists) {
        query = query.startAfter(cursorDoc);
      }

      const page = await query.get();

      if (page.empty) {
        hasMore = false;
        break;
      }

      let reachedBatchLimit = false;

      for (const noteDoc of page.docs) {
        nextCursor = noteDoc.id;
        cursorDoc = noteDoc;
        checked++;

        const data = noteDoc.data();
        const thumbnailUrl =
          typeof data.thumbnailUrl === "string"
            ? data.thumbnailUrl.trim()
            : "";

        // Existing thumbnails don't need processing.
        if (thumbnailUrl) continue;

        // Stop after this batch has enough missing-thumbnail
        // notes. The cursor points to the last scanned note.
        if (updated + failed >= batchSize) {
          reachedBatchLimit = true;
          break;
        }

        const pdfURL =
          typeof data.pdfURL === "string"
            ? data.pdfURL
            : "";

        if (!pdfURL) {
          failed++;
          results.push({
            id: noteDoc.id,
            status: "failed",
            error: "Missing pdfURL.",
          });
          continue;
        }

        let uploadedPath: string | null = null;

        try {
          const pdfBuffer = await downloadPdf(pdfURL);
          const pngBuffer = await renderFirstPage(pdfBuffer);

          const filePath =
            `notes/thumbnails/${noteDoc.id}-${Date.now()}.png`;

          const token = randomUUID();
          const file = bucket.file(filePath);

          await file.save(pngBuffer, {
            resumable: false,
            contentType: "image/png",
            metadata: {
              contentType: "image/png",
              metadata: {
                firebaseStorageDownloadTokens: token,
              },
            },
          });

          uploadedPath = filePath;

          const thumbnailUrl =
            "https://firebasestorage.googleapis.com/v0/b/" +
            bucket.name +
            "/o/" +
            encodeURIComponent(filePath) +
            "?alt=media&token=" +
            token;

          const latest = await noteDoc.ref.get();
          const latestData = latest.data();
          const latestThumbnail =
            typeof latestData?.thumbnailUrl === "string"
              ? latestData.thumbnailUrl.trim()
              : "";

          if (
            latestData?.status !== "approved" ||
            latestThumbnail
          ) {
            await file.delete().catch(() => undefined);

            results.push({
              id: noteDoc.id,
              status: "skipped",
            });

            continue;
          }

          await noteDoc.ref.update({ thumbnailUrl });

          updated++;
          results.push({
            id: noteDoc.id,
            status: "updated",
          });
        } catch (error) {
          failed++;

          const errorMessage =
            error instanceof Error
              ? error.message
              : String(error);

          console.error(
            `[Thumbnail Backfill] ${noteDoc.id} failed:`,
            error
          );

          if (uploadedPath) {
            await bucket
              .file(uploadedPath)
              .delete()
              .catch(() => undefined);
          }

          results.push({
            id: noteDoc.id,
            status: "failed",
            error: errorMessage,
          });
        }

        if (updated + failed >= batchSize) {
          reachedBatchLimit = true;
          break;
        }
      }

      if (reachedBatchLimit) {
        // The cursor will resume after the last scanned document.
        hasMore = true;
        break;
      }

      if (page.size < SCAN_PAGE_SIZE) {
        hasMore = false;
        break;
      }

      // Continue scanning if this page contained mostly notes
      // that already have thumbnails.
      hasMore = true;
    }

    return NextResponse.json({
      success: true,
      batchSize,
      checked,
      updated,
      failed,
      results,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error("Thumbnail backfill error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Thumbnail backfill failed.",
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "node:crypto";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PDF_SIZE = 20_000_000;
const MAX_BATCH_SIZE = 10;

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

const firebaseAdminApp = getFirebaseAdminApp();
const adminAuth = getAuth(firebaseAdminApp);
const adminDb = getFirestore(firebaseAdminApp);
const adminStorage = getStorage(firebaseAdminApp);

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
    throw new Error(
      "PDF URL is not a trusted Firebase Storage URL."
    );
  }

  const response = await fetch(pdfURL, {
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(
      `PDF download returned ${response.status}.`
    );
  }

  const declaredLength = Number(
    response.headers.get("content-length") || 0
  );

  if (declaredLength > MAX_PDF_SIZE) {
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
        throw new Error(
          "PDF exceeds the 20 MB processing limit."
        );
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

async function renderFirstPage(
  buffer: Buffer
): Promise<Buffer> {
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

    console.log("[Canvas diagnostic]", {
      canvasType: typeof canvas,
      canvasConstructor: canvas?.constructor?.name,
      canvasKeys: Object.keys(canvas ?? {}),
      getContextType: typeof canvas?.getContext,
      canvasModule: typeof createCanvas,
    });

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Failed to create a 2D canvas context."
      );
    }

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    return Buffer.from(await canvas.encode("png"));
  } finally {
    await loadingTask.destroy();
  }
}

async function verifyAdmin(request: NextRequest) {
  const authorization =
    request.headers.get("authorization");

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
      {
        error:
          "Invalid or expired authentication token.",
      },
      { status: 401 }
    );
  }

  let batchSize = MAX_BATCH_SIZE;

  try {
    const body = await request.json().catch(() => ({}));

    if (Number.isInteger(body?.batchSize)) {
      batchSize = Math.max(
        1,
        Math.min(MAX_BATCH_SIZE, body.batchSize)
      );
    }
  } catch {
    // Use the default batch size.
  }

  try {
    const bucket = getStorageBucket();

    const snapshot = await adminDb
      .collection("notes")
      .where("status", "==", "approved")
      .where("thumbnailUrl", "==", "")
      .limit(batchSize)
      .get();

    let updated = 0;
    let failed = 0;

    const results: Array<{
      id: string;
      status: string;
      error?: string;
    }> = [];

    for (const noteDoc of snapshot.docs) {
      const data = noteDoc.data();

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

        // Avoid overwriting a thumbnail added while this
        // request was processing the PDF.
        const latest = await noteDoc.ref.get();
        const latestData = latest.data();

        if (
          latestData?.status !== "approved" ||
          (typeof latestData?.thumbnailUrl === "string" &&
            latestData.thumbnailUrl.trim() !== "")
        ) {
          await file.delete().catch(() => undefined);

          results.push({
            id: noteDoc.id,
            status: "skipped",
          });

          continue;
        }

        // Only update the thumbnail URL.
        await noteDoc.ref.update({
          thumbnailUrl,
        });

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
          `[Thumbnail Backfill] Note ${noteDoc.id} failed:`,
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
    }

    return NextResponse.json({
      success: true,
      batchSize,
      checked: snapshot.size,
      updated,
      failed,
      results,
      hasMore: snapshot.size === batchSize,
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
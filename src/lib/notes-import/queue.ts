import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import crypto from "node:crypto";

export type ImportJobStatus =
  | "queued"
  | "processing"
  | "imported"
  | "duplicate"
  | "failed";

export type ImportJob = {
  url: string;
  title: string;
  status: ImportJobStatus;
  attempts: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  error?: string;
};

export function getUrlHash(url: string) {
  return crypto.createHash("sha256").update(url).digest("hex");
}

export async function enqueuePdf(url: string, title: string) {
  const hash = getUrlHash(url);
  const ref = adminDb.collection("notesImportQueue").doc(hash);

  await adminDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);

    if (existing.exists) return;

    transaction.set(ref, {
      url,
      title,
      status: "queued",
      attempts: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return hash;
}

export async function updateJob(
  id: string,
  data: Partial<ImportJob>
) {
  await adminDb.collection("notesImportQueue").doc(id).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
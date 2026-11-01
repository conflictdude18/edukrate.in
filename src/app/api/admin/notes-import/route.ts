import { NextRequest, NextResponse } from "next/server";
import {
applicationDefault,
cert,
getApps,
initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
FieldValue,
getFirestore,
} from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import { randomUUID } from "node:crypto";
import ipaddr from "ipaddr.js";
import { extractText } from "unpdf";

export const runtime = "nodejs";

const MAX_HTML_SIZE = 5_000_000;
const MAX_PDF_SIZE = 20_000_000;
const MAX_EXTRACTED_TEXT = 100_000;

function getFirebaseAdminApp() {
if (getApps().length > 0) {
return getApps()[0];
}

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

function isPublicIp(address: string) {
try {
return ipaddr.parse(address).range() === "unicast";
} catch {
return false;
}
}

async function validatePublicUrl(rawUrl: string) {
const url = new URL(rawUrl);

if (url.protocol !== "https:" && url.protocol !== "http:") {
throw new Error("Only HTTP and HTTPS URLs are supported.");
}

if (url.username || url.password) {
throw new Error("URLs containing login credentials are not allowed.");
}

const hostname = url.hostname.toLowerCase();

if (
hostname === "localhost" ||
hostname.endsWith(".localhost") ||
hostname.endsWith(".local")
) {
throw new Error("Local addresses are not allowed.");
}

const addresses = await lookup(hostname, { all: true });

if (
!addresses.length ||
addresses.some(({ address }) => !isPublicIp(address))
) {
throw new Error("This URL does not point to a public address.");
}

return url;
}

async function fetchPublicResource(url: URL, accept: string) {
const validatedUrl = await validatePublicUrl(url.toString());

return fetch(validatedUrl.toString(), {
method: "GET",
redirect: "error",
signal: AbortSignal.timeout(20000),
headers: {
"User-Agent": "EdukrateNotesImporter/1.0",
Accept: accept,
},
});
}

function cleanText(value: string) {
return value
.replace(/\u00a0/g, " ")
.replace(/[ \t]+/g, " ")
.replace(/\n[ \t]+/g, "\n")
.replace(/\n\s*\n+/g, "\n\n")
.trim();
}

function looksLikePdfUrl(url: URL) {
return /.pdf(?:$|[?#])/i.test(url.href);
}

function findPdfUrl(html: string, pageUrl: URL): string | null {
const $ = cheerio.load(html);
const candidates: string[] = [];

$("iframe[src], embed[src], object[data], a[href]").each(
(_, element) => {
const tag = element.tagName.toLowerCase();

const rawValue =
tag === "object"
? $(element).attr("data")
: tag === "a"
? $(element).attr("href")
: $(element).attr("src");

if (!rawValue) return;

try {
const resolved = new URL(rawValue, pageUrl);

if (looksLikePdfUrl(resolved)) {
candidates.push(resolved.toString());
}

const parameters = [
"file",
"pdf",
"src",
"url",
"document",
];

for (const parameter of parameters) {
const nestedValue = resolved.searchParams.get(parameter);

if (!nestedValue) continue;

try {
const nestedUrl = new URL(nestedValue, resolved);

if (looksLikePdfUrl(nestedUrl)) {
candidates.push(nestedUrl.toString());
}
} catch {
// Ignore malformed nested URLs.
}
}
} catch {
// Ignore malformed embed URLs.
}
}
);

return candidates[0] || null;
}

async function readResponseBuffer(
response: Response,
maxSize: number,
label: string
): Promise<Buffer> {
const declaredLength = Number(
response.headers.get("content-length") || "0"
);

if (declaredLength > maxSize) {
throw new Error(label + " is too large to import.");
}

if (!response.body) {
throw new Error(label + " has no readable response body.");
}

const reader = response.body.getReader();
const chunks: Uint8Array[] = [];
let totalSize = 0;

try {
while (true) {
const result = await reader.read();

if (result.done) break;
if (!result.value) continue;

totalSize += result.value.byteLength;

if (totalSize > maxSize) {
await reader.cancel();
throw new Error(label + " is too large to import.");
}

chunks.push(result.value);
}
} finally {
reader.releaseLock();
}

return Buffer.concat(chunks);
}

async function extractPdfContent(buffer: Buffer) {
if (buffer.byteLength > MAX_PDF_SIZE) {
throw new Error("The PDF is too large to import.");
}

if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
throw new Error("The downloaded file is not a readable PDF.");
}

const result = await extractText(new Uint8Array(buffer), {
mergePages: true,
});

const rawText = String(result.text ?? "");

const content = cleanText(rawText).slice(
0,
MAX_EXTRACTED_TEXT
);

if (!content) {
throw new Error(
"The PDF was found, but no selectable text was extracted. It may contain scanned page images."
);
}

return content;
}

function getSafeFileName(title: string) {
const safeTitle = title
.replace(/[^\w\s.-]/g, "")
.replace(/\s+/g, "-")
.slice(0, 100);

return (safeTitle || "imported-note") + ".pdf";
}

async function uploadPdfToStorage(
buffer: Buffer,
fileName: string
) {
const bucketName = process.env.FIREBASE_STORAGE_BUCKET;

const bucket = bucketName
? adminStorage.bucket(bucketName)
: adminStorage.bucket();

if (!bucket.name) {
throw new Error(
"Firebase Storage bucket is not configured. Set FIREBASE_STORAGE_BUCKET."
);
}

const filePath =
"notes/imported/" +
Date.now() +
"-" +
randomUUID() +
"-" +
fileName;

const downloadToken = randomUUID();
const file = bucket.file(filePath);

await file.save(buffer, {
resumable: false,
contentType: "application/pdf",
metadata: {
contentType: "application/pdf",
metadata: {
firebaseStorageDownloadTokens: downloadToken,
},
},
});

const encodedFilePath = encodeURIComponent(filePath);

const pdfURL =
"https://firebasestorage.googleapis.com/v0/b/" +
bucket.name +
"/o/" +
encodedFilePath +
"?alt=media&token=" +
downloadToken;

return {
filePath,
pdfURL,
fileSize: buffer.byteLength,
bucketName: bucket.name,
};
}

export async function POST(request: NextRequest) {
let uploadedFilePath: string | null = null;
let uploadedBucketName: string | null = null;

try {
const authorization = request.headers.get("authorization");

if (!authorization?.startsWith("Bearer ")) {
return NextResponse.json(
{ error: "Authentication required." },
{ status: 401 }
);
}

const idToken = authorization.slice("Bearer ".length);
const decodedToken = await adminAuth.verifyIdToken(idToken);

const userSnapshot = await adminDb
.collection("users")
.doc(decodedToken.uid)
.get();

if (
!userSnapshot.exists ||
userSnapshot.data()?.role !== "admin"
) {
return NextResponse.json(
{ error: "Admin access required." },
{ status: 403 }
);
}

const body = await request.json();

const rawUrl =
typeof body?.url === "string"
? body.url.trim()
: "";

if (!rawUrl) {
return NextResponse.json(
{ error: "A webpage URL is required." },
{ status: 400 }
);
}

let targetUrl: URL;

try {
targetUrl = await validatePublicUrl(rawUrl);
} catch (error) {
return NextResponse.json(
{
error:
error instanceof Error
? error.message
: "Invalid webpage URL.",
},
{ status: 400 }
);
}

const response = await fetchPublicResource(
targetUrl,
"text/html,application/xhtml+xml,application/pdf"
);

if (!response.ok) {
return NextResponse.json(
{
error:
"The webpage returned status " + response.status + ".",
},
{ status: 502 }
);
}

const contentType = (
response.headers.get("content-type") || ""
).toLowerCase();

let title = "Imported note";
let pdfBuffer: Buffer | null = null;
let content = "";
let sourceUrl = targetUrl.toString();

if (
contentType.includes("application/pdf") ||
looksLikePdfUrl(targetUrl)
) {
pdfBuffer = await readResponseBuffer(
response,
MAX_PDF_SIZE,
"The PDF"
);

title =
targetUrl.pathname
.split("/")
.pop()
?.replace(/.pdf$/i, "") || "Imported PDF";
} else {
if (
!contentType.includes("text/html") &&
!contentType.includes("application/xhtml+xml")
) {
return NextResponse.json(
{
error:
"The URL does not appear to contain an HTML webpage or PDF.",
},
{ status: 415 }
);
}

const htmlBuffer = await readResponseBuffer(
response,
MAX_HTML_SIZE,
"The webpage"
);

const html = htmlBuffer.toString("utf8");
const $ = cheerio.load(html);

title =
$("title").first().text().trim() ||
$("h1").first().text().trim() ||
"Imported note";

const discoveredPdfUrl = findPdfUrl(html, targetUrl);

if (discoveredPdfUrl) {
const pdfUrl = new URL(discoveredPdfUrl);

const pdfResponse = await fetchPublicResource(
pdfUrl,
"application/pdf,application/octet-stream"
);

if (!pdfResponse.ok) {
throw new Error(
"The PDF returned status " +
pdfResponse.status +
"."
);
}

pdfBuffer = await readResponseBuffer(
pdfResponse,
MAX_PDF_SIZE,
"The PDF"
);

sourceUrl = pdfUrl.toString();
} else {
$(
"script, style, noscript, iframe, svg, nav, footer, header, form"
).remove();

const contentContainer =
$("article").first().length > 0
? $("article").first()
: $("main").first().length > 0
? $("main").first()
: $("body");

content = cleanText(
contentContainer.text()
).slice(0, MAX_EXTRACTED_TEXT);
}
}

if (pdfBuffer) {
content = await extractPdfContent(pdfBuffer);
}

if (!content) {
return NextResponse.json(
{
error:
"No readable text was found. Scanned PDFs may require OCR.",
},
{ status: 422 }
);
}

let storageData: {
filePath: string;
pdfURL: string;
fileSize: number;
bucketName: string;
} | null = null;

let fileName = "";

if (pdfBuffer) {
fileName = getSafeFileName(title);

storageData = await uploadPdfToStorage(
pdfBuffer,
fileName
);

uploadedFilePath = storageData.filePath;
uploadedBucketName = storageData.bucketName;
}

const importedNote = {
title: title.slice(0, 250),
description: content,
class: "",
subject: "",
board: "",
topic: "",
tags: [],
keywords: [],
type: "Imported",

pdfURL: storageData
? storageData.pdfURL
: sourceUrl,

...(storageData
? {
filePath: storageData.filePath,
fileName,
fileSize: storageData.fileSize,
}
: {}),

thumbnailUrl: "",
uploaderId: decodedToken.uid,
uploaderName:
typeof decodedToken.name === "string"
? decodedToken.name
: "Edukrate Admin",
uploaderEmail:
typeof decodedToken.email === "string"
? decodedToken.email
: "",
uploadDate: FieldValue.serverTimestamp(),
createdAt: FieldValue.serverTimestamp(),
updatedAt: FieldValue.serverTimestamp(),
downloadsCount: 0,
status: "pending" as const,
sourceUrl,
importSource: "webpage",
};

const noteRef = await adminDb
.collection("notes")
.add(importedNote);

return NextResponse.json({
success: true,
message: "Imported note saved for admin review.",
note: {
id: noteRef.id,
...importedNote,
uploadDate: null,
createdAt: null,
updatedAt: null,
},
});
} catch (error) {
console.error("Notes import error:", error);

if (uploadedFilePath && uploadedBucketName) {
try {
await adminStorage
.bucket(uploadedBucketName)
.file(uploadedFilePath)
.delete();
} catch (cleanupError) {
console.error(
"Could not clean up imported Storage file:",
cleanupError
);
}
}

return NextResponse.json(
{
error:
error instanceof Error
? error.message
: "An unexpected error occurred during import.",
},
{ status: 500 }
);
}
}
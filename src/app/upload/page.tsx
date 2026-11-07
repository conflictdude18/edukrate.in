
"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import * as pdfjsLib from "pdfjs-dist";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  Layers,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  X,
  FileUp,
  Tag,
  Info,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/firebase/firebase";
import { sendFollowerUploadNotifications } from "@/lib/sendFollowerUploadNotifications";
import { updateCreatorStats } from "@/lib/updateCreatorStats";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const boards = [
  "CBSE",
  "ICSE",
  "Maharashtra Board",
  "State Board",
  "JEE",
  "NEET",
  "CUET",
  "Other",
];

const noteTypes = [
  "Handwritten",
  "Typed",
  "Short Notes",
  "PYQ",
  "Formula Sheet",
  "Sample Paper",
  "Assignment",
  "Other",
];

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function makeKeywords(values: string[]) {
  const words = values
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  return Array.from(new Set(words));
}

const inputClass =
  "h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-4 text-sm font-medium text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10";

export default function UploadPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [board, setBoard] = useState("CBSE");
  const [topic, setTopic] = useState("");
  const [noteType, setNoteType] = useState("Handwritten");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [description, setDescription] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const generatedTags = useMemo(() => {
    const baseTags = [
      subject,
      topic,
      `class ${className}`,
      board,
      noteType,
      title,
    ]
      .map((item) => cleanText(item).toLowerCase())
      .filter((item) => item && item !== "class");

    return Array.from(new Set(baseTags));
  }, [title, subject, className, board, topic, noteType]);

  async function getPdfPageCount(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    return pdf.numPages;
  }

  async function generatePdfThumbnail(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) return null;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport,
    } as any).promise;

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
    });
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    if (!user) {
      toast.error("Please sign in before uploading notes.");
      router.push("/signin");
      return;
    }

    const finalTitle = cleanText(title);
    const finalSubject = cleanText(subject);
    const finalClass = cleanText(className);
    const finalTopic = cleanText(topic);
    const finalDescription = cleanText(description);

    if (!finalTitle || !finalSubject || !finalClass || !finalTopic) {
      toast.error("Please fill title, subject, class, and topic.");
      return;
    }

    if (!pdfFile) {
      toast.error("Please select a PDF file.");
      return;
    }

    if (pdfFile.type !== "application/pdf") {
      toast.error("Only PDF files are allowed.");
      return;
    }

    if (pdfFile.size > 15 * 1024 * 1024) {
      toast.error("PDF size should be less than 15 MB.");
      return;
    }

    try {
      setUploading(true);

      const pageCount = await getPdfPageCount(pdfFile);

      const filePath = `notes/${user.uid}/${Date.now()}-${pdfFile.name}`;
      const storageRef = ref(storage, filePath);

      await uploadBytes(storageRef, pdfFile);
      const pdfURL = await getDownloadURL(storageRef);

      let thumbnailUrl = "";

      const thumbnailBlob = await generatePdfThumbnail(pdfFile);

      if (thumbnailBlob) {
        const thumbnailPath = `thumbnails/${user.uid}/${Date.now()}-${pdfFile.name}.jpg`;
        const thumbnailRef = ref(storage, thumbnailPath);

        await uploadBytes(thumbnailRef, thumbnailBlob, {
          contentType: "image/jpeg",
        });

        thumbnailUrl = await getDownloadURL(thumbnailRef);
      }

      const manualKeywords = keywordsInput
        .split(",")
        .map((keyword) => cleanText(keyword).toLowerCase())
        .filter(Boolean);

      const searchKeywords = makeKeywords([
        finalTitle,
        finalSubject,
        finalClass,
        board,
        finalTopic,
        noteType,
        finalDescription,
        keywordsInput,
      ]);

      const finalTags = Array.from(
        new Set([...generatedTags, ...manualKeywords, ...searchKeywords])
      );

      const docRef = await addDoc(collection(db, "notes"), {
        title: finalTitle,
        subject: finalSubject,
        class: finalClass,
        board,
        topic: finalTopic,
        type: noteType,
        description: finalDescription,

        tags: finalTags,
        keywords: searchKeywords,

        pdfURL,
        thumbnailUrl,
        filePath,
        fileName: pdfFile.name,
        fileSize: pdfFile.size,
        pageCount,

        uploaderId: user.uid,
        uploaderName: user.displayName || user.email || "Edukrate User",
        uploaderEmail: user.email || "",
        uploaderPhotoURL: user.photoURL || "",

        status: "pending",
        moderationStatus: "pending",

        downloads: 0,
        downloadsCount: 0,
        likes: 0,
        likesCount: 0,
        views: 0,
        viewsCount: 0,
        saves: 0,
        reports: 0,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "adminNotifications"), {
        type: "new_note_pending",
        title: "New note pending approval",
        message: `${user.displayName || user.email || "A user"} uploaded a note for approval.`,
        noteTitle: finalTitle,
        noteId: docRef.id,
        uploaderId: user.uid,
        uploaderName: user.displayName || "Edukrate User",
        read: false,
        createdAt: serverTimestamp(),
      });

      try {
        await sendFollowerUploadNotifications({
          uploaderId: user.uid,
          uploaderName: user.displayName || user.email || "Edukrate User",
          noteId: docRef.id,
          noteTitle: finalTitle,
        });
      } catch {
        console.warn("Follower notification failed.");
      }

      try {
        await updateCreatorStats(user.uid);
      } catch {
        console.warn("Creator stats update failed.");
      }

      toast.success("Notes uploaded successfully. Waiting for approval.");

      setTitle("");
      setSubject("");
      setClassName("");
      setBoard("CBSE");
      setTopic("");
      setNoteType("Handwritten");
      setKeywordsInput("");
      setDescription("");
      setPdfFile(null);

      router.push("/my-notes");
    } catch (error) {
      console.error(error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-[var(--foreground)]">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <RefreshCw className="animate-spin text-red-500" size={28} />
          </div>
          <h1 className="mt-5 text-xl font-black">Checking account</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Preparing your upload workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-7 pb-28 text-[var(--foreground)] md:pb-10">
      {/* Header */}
      <header className="border-b border-[var(--border)] pb-7">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-500">
              <UploadCloud size={15} />
              CONTRIBUTION CENTER
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Upload your notes
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
              Share useful study material with the Edukrate community.
              Add accurate details to help other students discover your work.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:w-[390px]">
            <InfoCard
              icon={<BookOpen size={20} />}
              label="Organized"
            />
            <InfoCard
              icon={<ShieldCheck size={20} />}
              label="Reviewed"
            />
            <InfoCard
              icon={<Layers size={20} />}
              label="Searchable"
            />
          </div>
        </div>
      </header>

      <form onSubmit={handleUpload} className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
        {/* Main form */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black">Note information</h2>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Fields marked with * are required.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-x-5 gap-y-5 p-5 sm:grid-cols-2 sm:p-7">
            <Field label="Note title *" className="sm:col-span-2">
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Electrostatics Complete Notes"
                className={inputClass}
              />
            </Field>

            <Field label="Subject *">
              <input
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Physics, Chemistry, Mathematics..."
                className={inputClass}
              />
            </Field>

            <Field label="Class / Exam *">
              <input
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="10, 11, 12, JEE, NEET..."
                className={inputClass}
              />
            </Field>

            <Field label="Board / Exam">
              <select
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                className={inputClass}
              >
                {boards.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Note type">
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                className={inputClass}
              >
                {noteTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Topic / Chapter *" className="sm:col-span-2">
              <input
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Ray Optics, Electrostatics, Organic Chemistry"
                className={inputClass}
              />
            </Field>

            <Field label="Extra keywords" className="sm:col-span-2">
              <div className="relative">
                <Tag
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                />
                <input
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  placeholder="Derivation, formula, important questions..."
                  className={`${inputClass} pl-10`}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Separate multiple keywords with commas.
              </p>
            </Field>

            <Field label="Description" className="sm:col-span-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this PDF contains..."
                rows={4}
                className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10"
              />
            </Field>

            {/* PDF upload */}
            <Field label="PDF document *" className="sm:col-span-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
                {!pdfFile ? (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] px-4 py-10 text-center transition hover:border-red-500/50 hover:bg-red-500/[0.03]">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                      <FileUp size={27} />
                    </div>
                    <span className="text-sm font-bold">
                      Select your PDF file
                    </span>
                    <span className="mt-1 text-xs text-[var(--muted)]">
                      Click here to browse files
                    </span>
                    <span className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)]">
                      PDF only · Maximum 15 MB
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) =>
                        setPdfFile(e.target.files?.[0] || null)
                      }
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                        <FileText size={22} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {pdfFile.name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPdfFile(null)}
                      aria-label="Remove selected PDF"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition hover:border-red-500/40 hover:text-red-500"
                    >
                      <X size={17} />
                    </button>
                  </div>
                )}
              </div>
            </Field>
          </div>

          {/* Generated tags */}
          {generatedTags.length > 0 && (
            <div className="mx-5 mb-6 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-4 sm:mx-7">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold">
                <CheckCircle2 size={17} className="text-red-500" />
                Auto-generated search tags
              </p>

              <div className="flex flex-wrap gap-2">
                {generatedTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-[var(--border)] p-5 sm:px-7 sm:py-6">
            <button
              type="submit"
              disabled={uploading}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white shadow-lg shadow-red-600/15 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <UploadCloud size={18} />
              )}
              {uploading ? "Uploading your notes..." : "Upload notes"}
            </button>

            <p className="mt-3 text-center text-xs text-[var(--muted)]">
              Your upload will be reviewed before becoming publicly available.
            </p>
          </div>
        </div>

        {/* Side information */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="flex items-center gap-2">
              <Info size={17} className="text-red-500" />
              <h3 className="text-sm font-black">Upload guidelines</h3>
            </div>

            <ul className="mt-4 space-y-4">
              <Guideline
                title="Use a clear title"
                description="Mention the subject and chapter so students can find your notes."
              />
              <Guideline
                title="Choose accurate categories"
                description="Select the correct class, board, subject, and note type."
              />
              <Guideline
                title="Upload a readable PDF"
                description="Make sure the document is clear and within the 15 MB limit."
              />
              <Guideline
                title="Add useful keywords"
                description="Include important topics and concepts covered in your PDF."
              />
            </ul>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <ShieldCheck size={21} />
            </div>
            <h3 className="mt-4 text-sm font-black">Review process</h3>
            <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
              Every uploaded note is submitted for approval. Once reviewed
              and approved, it can become available to the Edukrate
              community.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Supported format
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                <FileText size={22} />
              </div>
              <div>
                <p className="text-sm font-black">PDF documents</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Maximum file size: 15 MB
                </p>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

function InfoCard({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-2 py-3 text-center">
      <div className="mb-2 flex justify-center text-red-500">{icon}</div>
      <p className="text-[11px] font-bold text-[var(--muted)] sm:text-xs">
        {label}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-2 block text-sm font-bold text-[var(--foreground)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Guideline({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <li className="flex gap-3">
      <CheckCircle2
        size={17}
        className="mt-0.5 shrink-0 text-red-500"
      />
      <div>
        <p className="text-xs font-bold">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          {description}
        </p>
      </div>
    </li>
  );
}
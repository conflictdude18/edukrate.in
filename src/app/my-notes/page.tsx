
"use client";

import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/firebase/firebase";
import type { Note } from "@/types/note";

type StatusFilter = "all" | "approved" | "pending" | "rejected";

export default function MyNotesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [fetching, setFetching] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchMyNotes = useCallback(async () => {
    if (!user) {
      setNotes([]);
      setFetching(false);
      return;
    }

    setFetching(true);

    try {
      const notesQuery = query(
        collection(db, "notes"),
        where("uploaderId", "==", user.uid)
      );

      const snapshot = await getDocs(notesQuery);

      const data: Note[] = snapshot.docs.map((noteDoc) => ({
        id: noteDoc.id,
        ...(noteDoc.data() as Omit<Note, "id">),
      }));

      setNotes(data);
    } catch (error) {
      console.error("FETCH MY NOTES ERROR:", error);
      toast.error("Could not load your notes.");
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/signin");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading) {
      fetchMyNotes();
    }
  }, [loading, fetchMyNotes]);

  async function deleteFileFromUrl(url?: string) {
    if (!url) return;

    try {
      const decodedURL = decodeURIComponent(url);
      const match = decodedURL.match(/\/o\/(.*?)\?/);

      if (match?.[1]) {
        const storagePath = match[1].replace(/%2F/g, "/");
        await deleteObject(ref(storage, storagePath));
      }
    } catch (error) {
      // A missing storage file should not prevent the note record from being removed.
      console.error("FILE DELETE ERROR:", error);
    }
  }

  async function handleDelete(note: Note) {
    if (!note.id || deletingId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this note? This cannot be undone."
    );

    if (!confirmed) return;

    setDeletingId(note.id);

    try {
      await deleteDoc(doc(db, "notes", note.id));

      await Promise.all([
        deleteFileFromUrl(note.pdfURL),
        deleteFileFromUrl(note.thumbnailUrl),
      ]);

      setNotes((current) =>
        current.filter((item) => item.id !== note.id)
      );

      toast.success("Note deleted.");
    } catch (error) {
      console.error("DELETE ERROR:", error);
      toast.error("Failed to delete note.");
    } finally {
      setDeletingId(null);
    }
  }

  const stats = useMemo(() => {
    return {
      total: notes.length,
      approved: notes.filter((note) => note.status === "approved").length,
      pending: notes.filter((note) => note.status === "pending").length,
      rejected: notes.filter((note) => note.status === "rejected").length,
      downloads: notes.reduce(
        (sum, note) => sum + (note.downloadsCount ?? 0),
        0
      ),
    };
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return notes.filter((note) => {
      const matchesStatus =
        statusFilter === "all" ||
        (note.status || "pending").toLowerCase() === statusFilter;

      const searchableText = [
        note.title,
        note.description,
        note.subject,
        note.class,
        note.topic,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && searchableText.includes(term);
    });
  }, [notes, searchTerm, statusFilter]);

  if (loading || fetching) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center text-[var(--foreground)]">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <RefreshCw className="animate-spin text-red-500" size={26} />
          </div>

          <h1 className="mt-5 text-xl font-black">Loading your notes</h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Fetching your uploads and moderation status...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="w-full min-w-0 space-y-7 pb-28 text-[var(--foreground)] md:pb-10">
      {/* Header */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-xs font-bold text-red-500">
            <FileText size={15} />
            Creator Studio
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            My Notes
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            Manage your uploaded notes, monitor approval status, and track
            downloads from one workspace.
          </p>
        </div>

        <Link
          href="/upload"
          className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500 sm:w-fit"
        >
          <PlusCircle size={18} />
          Upload New Note
        </Link>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total Notes"
          value={stats.total}
          icon={<FileText size={19} />}
          tone="red"
        />
        <StatCard
          label="Downloads"
          value={stats.downloads}
          icon={<Download size={19} />}
          tone="blue"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={<CheckCircle2 size={19} />}
          tone="green"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={<Clock size={19} />}
          tone="yellow"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={<XCircle size={19} />}
          tone="red"
        />
      </section>

      {notes.length === 0 ? (
        <EmptyState
          icon={<UploadCloud size={32} />}
          title="No uploads yet"
          text="Upload your first PDF note and start helping other students study better."
          buttonText="Upload Notes"
          onClick={() => router.push("/upload")}
        />
      ) : (
        <>
          {/* Search and filters */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 sm:p-4">
            <div className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-4">
              <Search
                size={18}
                className="shrink-0 text-[var(--muted)]"
              />

              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search your notes by title, subject, class or topic..."
                className="w-full min-w-0 bg-transparent py-3 text-sm font-medium text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                  className="shrink-0 rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "All Notes", stats.total],
                    ["approved", "Approved", stats.approved],
                    ["pending", "Pending", stats.pending],
                    ["rejected", "Rejected", stats.rejected],
                  ] as const
                ).map(([value, label, count]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      statusFilter === value
                        ? "border-red-500 bg-red-500/10 text-red-500"
                        : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {label}
                    <span className="ml-1.5 opacity-70">{count}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <p className="text-xs text-[var(--muted)]">
                  {filteredNotes.length}{" "}
                  {filteredNotes.length === 1 ? "note" : "notes"} found
                </p>

                <button
                  type="button"
                  onClick={fetchMyNotes}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] transition hover:text-red-500"
                >
                  <RefreshCw size={13} />
                  Refresh
                </button>
              </div>
            </div>
          </section>

          {/* Notes grid */}
          {filteredNotes.length === 0 ? (
            <EmptyState
              icon={<Search size={32} />}
              title="No matching notes"
              text="Try a different search term or select another status filter."
              buttonText="Clear Filters"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
            />
          ) : (
            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-black sm:text-xl">
                  Your uploads
                </h2>
                <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]">
                  {filteredNotes.length}{" "}
                  {filteredNotes.length === 1 ? "note" : "notes"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredNotes.map((note) => (
                  <article
                    key={note.id}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] transition duration-200 hover:border-red-500/40"
                  >
                    {/* Thumbnail */}
                    <div className="relative h-48 overflow-hidden border-b border-[var(--border)] bg-[var(--card-soft)] sm:h-52">
                      {note.thumbnailUrl ? (
                        <Image
                          src={note.thumbnailUrl}
                          alt={note.title || "Note thumbnail"}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--muted)]">
                          <FileText size={38} strokeWidth={1.5} />
                          <span className="text-xs font-bold">PDF Note</span>
                        </div>
                      )}

                      <div className="absolute left-3 top-3">
                        <StatusBadge status={note.status || "pending"} />
                      </div>

                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/65 px-2.5 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                        <Download size={13} />
                        {note.downloadsCount ?? 0}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <h3 className="line-clamp-2 break-words text-base font-bold leading-snug text-[var(--foreground)] transition group-hover:text-red-500 sm:text-lg">
                        {note.title || "Untitled Note"}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                        {note.description || "No description provided."}
                      </p>

                      <div className="mt-4 flex min-w-0 flex-wrap gap-2 pb-2">
                        <MiniTag>{note.subject || "Subject N/A"}</MiniTag>
                        <MiniTag>Class {note.class || "N/A"}</MiniTag>
                        <MiniTag>{note.topic || "Topic N/A"}</MiniTag>
                      </div>

                      <div className="mt-auto grid shrink-0 grid-cols-2 gap-2 border-t border-[var(--border)] pt-4">
                        <Link
                          href={`/notes/${note.id}`}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2 text-xs font-bold text-[var(--foreground)] transition hover:border-red-500/40 hover:text-red-500"
                        >
                          <Eye size={15} />
                          View Note
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDelete(note)}
                          disabled={deletingId === note.id}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === note.id ? (
                            <RefreshCw size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                          {deletingId === note.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = "red",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "red" | "green" | "yellow" | "blue";
}) {
  const toneStyles = {
    red: "bg-red-500/10 text-red-500",
    green: "bg-green-500/10 text-green-500",
    yellow: "bg-yellow-500/10 text-yellow-600",
    blue: "bg-blue-500/10 text-blue-500",
  };

  return (
    <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold text-[var(--muted)] sm:text-sm">
          {label}
        </p>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneStyles[tone]}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-black tabular-nums sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const styles =
    normalized === "approved"
      ? "border-green-500/25 bg-green-500/15 text-green-600"
      : normalized === "rejected"
        ? "border-red-500/25 bg-red-500/15 text-red-500"
        : "border-yellow-500/25 bg-yellow-500/15 text-yellow-600";

  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-xs font-bold capitalize backdrop-blur-md ${styles}`}
    >
      {status}
    </span>
  );
}

function MiniTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="max-w-full truncate rounded-lg border border-[var(--border)] bg-[var(--card-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)] sm:text-xs">
      {children}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  text,
  buttonText,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  buttonText?: string;
  onClick?: () => void;
}) {
  return (
    <section className="flex flex-col items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-14 text-center sm:py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500">
        {icon}
      </div>

      <h2 className="mt-6 text-xl font-black sm:text-2xl">{title}</h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
        {text}
      </p>

      {buttonText && onClick && (
        <button
          type="button"
          onClick={onClick}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500"
        >
          <UploadCloud size={17} />
          {buttonText}
        </button>
      )}
    </section>
  );
}


"use client";

import type React from "react";
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
import { toast } from "sonner";
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { db } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";

type BookmarkType = {
  id: string;
  userId: string;
  noteId: string;
  title: string;
  subject: string;
  class: string;
  topic: string;
  pdfURL: string;
  createdAt: string;
};

export default function SavedNotesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    if (!user) {
      setBookmarks([]);
      setFetching(false);
      return;
    }

    setFetching(true);

    try {
      const bookmarksQuery = query(
        collection(db, "bookmarks"),
        where("userId", "==", user.uid)
      );

      const snapshot = await getDocs(bookmarksQuery);

      const data: BookmarkType[] = snapshot.docs.map((bookmarkDoc) => ({
        id: bookmarkDoc.id,
        ...(bookmarkDoc.data() as Omit<BookmarkType, "id">),
      }));

      setBookmarks(data);
    } catch (error) {
      console.error("BOOKMARK FETCH ERROR:", error);
      toast.error("Failed to load saved notes.");
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
      fetchBookmarks();
    }
  }, [loading, fetchBookmarks]);

  async function removeBookmark(bookmarkId: string) {
    setRemovingId(bookmarkId);

    try {
      await deleteDoc(doc(db, "bookmarks", bookmarkId));

      setBookmarks((current) =>
        current.filter((bookmark) => bookmark.id !== bookmarkId)
      );

      toast.success("Removed from saved notes.");
    } catch (error) {
      console.error("BOOKMARK DELETE ERROR:", error);
      toast.error("Failed to remove saved note.");
    } finally {
      setRemovingId(null);
    }
  }

  const filteredBookmarks = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    if (!term) return bookmarks;

    return bookmarks.filter((item) => {
      const searchableText = [
        item.title,
        item.subject,
        item.class,
        item.topic,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(term);
    });
  }, [bookmarks, searchTerm]);

  const subjectsCount = new Set(
    bookmarks.map((item) => item.subject).filter(Boolean)
  ).size;

  const classesCount = new Set(
    bookmarks
      .map((item) => {
        const match = item.class?.match(/\d+/);
        return match ? match[0] : item.class?.toLowerCase().trim();
      })
      .filter(Boolean)
  ).size;

  if (loading || fetching) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center text-[var(--foreground)]">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <RefreshCw className="animate-spin text-red-500" size={25} />
          </div>

          <h1 className="mt-5 text-lg font-black">
            Loading saved notes
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Opening your personal study library...
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
            <Bookmark size={15} />
            Your Saved Library
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Saved Notes
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            Your bookmarked study materials, organised in one place for
            quick revision and easy access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/browse")}
          className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500 sm:w-fit"
        >
          <BookOpen size={18} />
          Browse Notes
          <ArrowUpRight size={16} />
        </button>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-3 gap-3">
        <StatCard
          label="Saved Notes"
          value={bookmarks.length}
          icon={<Bookmark size={18} />}
        />
        <StatCard
          label="Subjects"
          value={subjectsCount}
          icon={<BookOpen size={18} />}
        />
        <StatCard
          label="Classes"
          value={classesCount}
          icon={<FileText size={18} />}
        />
      </section>

      {/* Search */}
      {bookmarks.length > 0 && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 sm:p-4">
          <div className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-4">
            <Search
              size={18}
              className="shrink-0 text-[var(--muted)]"
            />

            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title, subject, class or topic..."
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

          <div className="mt-3 flex items-center justify-between gap-3 px-1">
            <p className="text-xs text-[var(--muted)]">
              {searchTerm
                ? `${filteredBookmarks.length} matching notes`
                : "Search your saved study materials"}
            </p>

            <button
              type="button"
              onClick={fetchBookmarks}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] transition hover:text-red-500"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </section>
      )}

      {/* Saved notes */}
      {bookmarks.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={32} />}
          title="No saved notes yet"
          text="Browse the notes library and bookmark PDFs. Your saved notes will appear here."
          buttonText="Browse Notes"
          onClick={() => router.push("/browse")}
        />
      ) : filteredBookmarks.length === 0 ? (
        <EmptyState
          icon={<Search size={32} />}
          title="No matching notes"
          text="Try another search term or clear your search to see all saved notes."
          buttonText="Clear Search"
          onClick={() => setSearchTerm("")}
        />
      ) : (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black sm:text-xl">
              Your collection
            </h2>
            <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]">
              {filteredBookmarks.length}{" "}
              {filteredBookmarks.length === 1 ? "note" : "notes"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredBookmarks.map((item) => (
              <article
                key={item.id}
                className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] transition duration-200 hover:border-red-500/40"
              >
                <div className="flex flex-1 gap-4 p-4 sm:p-5">
                  <div className="flex h-[76px] w-[68px] shrink-0 items-center justify-center rounded-xl border border-red-500/15 bg-red-500/10 text-red-500">
                    <FileText size={31} strokeWidth={1.7} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-base font-bold leading-snug text-[var(--foreground)] transition group-hover:text-red-500 sm:text-lg">
                      {item.title || "Untitled Note"}
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <MiniTag>{item.class || "Class not set"}</MiniTag>
                      <MiniTag>{item.subject || "Subject not set"}</MiniTag>
                      {item.topic && <MiniTag>{item.topic}</MiniTag>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--card-soft)] p-3 sm:p-4">
                  <button
                    type="button"
                    onClick={() => router.push(`/notes/${item.noteId}`)}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-500"
                  >
                    <BookOpen size={16} />
                    Open Note
                    <ArrowUpRight size={15} />
                  </button>

                  <button
                    type="button"
                    disabled={removingId === item.id}
                    onClick={() => removeBookmark(item.id)}
                    aria-label="Remove saved note"
                    title="Remove from saved notes"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {removingId === item.id ? (
                      <RefreshCw size={17} className="animate-spin" />
                    ) : (
                      <Trash2 size={17} />
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-semibold text-[var(--muted)] sm:text-sm">
          {label}
        </p>
        <span className="hidden text-red-500 sm:block">{icon}</span>
      </div>

      <p className="mt-2 text-2xl font-black tabular-nums sm:mt-3 sm:text-3xl">
        {value}
      </p>
    </div>
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

      <h2 className="mt-6 text-xl font-black sm:text-2xl">
        {title}
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
        {text}
      </p>

      {buttonText && onClick && (
        <button
          type="button"
          onClick={onClick}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500"
        >
          <BookOpen size={17} />
          {buttonText}
        </button>
      )}
    </section>
  );
}
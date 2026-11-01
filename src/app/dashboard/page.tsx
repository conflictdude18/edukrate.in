
"use client";

import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Heart,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Sparkles,
  Trophy,
  UploadCloud,
  UserRound,
  Video,
  XCircle,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase/firebase";
import type { Note } from "@/types/note";

type HallCreator = {
  userId: string;
  displayName: string;
  photoURL?: string;
  reputation: number;
  verifiedCreator?: boolean;
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topCreators, setTopCreators] = useState<HallCreator[]>([]);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/signin");
    }
  }, [user, loading, router]);

  async function fetchDashboard(isRefresh = false) {
    if (!user) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setFetching(true);
    }

    setFetchError(false);

    try {
      const notesQuery = query(
        collection(db, "notes"),
        where("uploaderId", "==", user.uid)
      );

      const bookmarksQuery = query(
        collection(db, "bookmarks"),
        where("userId", "==", user.uid)
      );

      const topCreatorsQuery = query(
        collection(db, "creatorStats"),
        orderBy("reputation", "desc"),
        limit(5)
      );

      const [notesSnap, bookmarksSnap, topCreatorsSnap] =
        await Promise.all([
          getDocs(notesQuery),
          getDocs(bookmarksQuery),
          getDocs(topCreatorsQuery),
        ]);

      const noteData: Note[] = notesSnap.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<Note, "id">),
      }));

      setNotes(noteData);
      setSavedCount(bookmarksSnap.size);

      setTopCreators(
        topCreatorsSnap.docs.map((docSnap) => {
          const data = docSnap.data();

          return {
            userId: data.userId || docSnap.id,
            displayName: data.displayName || "Edukrate Creator",
            photoURL: data.photoURL || "",
            reputation: Number(data.reputation || 0),
            verifiedCreator: Boolean(data.verifiedCreator),
          };
        })
      );
    } catch (error) {
      console.error("DASHBOARD FETCH ERROR:", error);
      setFetchError(true);
    } finally {
      setFetching(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (user) {
      fetchDashboard();
    }
  }, [user]);

  const stats = useMemo(() => {
    const totalUploads = notes.length;

    const totalDownloads = notes.reduce(
      (sum, note) => sum + getDownloads(note),
      0
    );

    const pending = notes.filter(
      (note) => note.status === "pending"
    ).length;

    const approved = notes.filter(
      (note) => note.status === "approved"
    ).length;

    const rejected = notes.filter(
      (note) => note.status === "rejected"
    ).length;

    return {
      totalUploads,
      totalDownloads,
      pending,
      approved,
      rejected,
    };
  }, [notes]);

const recentNotes = useMemo(() => {
  return [...notes]
    .sort(
      (a, b) =>
        getCreatedTime(b.createdAt) -
        getCreatedTime(a.createdAt)
    )
    .slice(0, 7);
}, [notes]);

  if (loading || fetching) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <RefreshCw
              size={24}
              className="animate-spin text-[var(--primary)]"
            />
          </div>

          <h1 className="mt-5 text-lg font-black text-[var(--foreground)]">
            Loading your dashboard
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Fetching your study activity...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="w-full min-w-0 space-y-6 pb-28 text-[var(--foreground)] md:space-y-7 md:pb-10">

      {/* Header */}
      <section className="flex flex-col justify-between gap-5 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--primary)]">
            <LayoutDashboard size={15} />
            Student Dashboard
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Welcome back
            {user.displayName
              ? `, ${user.displayName.split(" ")[0]}`
              : ""}
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
            Your learning activity, uploaded notes and study
            resources — all in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <Link
            href="/upload"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
          >
            <Plus size={18} />
            Upload Notes
          </Link>
        </div>
      </section>

      {/* Error message */}
      {fetchError && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-500/25 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Some dashboard information could not be loaded.
          </p>

          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            className="w-fit text-sm font-black text-[var(--primary)] hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Statistics */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-black">Your overview</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Your contribution to the Edukrate community.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total uploads"
            value={stats.totalUploads}
            icon={<FileText size={20} />}
            description="Notes you've shared"
            tone="red"
          />

          <StatCard
            label="Total downloads"
            value={stats.totalDownloads}
            icon={<Download size={20} />}
            description="Times your notes were downloaded"
            tone="blue"
          />

          <StatCard
            label="Saved notes"
            value={savedCount}
            icon={<Heart size={20} />}
            description="Notes in your collection"
            tone="pink"
          />

          <StatCard
            label="Approved"
            value={stats.approved}
            icon={<CheckCircle2 size={20} />}
            description="Published study materials"
            tone="green"
          />
        </div>
      </section>

      {/* Main content */}
      <section className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)]">

        {/* Recent uploads */}
        <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">

          <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-black">
                Recent uploads
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Keep track of your latest study materials.
              </p>
            </div>

            <Link
              href="/my-notes"
              className="inline-flex w-fit items-center gap-2 text-sm font-bold text-[var(--primary)] transition hover:gap-3"
            >
              View all
              <ArrowRight size={16} />
            </Link>
          </div>

          {recentNotes.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-5 py-14 text-center sm:px-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--card-soft)] text-[var(--muted)]">
                <UploadCloud size={25} />
              </div>

              <h3 className="mt-4 text-lg font-black">
                No uploads yet
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
                Share your first set of notes and help other
                students learn more effectively.
              </p>

              <Link
                href="/upload"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
              >
                <UploadCloud size={17} />
                Upload your first note
              </Link>
            </div>
          ) : (
            <div className="flex-1 divide-y divide-[var(--border)]">
              {recentNotes.map((note) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  className="group flex min-w-0 items-center gap-3 p-4 transition hover:bg-[var(--surface-hover)] sm:gap-4 sm:px-5"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-soft)] sm:h-16 sm:w-16">
                    {note.thumbnailUrl ? (
                      <Image
                        src={note.thumbnailUrl}
                        alt={note.title || "Note thumbnail"}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--muted)]">
                        <FileText size={23} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-sm font-black transition group-hover:text-[var(--primary)] sm:text-base">
                      {note.title || "Untitled Note"}
                    </h3>

                    <p className="mt-1 line-clamp-1 text-xs text-[var(--muted)]">
                      {note.subject || "Subject"} · Class {note.class || "N/A"}
                      {note.topic ? ` · ${note.topic}` : ""}
                    </p>

                    <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                      <Download size={13} />
                      {getDownloads(note)} downloads
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusBadge status={note.status || "pending"} />
                    <ArrowRight
                      size={16}
                      className="text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--primary)]"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {recentNotes.length > 0 && (
            <div className="mt-auto border-t border-[var(--border)] bg-[var(--card-soft)]/50 px-5 py-3">
              <Link
                href="/my-notes"
                className="flex items-center justify-center gap-2 text-xs font-bold text-[var(--muted-strong)] transition hover:text-[var(--primary)]"
              >
                Manage all your uploads
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="min-w-0 space-y-5">

          {/* Profile */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-soft)] text-lg font-black">
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt="Profile"
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : (
                  user.displayName?.charAt(0).toUpperCase() ||
                  user.email?.charAt(0).toUpperCase() ||
                  "U"
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate font-black">
                  {user.displayName || "NotesWallah User"}
                </h3>

                <p className="truncate text-xs text-[var(--muted)]">
                  {user.email}
                </p>
              </div>
            </div>

            <Link
              href="/profile"
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] text-sm font-bold transition hover:bg-[var(--surface-hover)]"
            >
              <UserRound size={16} />
              View profile
            </Link>
          </div>

          {/* Moderation */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black">Moderation status</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Your upload review progress.
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--card-soft)] text-[var(--muted-strong)]">
                <Clock3 size={18} />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <StatusRow
                icon={<Clock3 size={16} />}
                label="Pending review"
                value={stats.pending}
                tone="yellow"
              />

              <StatusRow
                icon={<CheckCircle2 size={16} />}
                label="Approved"
                value={stats.approved}
                tone="green"
              />

              <StatusRow
                icon={<XCircle size={16} />}
                label="Rejected"
                value={stats.rejected}
                tone="red"
              />
            </div>
          </div>

          {/* Hall of Fame */}
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                  <Trophy size={18} />
                </div>

                <div>
                  <h2 className="font-black">Hall of Fame</h2>
                  <p className="text-xs text-[var(--muted)]">
                    Top community creators
                  </p>
                </div>
              </div>

              <Link
                href="/creators"
                className="text-xs font-black text-[var(--primary)] hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="space-y-1 p-3">
              {topCreators.length === 0 ? (
                <p className="rounded-xl bg-[var(--card-soft)] p-4 text-center text-sm text-[var(--muted)]">
                  No ranked creators yet.
                </p>
              ) : (
                topCreators.map((creator, index) => (
                  <Link
                    key={creator.userId}
                    href={`/profile/${creator.userId}`}
                    className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-[var(--surface-hover)]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--card-soft)] text-xs font-black text-[var(--muted-strong)]">
                      {index + 1}
                    </div>

                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--card-soft)]">
                      {creator.photoURL ? (
                        <Image
                          src={creator.photoURL}
                          alt={creator.displayName}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-black">
                          {creator.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-sm font-bold">
                          {creator.displayName}
                        </p>

                        {creator.verifiedCreator && (
                          <BadgeCheck
                            size={14}
                            className="shrink-0 text-blue-500"
                          />
                        )}
                      </div>

                      <p className="text-xs text-[var(--muted)]">
                        {creator.reputation} reputation
                      </p>
                    </div>

                    <ArrowRight
                      size={15}
                      className="shrink-0 text-[var(--muted)]"
                    />
                  </Link>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>

      {/* Full-width Quick access */}
      <section className="w-full min-w-0">
        <div className="mb-4">
          <h2 className="text-lg font-black">Quick access</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Jump back into your study resources.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickLink
            href="/browse"
            icon={<BookOpen size={20} />}
            title="Browse Notes"
            description="Discover study material"
          />

          <QuickLink
            href="/videos"
            icon={<Video size={20} />}
            title="Video Library"
            description="Explore educational videos"
          />

          <QuickLink
            href="/saved-notes"
            icon={<Heart size={20} />}
            title="Saved Notes"
            description="Continue where you left off"
          />

          <QuickLink
            href="/upload"
            icon={<UploadCloud size={20} />}
            title="Upload Notes"
            description="Share your knowledge"
          />
        </div>
      </section>

      {/* Creator reminder */}
      <section className="flex flex-col gap-4 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/[0.045] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <Sparkles size={20} />
          </div>

          <div>
            <h3 className="font-black">Keep sharing your knowledge</h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted)]">
              Clear titles, accurate subjects and useful descriptions
              help other students discover your notes.
            </p>
          </div>
        </div>

        <Link
          href="/upload"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
        >
          Upload a note
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}

/* -------------------- Components -------------------- */

function StatCard({
  label,
  value,
  icon,
  description,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  tone: "red" | "blue" | "pink" | "green";
}) {
  const tones = {
    red: "bg-red-500/10 text-red-500",
    blue: "bg-blue-500/10 text-blue-500",
    pink: "bg-pink-500/10 text-pink-500",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
  };

  return (
    <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:border-[var(--primary)]/30 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--muted)] sm:text-sm">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            {value.toLocaleString()}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 line-clamp-1 text-[11px] text-[var(--muted)] sm:text-xs">
        {description}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const styles =
    normalized === "approved"
      ? "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400"
      : normalized === "rejected"
        ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
        : "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-black capitalize ${styles}`}
    >
      {status}
    </span>
  );
}

function StatusRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "yellow" | "green" | "red";
}) {
  const tones = {
    yellow: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    green: "bg-green-500/10 text-green-700 dark:text-green-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}
        >
          {icon}
        </div>
        <span className="text-sm font-semibold text-[var(--muted-strong)]">
          {label}
        </span>
      </div>

      <span className="text-sm font-black tabular-nums">{value}</span>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:border-[var(--primary)]/30 hover:bg-[var(--surface-hover)]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--card-soft)] text-[var(--muted-strong)] transition group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-black">{title}</h3>
        <p className="mt-1 truncate text-xs text-[var(--muted)]">
          {description}
        </p>
      </div>

      <ArrowRight
        size={16}
        className="shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--primary)]"
      />
    </Link>
  );
}

/* -------------------- Helpers -------------------- */

function getNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : 0;
}

function getDownloads(note: Note): number {
  return (
    getNumber(note.downloadsCount) ||
    getNumber(note.downloads)
  );
}

function getCreatedTime(value: unknown): number {
  if (!value) return 0;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().getTime();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    return value.seconds * 1000;
  }

  if (typeof value === "string") {
    return new Date(value).getTime() || 0;
  }

  return 0;
}

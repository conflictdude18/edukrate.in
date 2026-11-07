
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Bot,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  LibraryBig,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  UploadCloud,
  Users,
  Video,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { db } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";

type HomeNote = {
  id: string;
  title?: string;
  subject?: string;
  class?: string;
  board?: string;
  topic?: string;
  thumbnailUrl?: string;
  fileUrl?: string;
  status?: string;
  views?: number;
  viewsCount?: number;
  likes?: number;
  likesCount?: number;
  downloads?: number;
  downloadsCount?: number;
  createdAt?: unknown;
};

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
};

const DEFAULT_SUBJECTS = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "JEE",
  "NEET",
];

const FEATURES: Feature[] = [
  {
    title: "Notes Library",
    description:
      "Discover study notes, summaries and learning resources shared by students.",
    icon: LibraryBig,
    href: "/browse",
    color: "#3b82f6",
  },
  {
    title: "Notique AI",
    description:
      "Get AI-powered assistance to understand concepts and improve your learning.",
    icon: Bot,
    href: "/notique",
    color: "#a78bfa",
  },
  {
    title: "Video Library",
    description:
      "Explore educational videos and helpful explanations for your studies.",
    icon: Video,
    href: "/videos",
    color: "#f97316",
  },
  {
    title: "Share Your Notes",
    description:
      "Upload your notes and make useful learning material available to others.",
    icon: UploadCloud,
    href: "/upload",
    color: "#22c55e",
  },
  {
    title: "Save Resources",
    description:
      "Keep useful study material organised and accessible in your collection.",
    icon: Bookmark,
    href: "/saved-notes",
    color: "#eab308",
  },
  {
    title: "Student Community",
    description:
      "Discover creators and connect with students who share learning resources.",
    icon: Users,
    href: "/creators",
    color: "#06b6d4",
  },
  {
    title: "Hall of Fame",
    description:
      "Recognise contributors who make a difference in the Edukrate community.",
    icon: Trophy,
    href: "/hall-of-fame",
    color: "#f59e0b",
  },
  {
    title: "Community Feedback",
    description:
      "Share your feedback and help improve the learning experience.",
    icon: MessageSquare,
    href: "/feedback",
    color: "#ec4899",
  },
];

function getNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getDownloads(note: HomeNote): number {
  return getNumber(note.downloadsCount || note.downloads);
}

function getLikes(note: HomeNote): number {
  return getNumber(note.likesCount || note.likes);
}

function getViews(note: HomeNote): number {
  return getNumber(note.viewsCount || note.views);
}

function getTrendingScore(note: HomeNote): number {
  return getDownloads(note) * 3 + getLikes(note) * 2 + getViews(note);
}

function getCreatedTime(value: unknown): number {
  if (!value) return 0;

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "object" && value !== null) {
    const timestamp = value as {
      toDate?: () => Date;
      seconds?: number;
    };

    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate().getTime();
    }

    if (typeof timestamp.seconds === "number") {
      return timestamp.seconds * 1000;
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: unknown): string {
  const time = getCreatedTime(value);

  if (!time) return "Recently uploaded";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(time));
}

function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkText = "View all",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
          {eyebrow}
        </div>

        <h2 className="text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-3xl">
          {title}
        </h2>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            {description}
          </p>
        )}
      </div>

      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[var(--primary)] transition hover:gap-3"
        >
          {linkText}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}

function NoteCard({ note }: { note: HomeNote }) {
  const title = note.title?.trim() || "Untitled study note";
  const subject = note.subject?.trim() || "Study Material";

  return (
    <Link
      href="/signin"
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-[var(--card)] transition duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/50 hover:shadow-xl"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--card-soft)]">
        {note.thumbnailUrl ? (
          <Image
            src={note.thumbnailUrl}
            alt={title}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--panel)] text-[var(--primary)]">
              <FileText size={30} />
            </div>
          </div>
        )}

        <div className="absolute left-3 top-3">
          <span className="rounded-lg border border-[var(--border)] bg-[var(--panel)]/90 px-3 py-1.5 text-xs font-bold text-[var(--foreground)] backdrop-blur-md">
            {subject}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-12 text-base font-bold leading-6 text-[var(--foreground)] transition group-hover:text-[var(--primary)]">
          {title}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          {note.class && <span>Class {note.class}</span>}
          {note.class && note.board && <span>•</span>}
          {note.board && <span>{note.board}</span>}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-4 mt-4">
          <span className="text-xs text-[var(--muted)]">
            {formatDate(note.createdAt)}
          </span>

          <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)]">
            View note
            <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ loading }: { loading: boolean }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--card-soft)] text-[var(--muted)]">
        <FileText size={26} />
      </div>

      <h3 className="font-bold text-[var(--foreground)]">
        {loading ? "Loading study resources..." : "No notes available yet"}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">
        {loading
          ? "We're fetching the latest approved notes."
          : "New study resources will appear here when they are published."}
      </p>
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();

  const [notes, setNotes] = useState<HomeNote[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isLoggedIn = Boolean(user);

  useEffect(() => {
    const unsubscribeNotes = onSnapshot(
      collection(db, "notes"),
      (snapshot) => {
        const approvedNotes = snapshot.docs
          .map((document) => ({
            id: document.id,
            ...document.data(),
          }) as HomeNote)
          .filter((note) => note.status === "approved");

        setNotes(approvedNotes);
        setLoading(false);
      },
      (error) => {
        console.error("Landing page notes error:", error);
        setLoading(false);
      }
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setStudentCount(snapshot.size);
      },
      (error) => {
        console.error("Landing page users error:", error);
      }
    );

    return () => {
      unsubscribeNotes();
      unsubscribeUsers();
    };
  }, []);

  const stats = useMemo(() => {
    const subjects = new Set(
      notes
        .map((note) => note.subject?.trim())
        .filter((subject): subject is string => Boolean(subject))
    );

    const downloads = notes.reduce(
      (total, note) => total + getDownloads(note),
      0
    );

    return {
      notes: notes.length,
      subjects: subjects.size,
      downloads,
      students: studentCount,
    };
  }, [notes, studentCount]);

  const trendingNotes = useMemo(
    () =>
      [...notes]
        .sort((a, b) => getTrendingScore(b) - getTrendingScore(a))
        .slice(0, 6),
    [notes]
  );

  const latestNotes = useMemo(
    () =>
      [...notes]
        .sort(
          (a, b) =>
            getCreatedTime(b.createdAt) - getCreatedTime(a.createdAt)
        )
        .slice(0, 4),
    [notes]
  );

  const subjectLinks = useMemo(() => {
    const counts = new Map<string, number>();

    notes.forEach((note) => {
      const subject = note.subject?.trim();

      if (subject) {
        counts.set(subject, (counts.get(subject) || 0) + 1);
      }
    });

    if (counts.size === 0) {
      return DEFAULT_SUBJECTS.map((subject) => ({
        name: subject,
        count: 0,
      }));
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [notes]);

  const mainCta = isLoggedIn ? "/dashboard" : "/signup";
  const mainCtaText = isLoggedIn ? "Go to Dashboard" : "Create Free Account";

  return (
    <main className="min-h-screen overflow-hidden border-x-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-2xl">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b-2 border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <Link href="/landing" className="flex shrink-0 items-center gap-3">
            <div className="relative h-10 w-10">
              <Image
                src="/edukratelogo.png"
                alt="Edukrate logo"
                fill
                priority
                sizes="40px"
                className="object-contain"
              />
            </div>

            <div>
              <span className="block text-lg font-black tracking-tight">
                Edukrate
              </span>
              <span className="-mt-0.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                Learn. Organize. Grow.
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            <a
              href="#features"
              className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              Features
            </a>
            <a
              href="#notes"
              className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              Notes
            </a>
            <a
              href="#subjects"
              className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              Subjects
            </a>
            <Link
              href="/videos"
              className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              Videos
            </Link>
            <Link
              href="/notique"
              className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              Notique AI
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white transition hover:opacity-90"
              >
                Dashboard
                <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="hidden h-10 items-center justify-center rounded-xl px-4 text-sm font-bold transition hover:bg-[var(--surface-hover)] sm:inline-flex"
                >
                  Sign In
                </Link>

                <Link
                  href="/signup"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white shadow-lg shadow-red-600/10 transition hover:-translate-y-0.5 hover:opacity-90"
                >
                  Get Started
                  <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative isolate border-b-2 border-[var(--border)]">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-40 -top-40 h-[550px] w-[550px] rounded-full bg-[var(--primary)] opacity-[0.08] blur-[130px]" />
          <div className="absolute -left-40 bottom-0 h-[350px] w-[350px] rounded-full bg-blue-500 opacity-[0.06] blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="mx-auto grid w-full max-w-[1600px] items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-10 lg:py-28">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-2 text-xs font-bold text-[var(--primary)]">
              <Sparkles size={14} />
              YOUR STUDY SPACE, REIMAGINED
            </div>

            <h1 className="text-4xl font-black leading-[1.12] tracking-tight sm:text-5xl lg:text-7xl">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-[var(--primary)] to-orange-500 bg-clip-text text-transparent">
                learn better.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              Discover quality study notes, explore educational videos, get
              AI-powered learning support and share knowledge with a growing
              student community — all in one place.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href={mainCta}
                className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-[var(--primary)] px-7 text-sm font-black text-white shadow-xl shadow-red-600/20 transition hover:-translate-y-1 hover:opacity-90"
              >
                {mainCtaText}
                <ArrowRight size={18} />
              </Link>

              <Link
                href="/browse"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-xl border-2 border-[var(--border)] bg-[var(--card)] px-7 text-sm font-bold transition hover:border-[var(--primary)]/50 hover:bg-[var(--surface-hover)]"
              >
                <Search size={17} />
                Explore Notes
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-[var(--muted)]">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[var(--success)]" />
                Free to get started
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={15} className="text-[var(--success)]" />
                Student-focused platform
              </span>
              <span className="inline-flex items-center gap-2">
                <Zap size={15} className="text-[var(--warning)]" />
                Learn at your pace
              </span>
            </div>
          </div>

          {/* HERO PREVIEW */}
          <div className="relative mx-auto w-full max-w-[570px]">
            <div className="absolute -inset-5 rounded-[36px] bg-gradient-to-br from-[var(--primary)]/15 via-transparent to-blue-500/10 blur-2xl" />

            <div className="relative overflow-hidden rounded-[28px] border-2 border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl sm:p-6">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                    Welcome to
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    Your learning hub
                  </h2>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <GraduationCap size={24} />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                    <BookOpen size={19} />
                  </div>
                  <p className="text-2xl font-black">
                    {formatNumber(stats.notes)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Study notes
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                    <Bot size={19} />
                  </div>
                  <p className="text-2xl font-black">AI</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Learning assistant
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                    <Video size={19} />
                  </div>
                  <p className="text-2xl font-black">Videos</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Visual learning
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                    <Users size={19} />
                  </div>
                  <p className="text-2xl font-black">
                    {formatNumber(stats.students)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Registered users
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">Explore your subjects</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Find resources for your learning goals
                    </p>
                  </div>
                  <BookOpen size={19} className="text-[var(--primary)]" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {DEFAULT_SUBJECTS.map((subject) => (
                    <span
                      key={subject}
                      className="rounded-lg border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2 text-xs font-semibold text-[var(--muted-strong)]"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
                  <Sparkles size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">Make learning count</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Learn, contribute and grow with Edukrate.
                  </p>
                </div>
                <ArrowUpRight
                  size={18}
                  className="shrink-0 text-[var(--primary)]"
                />
              </div>
            </div>

            <div className="absolute -left-5 top-24 hidden items-center gap-3 rounded-2xl border-2 border-[var(--border)] bg-[var(--card)] p-3 shadow-xl sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                <Download size={20} />
              </div>
              <div>
                <p className="text-sm font-black">Share knowledge</p>
                <p className="text-[10px] text-[var(--muted)]">
                  Help other students
                </p>
              </div>
            </div>

            <div className="absolute -right-5 bottom-20 hidden items-center gap-3 rounded-2xl border-2 border-[var(--border)] bg-[var(--card)] p-3 shadow-xl sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                <Bot size={20} />
              </div>
              <div>
                <p className="text-sm font-black">Notique AI</p>
                <p className="text-[10px] text-[var(--muted)]">
                  Smarter learning support
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATISTICS */}
      <section className="border-b-2 border-[var(--border)] bg-[var(--panel)]">
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-2 gap-y-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-10">
          {[
            { label: "Approved notes", value: stats.notes, icon: FileText },
            { label: "Subjects covered", value: stats.subjects, icon: BookOpen },
            { label: "Total downloads", value: stats.downloads, icon: Download },
            { label: "Registered students", value: stats.students, icon: Users },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="flex items-center gap-4 border-[var(--border)] px-2 sm:px-6 md:border-r md:last:border-r-0"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Icon size={22} />
                </div>

                <div>
                  <p className="text-2xl font-black tracking-tight sm:text-3xl">
                    {formatNumber(item.value)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[var(--muted)] sm:text-sm">
                    {item.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="mx-auto w-full max-w-[1600px] px-4 py-20 sm:px-6 lg:px-10 lg:py-24"
      >
        <SectionHeading
          eyebrow="The Edukrate experience"
          title="More than just study notes"
          description="A collection of learning tools designed to make studying, sharing and discovering educational resources easier."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;

            return (
              <Link
                key={feature.title}
                href={isLoggedIn ? feature.href : "/signin"}
                className="group rounded-2xl border-2 border-[var(--border)] bg-[var(--card)] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/50 hover:shadow-xl"
              >
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    color: feature.color,
                    backgroundColor: `${feature.color}18`,
                  }}
                >
                  <Icon size={24} />
                </div>

                <h3 className="text-base font-bold">
                  {feature.title}
                </h3>

                <p className="mt-2 min-h-[66px] text-sm leading-6 text-[var(--muted)]">
                  {feature.description}
                </p>

                <div className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[var(--primary)]">
                  Explore feature
                  <ArrowRight
                    size={14}
                    className="transition group-hover:translate-x-1"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* TRENDING NOTES */}
      <section
        id="notes"
        className="border-y-2 border-[var(--border)] bg-[var(--panel)]"
      >
        <div className="mx-auto w-full max-w-[1600px] px-4 py-20 sm:px-6 lg:px-10 lg:py-24">
          <SectionHeading
            eyebrow="Popular resources"
            title="Trending study notes"
            description="Explore notes that are getting attention from the Edukrate community."
            href="/browse"
            linkText="Explore library"
          />

          {trendingNotes.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {trendingNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          ) : (
            <EmptyState loading={loading} />
          )}
        </div>
      </section>

      {/* LATEST UPLOADS */}
      <section className="mx-auto w-full max-w-[1600px] px-4 py-20 sm:px-6 lg:px-10 lg:py-24">
        <SectionHeading
          eyebrow="Fresh resources"
          title="Recently uploaded"
          description="Take a look at the latest approved study material shared on Edukrate."
          href="/browse"
          linkText="View all notes"
        />

        {latestNotes.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {latestNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        ) : (
          <EmptyState loading={loading} />
        )}
      </section>

      {/* SUBJECTS */}
      <section
        id="subjects"
        className="border-y-2 border-[var(--border)] bg-[var(--panel)]"
      >
        <div className="mx-auto w-full max-w-[1600px] px-4 py-20 sm:px-6 lg:px-10 lg:py-24">
          <SectionHeading
            eyebrow="Find your focus"
            title="Explore by subject"
            description="Find learning resources based on the subjects and exams that matter to you."
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {subjectLinks.map((subject, index) => (
              <Link
                key={subject.name}
                href="/signin"
                className="group flex min-h-24 items-center justify-between gap-3 rounded-2xl border-2 border-[var(--border)] bg-[var(--card)] p-4 transition hover:-translate-y-1 hover:border-[var(--primary)]/50 hover:shadow-lg sm:p-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      index % 4 === 0
                        ? "bg-blue-500/10 text-blue-500"
                        : index % 4 === 1
                          ? "bg-purple-500/10 text-purple-500"
                          : index % 4 === 2
                            ? "bg-orange-500/10 text-orange-500"
                            : "bg-green-500/10 text-green-500"
                    }`}
                  >
                    <BookOpen size={21} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold sm:text-base">
                      {subject.name}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {subject.count > 0
                        ? `${formatNumber(subject.count)} notes`
                        : "Explore resources"}
                    </p>
                  </div>
                </div>

                <ArrowUpRight
                  size={17}
                  className="shrink-0 text-[var(--muted)] transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[var(--primary)]"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* COMMUNITY CTA */}
      <section className="mx-auto w-full max-w-[1600px] px-4 py-20 sm:px-6 lg:px-10 lg:py-24">
        <div className="relative isolate overflow-hidden rounded-[30px] border-2 border-[var(--border)] bg-[var(--panel)] px-6 py-14 text-center shadow-xl sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -left-20 -top-32 h-80 w-80 rounded-full bg-[var(--primary)] opacity-10 blur-[100px]" />
            <div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-blue-500 opacity-[0.08] blur-[110px]" />
          </div>

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <GraduationCap size={29} />
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
            Your next chapter starts here
          </p>

          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Make your learning journey more meaningful.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            Join Edukrate to discover useful resources, share your knowledge
            and become part of a student-focused learning community.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={mainCta}
              className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-[var(--primary)] px-8 text-sm font-black text-white shadow-xl shadow-red-600/20 transition hover:-translate-y-1 hover:opacity-90"
            >
              {mainCtaText}
              <ArrowRight size={18} />
            </Link>

            {!isLoggedIn && (
              <Link
                href="/signin"
                className="inline-flex h-14 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-[var(--card)] px-8 text-sm font-bold transition hover:border-[var(--primary)]/50"
              >
                I already have an account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t-2 border-[var(--border)] bg-[var(--panel)]">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Link href="/landing" className="inline-flex items-center gap-3">
                <div className="relative h-10 w-10">
                  <Image
                    src="/edukratelogo.png"
                    alt="Edukrate"
                    fill
                    sizes="40px"
                    className="object-contain"
                  />
                </div>
                <span className="text-xl font-black">Edukrate</span>
              </Link>

              <p className="mt-4 max-w-sm text-sm leading-7 text-[var(--muted)]">
                A student-focused platform to discover, share and explore
                educational resources.
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-black">Explore</h3>
              <div className="flex flex-col gap-3 text-sm text-[var(--muted)]">
                <Link href="/browse" className="hover:text-[var(--primary)]">
                  Browse Notes
                </Link>
                <Link href="/videos" className="hover:text-[var(--primary)]">
                  Video Library
                </Link>
                <Link href="/notique" className="hover:text-[var(--primary)]">
                  Notique AI
                </Link>
                <Link
                  href="/hall-of-fame"
                  className="hover:text-[var(--primary)]"
                >
                  Hall of Fame
                </Link>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-black">Community</h3>
              <div className="flex flex-col gap-3 text-sm text-[var(--muted)]">
                <Link href="/creators" className="hover:text-[var(--primary)]">
                  Creators
                </Link>
                <Link href="/feedback" className="hover:text-[var(--primary)]">
                  Feedback
                </Link>
                <Link href="/signup" className="hover:text-[var(--primary)]">
                  Join Edukrate
                </Link>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-black">Your account</h3>
              <div className="flex flex-col gap-3 text-sm text-[var(--muted)]">
                <Link href="/signin" className="hover:text-[var(--primary)]">
                  Sign In
                </Link>
                <Link href="/signup" className="hover:text-[var(--primary)]">
                  Create Account
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col justify-between gap-3 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)] sm:flex-row sm:items-center">
            <p>
              © {new Date().getFullYear()} Edukrate. All rights reserved.
            </p>
            <p>Learn. Organize. Grow.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

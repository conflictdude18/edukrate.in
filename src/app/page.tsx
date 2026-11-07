"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import {
  ArrowRight,
  BookOpen,
  Bot,
  Download,
  FileText,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Bookmark,
  MessageSquare,
  Trophy,
  Video,
  Users,
  Flame,
  Moon,
  Sun,
} from "lucide-react";

import { db } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { getVideos } from "@/lib/videos";
import type { Note } from "@/types/note";
import PublicHomePage from "@/components/PublicHomePage";

type HomeNote = Note & {
  id: string;
  title?: string;
  subject?: string;
  class?: string | number;
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

type HomeStats = {
  notes: number;
  videos: number;
  subjects: number;
  downloads: number;
  students: number;
};

const DEFAULT_SUBJECTS = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "JEE",
  "NEET",
];

function getNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getDownloads(note: HomeNote): number {
  return getNumber(note.downloadsCount) || getNumber(note.downloads);
}

function getLikes(note: HomeNote): number {
  return getNumber(note.likesCount) || getNumber(note.likes);
}

function getViews(note: HomeNote): number {
  return getNumber(note.viewsCount) || getNumber(note.views);
}

function getTrendingScore(note: HomeNote): number {
  return getDownloads(note) * 3 + getLikes(note) * 2 + getViews(note);
}

function getCreatedTime(note: HomeNote): number {
  const value = note.createdAt as
    | {
        toDate?: () => Date;
        seconds?: number;
      }
    | string
    | number
    | Date
    | null
    | undefined;

  if (!value) return 0;

  if (typeof value === "object" && value instanceof Date) {
    return value.getTime();
  }

  if (
    typeof value === "object" &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().getTime();
  }

  if (
    typeof value === "object" &&
    typeof value.seconds === "number"
  ) {
    return value.seconds * 1000;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(note: HomeNote): string {
  const time = getCreatedTime(note);

  if (!time) return "Recently added";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(time));
}

function getNoteHref(note: HomeNote, isLoggedIn: boolean): string {
  return isLoggedIn
    ? `/notes/${encodeURIComponent(note.id)}`
    : "/signin";
}

/* Animated number counter */

function AnimatedNumber({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const count = useMotionValue(0);

  const display = useTransform(count, (latest) =>
    formatNumber(Math.round(latest))
  );

  useEffect(() => {
    if (!isInView) return;

    if (reduceMotion) {
      count.set(value);
      return;
    }

    const controls = animate(count, value, {
      duration: 1.5,
      ease: [0.22, 1, 0.36, 1],
    });

    return () => controls.stop();
  }, [isInView, reduceMotion, value, count]);

  return (
    <motion.span ref={ref}>
      {display}
    </motion.span>
  );
}

/* Reusable scroll reveal */

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={
        reduceMotion
          ? false
          : {
              opacity: 0,
              y: 32,
              filter: "blur(7px)",
            }
      }
      whileInView={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
      }}
      viewport={{
        once: true,
        amount: 0.12,
      }}
      transition={{
        duration: reduceMotion ? 0.2 : 0.75,
        delay: reduceMotion ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
            {eyebrow}
          </p>
        )}

        <h2 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
          {title}
        </h2>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            {description}
          </p>
        )}
      </div>

      {href && linkLabel && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
        >
          {linkLabel}
          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-1"
          />
        </Link>
      )}
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center">
      <FileText
        size={30}
        className="mx-auto mb-3 text-[var(--muted)]"
      />
      <p className="mx-auto max-w-md text-sm leading-6 text-[var(--muted)]">
        {text}
      </p>
    </div>
  );
}

/* Note card */

function NoteCard({
  note,
  isLoggedIn,
}: {
  note: HomeNote;
  isLoggedIn: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={
        reduceMotion
          ? undefined
          : {
              y: -7,
              scale: 1.012,
            }
      }
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 22,
      }}
      className="min-w-0"
    >
      <Link
        href={getNoteHref(note, isLoggedIn)}
        className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] transition duration-300 hover:border-[var(--primary)]/50 hover:shadow-xl hover:shadow-red-500/5"
      >
        <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-[var(--card-soft)]">
          {note.thumbnailUrl ? (
            <Image
              src={note.thumbnailUrl}
              alt={note.title || "Study notes"}
              fill
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <FileText
              size={42}
              strokeWidth={1.4}
              className="text-[var(--muted)]"
            />
          )}

          <span className="absolute left-3 top-3 rounded-lg border border-[var(--border)] bg-[var(--panel)]/95 px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] backdrop-blur">
            {note.subject || "Study Notes"}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-2 min-h-12 font-bold leading-6 text-[var(--foreground)]">
            {note.title || "Untitled Note"}
          </h3>

          <p className="mt-2 line-clamp-1 text-sm text-[var(--muted)]">
            {note.board ? `${note.board} · ` : ""}
            {note.class ? `Class ${note.class}` : "Study material"}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
            <span>{formatDate(note)}</span>

            <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--foreground)] transition group-hover:text-[var(--primary)]">
              View notes
              <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();

  const [notes, setNotes] = useState<HomeNote[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [videoCount, setVideoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  /* Theme synchronization */

  useEffect(() => {
    const syncTheme = () => {
      setTheme(
        document.documentElement.dataset.theme === "light"
          ? "light"
          : "dark"
      );
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("themechange", syncTheme);
    window.addEventListener("storage", syncTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener("themechange", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    document.documentElement.dataset.theme = nextTheme;

    try {
      localStorage.setItem("noteswallah-theme", nextTheme);
    } catch {
      // Theme remains active for this page.
    }

    setTheme(nextTheme);
    window.dispatchEvent(new Event("themechange"));
  }

  /* Firebase listeners */

  useEffect(() => {
    const unsubscribeNotes = onSnapshot(
      collection(db, "notes"),
      (snapshot) => {
        const approvedNotes = snapshot.docs
          .map(
            (document) =>
              ({
                ...document.data(),
                id: document.id,
              }) as HomeNote
          )
          .filter((note) => note.status === "approved");

        setNotes(approvedNotes);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load homepage notes:", error);
        setLoading(false);
      }
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setStudentCount(snapshot.size);
      },
      (error) => {
        console.error("Failed to load student count:", error);
      }
    );

    return () => {
      unsubscribeNotes();
      unsubscribeUsers();
    };
  }, []);

  /* Video count */

  useEffect(() => {
    let active = true;

    async function loadVideoCount() {
      try {
        const videos = await getVideos();

        if (active) {
          setVideoCount(videos.length);
        }
      } catch (error) {
        console.error("Failed to load video count:", error);
      } finally {
        if (active) {
          setVideosLoading(false);
        }
      }
    }

    loadVideoCount();

    return () => {
      active = false;
    };
  }, []);

  /* Homepage data */

  const stats = useMemo<HomeStats>(() => {
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
      videos: videoCount,
    };
  }, [notes, studentCount, videoCount]);

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
        .sort((a, b) => getCreatedTime(b) - getCreatedTime(a))
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
      return DEFAULT_SUBJECTS.map((name) => ({
        name,
        count: 0,
      }));
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [notes]);

  const features = [
    {
      icon: BookOpen,
      title: "Notes Library",
      description:
        "Discover notes, study material and revision resources.",
      href: "/browse",
      label: "Explore library",
    },
    {
      icon: Video,
      title: "Video Library",
      description:
        "Explore educational videos and visual learning resources.",
      href: "/videos",
      label: "Watch videos",
    },
    {
      icon: MessageSquare,
      title: "Feedback & Suggestions",
      description:
        "Share your ideas and help improve Edukrate.",
      href: "/feedback",
      label: "Share feedback",
    },
    {
      icon: Bot,
      title: "Notique AI",
      description:
        "Get AI-powered assistance with your learning.",
      href: "/notique",
      label: "Meet Notique",
    },
    {
      icon: Trophy,
      title: "Hall of Fame",
      description:
        "Explore contributors and celebrate the community.",
      href: "/hall-of-fame",
      label: "Meet contributors",
    },
    {
      icon: Users,
      title: "Creators",
      description:
        "Discover creators sharing useful educational content.",
      href: "/creators",
      label: "Discover creators",
    },
    {
      icon: Flame,
      title: "Trending",
      description:
        "See what's popular across the learning community.",
      href: "/trending",
      label: "Explore trending",
    },
    {
      icon: Bookmark,
      title: "Saved Notes",
      description:
        "Keep useful study resources together for later.",
      href: "/saved-notes",
      label: "View saved notes",
    },
    {
      icon: UploadCloud,
      title: "My Notes",
      description:
        "Manage and keep track of your contributions.",
      href: "/my-notes",
      label: "Manage notes",
    },
  ];

  const statItems = [
    {
      label: "Approved notes",
      value: stats.notes,
      icon: FileText,
    },
    {
      label: "Videos in Library",
      value: stats.videos,
      icon: Video,
    },
    {
      label: "Total downloads",
      value: stats.downloads,
      icon: Download,
    },
    {
      label: "Community members",
      value: stats.students,
      icon: Users,
    },
  ];

  const initialAnimation = reduceMotion
    ? false
    : { opacity: 0, y: 24 };

  // Logged-out visitors get the new public homepage.
  if (!user) {
    return <PublicHomePage />;
  }

  return (
    <main className="relative w-full min-w-0 overflow-hidden bg-[var(--background)] text-[var(--foreground)]">

      {/* Premium ambient background */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[700px] overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
            maskImage:
              "linear-gradient(to bottom, black, transparent 85%)",
          }}
        />

        <motion.div
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [0, 35, 0],
                  y: [0, 25, 0],
                  scale: [1, 1.12, 1],
                }
          }
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-32 -top-48 h-[480px] w-[480px] rounded-full bg-red-500/[0.09] blur-[120px]"
        />

        <motion.div
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [0, -25, 0],
                  y: [0, 30, 0],
                  scale: [1, 1.08, 1],
                }
          }
          transition={{
            duration: 19,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -left-40 top-40 h-[380px] w-[380px] rounded-full bg-red-600/[0.06] blur-[110px]"
        />
      </div>

      <div className="relative z-10 w-full min-w-0 pb-16">

        {/* Public navigation */}

        {!user && (
          <motion.header
            initial={initialAnimation}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)]/90 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6"
          >
            <Link
              href="/"
              aria-label="Edukrate home"
              className="group flex min-w-0 items-center gap-3"
            >
              <motion.div
                whileHover={
                  reduceMotion
                    ? undefined
                    : { rotate: -6, scale: 1.08 }
                }
                className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl"
              >
                <Image
                  src="/edukratelogo.png"
                  alt="Edukrate logo"
                  fill
                  sizes="40px"
                  className="object-contain"
                />
              </motion.div>

              <span className="text-lg font-extrabold tracking-tight text-[var(--foreground)] sm:text-xl">
                Edukrate
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              <motion.button
                type="button"
                onClick={toggleTheme}
                whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                aria-label={`Switch to ${
                  theme === "dark" ? "light" : "dark"
                } mode`}
                title={`Switch to ${
                  theme === "dark" ? "light" : "dark"
                } mode`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition hover:bg-[var(--card-soft)]"
              >
                <motion.span
                  key={theme}
                  initial={reduceMotion ? false : { rotate: -35, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  {theme === "dark" ? (
                    <Sun size={19} />
                  ) : (
                    <Moon size={19} />
                  )}
                </motion.span>
              </motion.button>

              <Link
                href="/signin"
                className="rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-[var(--surface-hover)] sm:px-4"
              >
                Sign in
              </Link>

              <motion.div
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              >
                <Link
                  href="/signup"
                  className="rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-bold text-white shadow-lg shadow-red-600/15 transition hover:bg-[var(--primary-hover)] sm:px-5"
                >
                  Get started
                </Link>
              </motion.div>
            </div>
          </motion.header>
        )}

        {/* Hero */}

        <section className="grid items-stretch gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:gap-8">

          <motion.div
            initial={initialAnimation}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.85,
              delay: 0.1,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="group relative flex flex-col justify-center overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm sm:p-9 lg:p-12"
          >
            <motion.div
              aria-hidden="true"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      scale: [1, 1.15, 1],
                      opacity: [0.5, 0.9, 0.5],
                    }
              }
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-red-500/[0.09] blur-[90px]"
            />

            <div className="relative">

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--muted-strong)]"
              >
                <motion.span
                  animate={
                    reduceMotion
                      ? undefined
                      : { rotate: [0, 12, -12, 0] }
                  }
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Sparkles size={15} className="text-[var(--primary)]" />
                </motion.span>

                Your learning space, all in one place
              </motion.div>

              <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                Study smarter with{" "}
                <motion.span
                  className="relative inline-block bg-gradient-to-r from-[var(--primary)] via-rose-400 to-[var(--primary)] bg-clip-text text-transparent"
                  style={{ backgroundSize: "200% 200%" }}
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          backgroundPosition: [
                            "0% 50%",
                            "100% 50%",
                            "0% 50%",
                          ],
                        }
                  }
                  transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  Edukrate

                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: 0.9,
                      delay: 0.75,
                      ease: "easeOut",
                    }}
                    className="absolute -bottom-1 left-0 h-1 w-full origin-left rounded-full bg-[var(--primary)]/30"
                  />
                </motion.span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
                Find study notes, explore learning resources, and prepare
                for your next exam with material shared by your learning
                community.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <motion.div
                  whileHover={reduceMotion ? undefined : { y: -3 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                >
                  <Link
                    href={user ? "/browse" : "/signup"}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-[var(--primary-hover)]"
                  >
                    Explore notes
                    <motion.span
                      animate={
                        reduceMotion ? undefined : { x: [0, 4, 0] }
                      }
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <ArrowRight size={17} />
                    </motion.span>
                  </Link>
                </motion.div>

                <motion.div
                  whileHover={reduceMotion ? undefined : { y: -3 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                >
                  <Link
                    href={user ? "/upload" : "/signin"}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-3.5 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
                  >
                    <UploadCloud size={17} />
                    Share your notes
                  </Link>
                </motion.div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[var(--muted)]">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={17} className="text-[var(--success)]" />
                  Curated study resources
                </span>

                <span className="inline-flex items-center gap-2">
                  <BookOpen size={17} className="text-[var(--primary)]" />
                  Multiple subjects
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right hero cards */}

          <div className="flex flex-col gap-4">

            <Reveal className="flex flex-1">
              <motion.div
                whileHover={reduceMotion ? undefined : { y: -5 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 22,
                }}
                className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8"
              >
                <motion.div
                  aria-hidden="true"
                  animate={
                    reduceMotion
                      ? undefined
                      : { rotate: 360 }
                  }
                  transition={{
                    duration: 40,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-red-500/10"
                />

                <div className="relative">
                  <motion.div
                    animate={
                      reduceMotion
                        ? undefined
                        : { y: [0, -7, 0] }
                    }
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative mb-5 h-12 w-12 overflow-hidden rounded-2xl"
                  >
                    <Image
                      src="/notique-icon.png"
                      alt="Notique AI"
                      fill
                      sizes="48px"
                      className="object-contain"
                    />
                  </motion.div>

                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                    Meet your study assistant
                  </p>

                  <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                    Learn with Notique AI
                  </h2>

                  <p className="mt-3 max-w-md text-sm leading-6 text-[var(--muted)] sm:text-base">
                    Get help understanding topics, exploring concepts,
                    and making your study sessions more productive.
                  </p>
                </div>

                <Link
                  href={user ? "/notique" : "/signin"}
                  className="relative mt-8 inline-flex w-fit items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-sm font-bold transition hover:border-[var(--primary)]/40 hover:bg-[var(--surface-hover)]"
                >
                  Try Notique AI
                  <ArrowRight size={16} />
                </Link>
              </motion.div>
            </Reveal>

            <Reveal delay={0.12}>
              <motion.div
                whileHover={reduceMotion ? undefined : { scale: 1.015 }}
                transition={{ duration: 0.3 }}
                className="relative overflow-hidden rounded-3xl bg-[var(--primary)] p-6 text-white shadow-xl shadow-red-600/15 sm:p-7"
              >
                <motion.div
                  animate={
                    reduceMotion
                      ? undefined
                      : { rotate: 360 }
                  }
                  transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full border border-white/10"
                />

                <div className="pointer-events-none absolute -right-2 -top-4 h-28 w-28 rounded-full border border-white/10" />

                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white/80">
                      Ready to contribute?
                    </p>

                    <h3 className="mt-1 text-xl font-bold">
                      Share what you know.
                    </h3>
                  </div>

                  <UploadCloud size={30} />
                </div>

                <Link
                  href={user ? "/upload" : "/signup"}
                  className="relative mt-5 inline-flex w-fit items-center justify-center gap-2 rounded-xl !bg-white px-5 py-3 text-sm font-bold !text-red-700 transition hover:!bg-red-50"
                >
                  <UploadCloud size={16} />
                  Upload notes
                  <ArrowRight size={16} />
                </Link>
              </motion.div>
            </Reveal>
          </div>
        </section>

        {/* Statistics */}

        <Reveal className="mt-6">
          <section
            aria-label="Edukrate statistics"
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            {statItems.map((stat, index) => {
              const Icon = stat.icon;

              return (
                <motion.div
                  key={stat.label}
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.55,
                    delay: reduceMotion ? 0 : index * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={reduceMotion ? undefined : { y: -5 }}
                  className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-red-500/5 sm:p-5"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-500/[0.06] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex items-center justify-between gap-3">
                    <p className="text-xs font-medium leading-5 text-[var(--muted)] sm:text-sm">
                      {stat.label}
                    </p>

                    <Icon
                      size={19}
                      className="shrink-0 text-[var(--primary)] transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>

                  <p className="relative mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {loading && stat.label !== "Videos in Library" ? (
                      "—"
                    ) : stat.label === "Videos in Library" && videosLoading ? (
                      "—"
                    ) : (
                      <AnimatedNumber value={stat.value} />
                    )}
                  </p>
                </motion.div>
              );
            })}
          </section>
        </Reveal>

        {/* Features */}

        <Reveal className="mt-16">
          <SectionHeading
            eyebrow="The Edukrate ecosystem"
            title="Explore everything in one place"
            description="More than notes. Discover tools, content and people that make learning better."
          />

          <motion.div
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: reduceMotion ? 0 : 0.08,
                },
              },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <motion.div
                  key={feature.title}
                  variants={{
                    hidden: reduceMotion
                      ? {}
                      : { opacity: 0, y: 22 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: 0.55,
                        ease: [0.22, 1, 0.36, 1],
                      },
                    },
                  }}
                  whileHover={reduceMotion ? undefined : { y: -6 }}
                  className="min-w-0"
                >
                  <Link
                    href={user ? feature.href : "/signin"}
                    className="group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition-all duration-500 hover:border-[var(--primary)]/50 hover:bg-[var(--surface-hover)] hover:shadow-2xl hover:shadow-red-500/10 before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-red-500/[0.09] before:via-transparent before:to-transparent before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100 sm:p-6"
                  >
                    <div className="relative z-10 flex items-start justify-between">
                      <motion.div
                        whileHover={
                          reduceMotion
                            ? undefined
                            : { rotate: -6, scale: 1.1 }
                        }
                        transition={{ duration: 0.25 }}
                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--card-soft)] text-[var(--primary)] transition-all duration-300 group-hover:shadow-lg group-hover:shadow-red-500/10"
                      >
                        <Icon size={23} />
                      </motion.div>

                      <ArrowRight
                        size={18}
                        className="text-[var(--muted)] transition duration-300 group-hover:translate-x-1 group-hover:text-[var(--primary)]"
                      />
                    </div>

                    <h3 className="relative z-10 mt-5 text-lg font-bold text-[var(--foreground)]">
                      {feature.title}
                    </h3>

                    <p className="relative z-10 mt-2 flex-1 text-sm leading-6 text-[var(--muted)]">
                      {feature.description}
                    </p>

                    <div className="relative z-10 mt-5 border-t border-[var(--border)] pt-4">
                      <span className="text-sm font-bold text-[var(--foreground)] transition group-hover:text-[var(--primary)]">
                        {feature.label}
                        <span className="ml-2">→</span>
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </Reveal>

        {/* Trending notes */}

        <Reveal className="mt-16">
          <SectionHeading
            eyebrow="Popular resources"
            title="Trending notes"
            description="Study material gaining attention in the Edukrate community."
            href="/browse"
            linkLabel="View all notes"
          />

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]"
                >
                  <div className="aspect-[16/9] animate-pulse bg-[var(--card-soft)]" />

                  <div className="space-y-3 p-4">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--card-soft)]" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--card-soft)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : trendingNotes.length === 0 ? (
            <EmptyBox text="Trending notes will appear here when approved study material is available." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {trendingNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isLoggedIn={Boolean(user)}
                />
              ))}
            </div>
          )}
        </Reveal>

        {/* Latest uploads */}

        <Reveal className="mt-16">
          <SectionHeading
            eyebrow="Freshly added"
            title="Latest uploads"
            description="Recently approved notes to add to your study collection."
            href="/browse"
            linkLabel="Browse library"
          />

          {loading ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-24 rounded-2xl border border-[var(--border)] bg-[var(--card)] animate-pulse"
                />
              ))}
            </div>
          ) : latestNotes.length === 0 ? (
            <EmptyBox text="Latest notes will appear here once students upload approved material." />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {latestNotes.map((note, index) => (
                <motion.div
                  key={note.id}
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, x: -16, filter: "blur(4px)" }
                  }
                  whileInView={{
                    opacity: 1,
                    x: 0,
                    filter: "blur(0px)",
                  }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: reduceMotion ? 0 : (index % 2) * 0.1,
                  }}
                  whileHover={reduceMotion ? undefined : { x: 4 }}
                >
                  <Link
                    href={getNoteHref(note, Boolean(user))}
                    className="group flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:border-[var(--primary)]/40 hover:bg-[var(--surface-hover)] sm:gap-4 sm:p-5"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--card-soft)] text-[var(--primary)] transition-transform duration-300 group-hover:scale-105">
                      <FileText size={22} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-1 font-bold text-[var(--foreground)]">
                        {note.title || "Untitled Note"}
                      </h3>

                      <p className="mt-1 line-clamp-1 text-sm text-[var(--muted)]">
                        {note.subject || "Study material"}
                        {note.class ? ` · Class ${note.class}` : ""}
                      </p>

                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {formatDate(note)}
                      </p>
                    </div>

                    <ArrowRight
                      size={17}
                      className="shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--primary)]"
                    />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </Reveal>

        {/* Subjects */}

        <Reveal className="mt-16">
          <SectionHeading
            eyebrow="Explore by subject"
            title="Find your subject"
            description="Start with a subject and discover relevant study resources."
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {subjectLinks.map((subject, index) => (
              <motion.div
                key={subject.name}
                initial={
                  reduceMotion
                    ? false
                    : { opacity: 0, y: 18 }
                }
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: reduceMotion ? 0 : (index % 4) * 0.07,
                }}
                whileHover={reduceMotion ? undefined : { y: -4 }}
              >
                <Link
                  href={
                    user
                      ? `/browse?subject=${encodeURIComponent(subject.name)}`
                      : "/signin"
                  }
                  className="group flex h-full min-w-0 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:border-[var(--primary)]/40 hover:bg-[var(--surface-hover)] sm:p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--card-soft)] text-[var(--primary)] transition group-hover:scale-105">
                    <GraduationCap size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold">
                      {subject.name}
                    </h3>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {subject.count > 0
                        ? `${formatNumber(subject.count)} ${
                            subject.count === 1
                              ? "resource"
                              : "resources"
                          }`
                        : "Explore resources"}
                    </p>
                  </div>

                  <ArrowRight
                    size={15}
                    className="shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--primary)]"
                  />
                </Link>
              </motion.div>
            ))}
          </div>
        </Reveal>

        {/* Final CTA */}

        <Reveal className="mt-16">
          <motion.section
            whileHover={
              reduceMotion
                ? undefined
                : { borderColor: "var(--primary)" }
            }
            className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm sm:p-9 lg:p-12"
          >
            <motion.div
              animate={
                reduceMotion
                  ? undefined
                  : {
                      scale: [1, 1.15, 1],
                      opacity: [0.5, 0.9, 0.5],
                    }
              }
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-red-500/[0.08] blur-[90px]"
            />

            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
                  <TrendingUp size={18} />
                  Grow together
                </div>

                <h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                  Good notes are better when everyone can learn from them.
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                  Join the community, contribute useful study material,
                  and make learning resources easier to discover.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <motion.div
                  whileHover={reduceMotion ? undefined : { y: -3 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                >
                  <Link
                    href={user ? "/upload" : "/signup"}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/15 transition hover:bg-[var(--primary-hover)]"
                  >
                    Join the community
                    <ArrowRight size={17} />
                  </Link>
                </motion.div>

                <motion.div
                  whileHover={reduceMotion ? undefined : { y: -3 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                >
                  <Link
                    href={user ? "/browse" : "/signin"}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-3.5 text-sm font-bold transition hover:bg-[var(--surface-hover)]"
                  >
                    Explore library
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.section>
        </Reveal>
      </div>
    </main>
  );
}
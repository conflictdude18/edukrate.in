
"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  Check,
  FileText,
  GraduationCap,
  Moon,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  UploadCloud,
  Users,
  Video,
  Zap,
  X,
  Search,
  BrainCircuit,
  Share2,
} from "lucide-react";

/* -------------------------------------------------------
   DATA
------------------------------------------------------- */

const features = [
  {
    icon: FileText,
    title: "Quality Study Notes",
    description:
      "Discover useful study notes, handwritten resources and learning materials shared by students.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    href: "/browse",
    label: "Explore notes",
  },
  {
    icon: Video,
    title: "Educational Videos",
    description:
      "Explore curated educational videos to understand difficult concepts more effectively.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    href: "/videos",
    label: "Watch videos",
  },
  {
    icon: Bot,
    title: "Notique AI",
    description:
      "Meet your AI-powered study companion, designed to make learning more interactive.",
    color: "text-red-500",
    bg: "bg-red-500/10",
    href: "/notique",
    label: "Meet Notique",
  },
  {
    icon: UploadCloud,
    title: "Share Your Knowledge",
    description:
      "Contribute your notes and educational resources to help other students learn.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    href: "/signup",
    label: "Start contributing",
  },
  {
    icon: Trophy,
    title: "Hall of Fame",
    description:
      "Celebrate student contributions and discover the people helping the community grow.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    href: "/hall-of-fame",
    label: "View creators",
  },
  {
    icon: Users,
    title: "Student Community",
    description:
      "Be part of a learning environment built around collaboration and shared knowledge.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    href: "/creators",
    label: "Discover creators",
  },
];

const subjects = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "English",
  "Computer Science",
];

const benefits = [
  {
    icon: BookOpen,
    title: "Learning resources",
    description: "Notes and educational material in one place.",
  },
  {
    icon: BrainCircuit,
    title: "AI-assisted learning",
    description: "Understand concepts with Notique AI.",
  },
  {
    icon: Users,
    title: "Learn together",
    description: "Knowledge becomes more valuable when shared.",
  },
];

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Discover",
    description:
      "Explore study notes, educational videos and resources across different subjects.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    number: "02",
    icon: BrainCircuit,
    title: "Learn",
    description:
      "Build your understanding with learning resources and AI-powered assistance.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    number: "03",
    icon: Share2,
    title: "Contribute",
    description:
      "Share your knowledge, help fellow students and become part of the community.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
];

const reveal = {
  hidden: {
    opacity: 0,
    y: 25,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: "easeOut" as const,
    },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

/* -------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------- */

export default function PublicHomePage() {
  const reduceMotion = useReducedMotion();

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("edukrate-public-theme");

    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    } else {
      const systemDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

      setTheme(systemDark ? "dark" : "light");
    }

    setThemeLoaded(true);
  }, []);

  useEffect(() => {
    if (!themeLoaded) return;

    localStorage.setItem("edukrate-public-theme", theme);
    document.documentElement.dataset.theme = theme;
    window.dispatchEvent(new Event("themechange"));
  }, [theme, themeLoaded]);

  useEffect(() => {
    if (!authPromptOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAuthPromptOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [authPromptOpen]);

  const toggleTheme = () => {
    setTheme((current) =>
      current === "dark" ? "light" : "dark"
    );
  };

  const isDark = theme === "dark";
  const initial = reduceMotion ? false : "hidden";

  const themeStyles = {
    "--background": isDark ? "#09090b" : "#ffffff",
    "--foreground": isDark ? "#f4f4f5" : "#18181b",
    "--card": isDark ? "#18181b" : "#ffffff",
    "--border": isDark ? "#303036" : "#e5e7eb",
    "--muted": isDark ? "#18181b" : "#f4f4f5",
    "--muted-foreground": isDark ? "#a1a1aa" : "#52525b",
  } as CSSProperties;

  return (
    <main
      data-theme={theme}
      style={{
        ...themeStyles,
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
      className="relative min-h-screen overflow-hidden transition-colors duration-500"
      onClickCapture={(event) => {
        const target = event.target;

        if (!(target instanceof Element)) return;

        const anchor = target.closest("a");

        if (!anchor || anchor.hasAttribute("data-auth-bypass")) return;

        const href = anchor.getAttribute("href");

        if (!href || href.startsWith("#")) return;

        event.preventDefault();
        setAuthPromptOpen(true);
      }}
    >
      {/* BACKGROUND ATMOSPHERE */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -top-64 left-1/2 h-[650px] w-[850px] -translate-x-1/2 rounded-full bg-red-500/[0.055] blur-[150px]" />
        <div className="absolute -right-64 top-[1100px] h-[600px] w-[600px] rounded-full bg-orange-500/[0.035] blur-[150px]" />
        <div className="absolute -left-64 top-[2200px] h-[550px] w-[550px] rounded-full bg-red-500/[0.025] blur-[150px]" />
      </div>

      {/* NAVIGATION */}

      <header className="relative z-30 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-2xl">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src={
                isDark
                  ? "/edukratelogowithnamewhite.png"
                  : "/edukratelogowithname.png"
              }
              alt="Edukrate"
              width={280}
              height={80}
              priority
              className="h-12 w-auto object-contain sm:h-16"
            />
          </Link>

          <div className="hidden items-center gap-7 text-sm font-semibold text-[var(--foreground)] md:flex">
            <Link href="/browse" className="transition-colors hover:text-red-500">
              Explore Notes
            </Link>
            <Link href="/videos" className="transition-colors hover:text-red-500">
              Videos
            </Link>
            <Link href="/creators" className="transition-colors hover:text-red-500">
              Creators
            </Link>
            <Link href="/notique" className="transition-colors hover:text-red-500">
              Notique AI
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
              title={`Switch to ${isDark ? "light" : "dark"} mode`}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition duration-300 hover:border-red-500 hover:text-red-500"
            >
              {isDark ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            <Link
              href="/signin"
              className="hidden rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--muted)] sm:block"
            >
              Sign In
            </Link>

            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/15 transition duration-300 hover:-translate-y-0.5 hover:bg-red-700 sm:px-4"
            >
              Get Started
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 px-5 pb-24 pt-20 sm:px-8 md:pt-28 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:pb-32">
        <motion.div
          initial={initial}
          animate="visible"
          variants={stagger}
          className="relative z-10"
        >
          <motion.div
            variants={reveal}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/[0.06] px-4 py-2 text-xs font-bold tracking-wide text-red-500"
          >
            <Sparkles size={14} />
            THE FUTURE OF STUDENT LEARNING
          </motion.div>

          <motion.h1
            variants={reveal}
            className="max-w-3xl text-5xl font-black leading-[1.08] tracking-[-0.045em] text-[var(--foreground)] sm:text-6xl lg:text-[76px]"
          >
            Learn smarter.
            <br />
            Share knowledge.
            <br />
            <span className="bg-gradient-to-r from-red-500 via-red-600 to-orange-500 bg-clip-text text-transparent">
              Grow together.
            </span>
          </motion.h1>

          <motion.p
            variants={reveal}
            className="mt-7 max-w-xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg"
          >
            Your all-in-one student learning platform. Discover
            quality notes, explore educational videos and
            experience AI-powered learning with Edukrate.
          </motion.p>

          <motion.div variants={reveal} className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="group flex items-center gap-3 rounded-xl bg-red-600 px-7 py-4 font-bold text-white shadow-xl shadow-red-600/20 transition duration-300 hover:-translate-y-1 hover:bg-red-700"
            >
              Start Learning
              <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/browse"
              className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-7 py-4 font-bold text-[var(--foreground)] transition duration-300 hover:-translate-y-1 hover:border-red-500/50 hover:bg-red-500/[0.04]"
            >
              <BookOpen size={19} className="text-red-500" />
              Explore Notes
            </Link>
          </motion.div>

          <motion.div variants={reveal} className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-4">
            {["Student-focused", "AI-powered", "Community-driven"].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)]"
              >
                <ShieldCheck size={15} className="text-green-500" />
                {item}
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* PREMIUM LEARNING DASHBOARD */}

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92, x: 35 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-[540px]"
        >
          {/* Ambient background */}

          <div className="absolute inset-8 rounded-full bg-red-500/[0.12] blur-[110px]" />

          {/* Subtle grid texture */}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-8 rounded-[45px] opacity-[0.16]"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, black 20%, transparent 75%)",
            }}
          />

          {/* Main dashboard */}

          <div className="relative overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_35px_100px_-35px_rgba(0,0,0,0.32)] transition-colors duration-500 sm:rounded-[36px] sm:p-7">
            {/* Top accent */}

            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-red-500 via-orange-400 to-red-500" />

            {/* Dashboard header */}

            <div className="flex items-center justify-between border-b border-[var(--border)] pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/15 bg-gradient-to-br from-red-500/15 to-orange-500/10 text-red-500 shadow-sm">
                  <GraduationCap size={25} />
                </div>

                <div>
                  <h3 className="text-xl font-black tracking-tight text-[var(--foreground)]">
                    Welcome to Edukrate
                  </h3>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Your personal learning space
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  READY TO LEARN
                </span>
              </div>
            </div>

            {/* Featured learning card */}

            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.012, y: -2 }}
              transition={{ duration: 0.25 }}
              className="relative mt-6 overflow-hidden rounded-[25px] border border-red-500/15 bg-gradient-to-br from-red-500/[0.10] via-[var(--muted)] to-orange-500/[0.07] p-5 sm:p-6"
            >
              {/* Decorative glow */}

              <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-red-500/[0.12] blur-[55px]" />

              <div className="relative flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-[var(--card)]/80 px-3 py-1.5 text-[10px] font-bold tracking-wide text-red-500">
                  <Sparkles size={12} />
                  YOUR STUDY SPACE
                </span>

                <motion.div
                  animate={reduceMotion ? undefined : { rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500"
                >
                  <BrainCircuit size={21} />
                </motion.div>
              </div>

              <h4 className="relative mt-5 text-2xl font-black leading-tight tracking-tight text-[var(--foreground)] sm:text-[27px]">
                Everything you need
                <br />
                <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  to learn better.
                </span>
              </h4>

              <p className="relative mt-3 max-w-sm text-sm leading-7 text-[var(--muted-foreground)]">
                Discover resources, watch lessons and share
                knowledge with other students.
              </p>

              {/* Mini progress decoration */}

              <div className="relative mt-6 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)]/75 p-3.5 backdrop-blur-xl">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                  <BookOpen size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--foreground)]">
                    Your learning journey
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                    Discover something new today
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                    <motion.div
                      initial={{ width: "15%" }}
                      animate={{ width: "75%" }}
                      transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400"
                    />
                  </div>
                </div>

                <span className="text-[10px] font-bold text-red-500">
                  EXPLORE
                </span>
              </div>
            </motion.div>

            {/* Resource cards */}

            <div className="mt-4 grid grid-cols-2 gap-3">
              {/* Study Notes */}

              <motion.div
                whileHover={reduceMotion ? undefined : { y: -5, scale: 1.02 }}
                transition={{ duration: 0.25 }}
                className="group overflow-hidden rounded-[21px] border border-[var(--border)] bg-[var(--card)] shadow-sm transition-colors duration-500 hover:shadow-xl"
              >
                <div className="relative h-[105px] overflow-hidden bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-indigo-500/15 p-3">
                  <div className="absolute right-3 top-3 h-16 w-12 rotate-6 rounded-md border border-blue-500/20 bg-[var(--card)]/80 shadow-lg" />
                  <div className="absolute right-7 top-5 h-16 w-12 -rotate-6 rounded-md border border-blue-500/20 bg-[var(--card)] p-2 shadow-lg transition-transform duration-300 group-hover:-rotate-12">
                    <div className="h-1 w-6 rounded-full bg-blue-500/70" />
                    <div className="mt-2 h-1 w-full rounded-full bg-[var(--border)]" />
                    <div className="mt-1 h-1 w-4/5 rounded-full bg-[var(--border)]" />
                    <div className="mt-2 h-5 rounded bg-blue-500/10" />
                    <div className="mt-1 h-1 w-full rounded-full bg-[var(--border)]" />
                  </div>

                  <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                    <FileText size={19} />
                  </div>

                  <span className="absolute bottom-3 left-3 rounded-full border border-blue-500/15 bg-[var(--card)]/80 px-2.5 py-1 text-[9px] font-bold text-blue-600 backdrop-blur-md dark:text-blue-400">
                    STUDY MATERIAL
                  </span>
                </div>

                <div className="p-4">
                  <p className="text-sm font-black text-[var(--foreground)]">
                    Study Notes
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                    Explore resources
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-blue-500">
                    Browse notes
                    <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </motion.div>

              {/* Video Library */}

              <motion.div
                whileHover={reduceMotion ? undefined : { y: -5, scale: 1.02 }}
                transition={{ duration: 0.25 }}
                className="group overflow-hidden rounded-[21px] border border-[var(--border)] bg-[var(--card)] shadow-sm transition-colors duration-500 hover:shadow-xl"
              >
                <div className="relative flex h-[105px] items-center justify-center overflow-hidden bg-gradient-to-br from-purple-600/25 via-violet-500/10 to-pink-500/20">
                  <div className="absolute inset-0 opacity-40">
                    <div className="absolute -left-5 top-4 h-20 w-20 rounded-full bg-purple-500/30 blur-2xl" />
                    <div className="absolute -right-5 bottom-0 h-20 w-20 rounded-full bg-pink-500/30 blur-2xl" />
                  </div>

                  <div className="absolute inset-x-3 bottom-3 flex items-center gap-1">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                      <div className="h-full w-[65%] rounded-full bg-white" />
                    </div>
                    <span className="text-[8px] font-bold text-white">04:32</span>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.12 }}
                    className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white shadow-xl backdrop-blur-md"
                  >
                    <PlayCircle size={25} />
                  </motion.div>

                  <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[9px] font-bold text-white backdrop-blur-md">
                    VIDEO LESSON
                  </span>
                </div>

                <div className="p-4">
                  <p className="text-sm font-black text-[var(--foreground)]">
                    Video Library
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                    Learn visually
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-purple-500">
                    Watch videos
                    <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Community strip */}

            <div className="mt-4 flex items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--muted)] p-4 transition-colors duration-500">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <Users size={20} />
              </div>

              <div>
                <p className="text-sm font-bold text-[var(--foreground)]">
                  Learn together
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  Knowledge grows when shared.
                </p>
              </div>

              <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <Check size={17} />
              </div>
            </div>
          </div>

          {/* Floating Study Notes card */}

          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -9, 0] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -left-5 top-24 hidden items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)]/85 p-3.5 shadow-xl backdrop-blur-xl sm:flex"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <FileText size={19} />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">
                Study Notes
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)]">
                Ready to explore
              </p>
            </div>
          </motion.div>

          {/* Floating Learn Smarter badge */}

          <motion.div
            animate={reduceMotion ? undefined : { y: [0, 9, 0] }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -right-3 bottom-20 hidden items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--card)]/85 p-3.5 shadow-xl backdrop-blur-xl sm:flex"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Zap size={19} />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">
                Learn smarter
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)]">
                Your way, your pace
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* PLATFORM BENEFITS */}

      <section className="relative z-10 border-y border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto grid max-w-7xl gap-0 px-5 py-5 sm:grid-cols-3 sm:px-8 lg:px-12">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;

            return (
              <motion.div
                key={benefit.title}
                initial={initial}
                whileInView="visible"
                viewport={{ once: true, amount: 0.4 }}
                variants={reveal}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 border-b border-[var(--border)] px-3 py-6 last:border-0 sm:border-b-0 sm:border-r sm:px-6 sm:last:border-r-0"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                  <Icon size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--foreground)]">
                    {benefit.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* FEATURES */}

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
        <SectionHeading
          eyebrow="THE EDUKRATE EXPERIENCE"
          title="Everything you need."
          accent="All in one place."
          description="Explore tools and resources designed to make your learning experience more organized, interactive and collaborative."
          initial={initial}
        />

        <motion.div
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={stagger}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                variants={reveal}
                whileHover={reduceMotion ? undefined : { y: -7 }}
                className="group relative h-full"
              >
                <Link
                  href={feature.href}
                  className="flex h-full flex-col rounded-[26px] border border-[var(--border)] bg-[var(--card)] p-7 transition-all duration-300 hover:border-red-500/40 hover:shadow-[0_20px_55px_-25px_rgba(220,38,38,0.22)]"
                >
                  <div className="flex items-start justify-between">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${feature.bg} ${feature.color} transition-transform duration-300 group-hover:scale-110`}>
                      <Icon size={26} />
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] transition-all duration-300 group-hover:border-red-500/30 group-hover:bg-red-500/10 group-hover:text-red-500">
                      <ArrowUpRight size={17} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>

                  <h3 className="mt-7 text-xl font-black tracking-tight text-[var(--foreground)]">
                    {feature.title}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-7 text-[var(--muted-foreground)]">
                    {feature.description}
                  </p>

                  <div className="mt-7 flex items-center gap-2 text-sm font-bold text-red-500">
                    {feature.label}
                    <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* NOTIQUE AI SHOWCASE */}

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
        <motion.div
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={reveal}
          className="relative overflow-hidden rounded-[32px] border border-red-500/20 bg-gradient-to-br from-[#a80016] via-[#650b19] to-[#100d12] p-7 shadow-[0_30px_90px_-35px_rgba(150,0,20,0.55)] sm:rounded-[38px] sm:p-12 lg:p-14"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-24 -top-32 h-[450px] w-[450px] rounded-full bg-red-400/20 blur-[120px]" />
            <div className="absolute -bottom-48 left-1/4 h-[400px] w-[400px] rounded-full bg-orange-500/[0.12] blur-[120px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/20" />
          </div>

          <div className="relative grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.09] px-4 py-2 text-xs font-bold tracking-wide text-white backdrop-blur-xl">
                <Sparkles size={14} />
                INTRODUCING NOTIQUE AI
              </div>

              <div className="mt-7 flex items-center gap-4">
                <div className="flex h-[66px] w-[66px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/[0.12] p-2 shadow-xl">
                  <Image
                    src="/notique-icon.png"
                    alt="Notique AI"
                    width={64}
                    height={64}
                    className="h-full w-full object-contain"
                  />
                </div>

                <div>
                  <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                    Notique AI
                  </h2>
                  <p className="mt-1 text-sm text-red-100/80">
                    Your intelligent study companion
                  </p>
                </div>
              </div>

              <p className="mt-7 max-w-lg text-base leading-8 text-white/85">
                Make learning more interactive. Ask questions,
                explore concepts and get help understanding
                your study material with your AI-powered
                learning companion.
              </p>

              <div className="mt-7 flex flex-col gap-3">
                {[
                  "Understand difficult concepts",
                  "Get help with your study material",
                  "Make learning more interactive",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm font-medium text-white/90">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-white">
                      <Check size={12} />
                    </div>
                    {item}
                  </div>
                ))}
              </div>

            <Link
            href="/notique"
            className="group mt-9 inline-flex items-center gap-3 rounded-xl bg-white px-7 py-4 font-bold shadow-xl transition duration-300 hover:-translate-y-1 hover:bg-red-50"
            style={{
                backgroundColor: "#ffffff",
                color: "#7f1d1d",
            }}
            >
            <span style={{ color: "#7f1d1d" }}>
                Explore Notique AI
            </span>

            <ArrowUpRight
                size={19}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                style={{ color: "#7f1d1d" }}
            />
            </Link>
            </div>

            {/* Chat preview */}

            <div className="relative mx-auto w-full max-w-[490px]">
              <div className="absolute inset-10 rounded-full bg-red-300/20 blur-[100px]" />

              <div className="relative rounded-[28px] border border-white/25 bg-white/[0.13] p-5 shadow-2xl backdrop-blur-2xl sm:rounded-[32px] sm:p-6">
                <div className="flex items-center justify-between border-b border-white/25 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10 p-1.5">
                      <Image
                        src="/notique-icon.png"
                        alt="Notique"
                        width={44}
                        height={44}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div>
                      <p className="font-bold text-white">Notique</p>
                      <p className="text-xs font-semibold text-white">
                      AI Study Assistant
                      </p>
                    </div>
                  </div>

                  <span className="flex items-center gap-1.5 text-xs font-medium text-green-300">
                    <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.7)]" />
                    Online
                  </span>
                </div>

                <div className="space-y-5 py-6">
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, x: 15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm border border-white/30 bg-white/[0.20] p-4 shadow-lg backdrop-blur-xl"
                  >
                    <p className="text-[10px] font-bold tracking-wider text-white/75">
                      YOU
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white">
                      Can you help me understand a difficult topic?
                    </p>
                  </motion.div>

                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, x: -15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7, duration: 0.6 }}
                    className="max-w-[94%] rounded-2xl rounded-tl-sm border border-white/30 bg-white/[0.16] p-4 shadow-lg backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-white/90">
                      <Sparkles size={13} />
                      NOTIQUE AI
                    </div>

                    <p className="mt-3 text-sm leading-6 text-white">
                      Absolutely! Let's break it down into
                      simple concepts and understand it
                      step by step.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/30 bg-white/[0.13] px-3 py-1.5 text-[10px] font-semibold text-white">
                        Simple explanations
                      </span>
                      <span className="rounded-full border border-white/30 bg-white/[0.13] px-3 py-1.5 text-[10px] font-semibold text-white">
                        Study assistance
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.2 }}
                    className="flex items-center gap-2 pl-2"
                  >
                    <span className="text-[10px] font-bold tracking-wide text-white">
                      NOTIQUE IS READY TO HELP
                    </span>

                    {!reduceMotion && (
                      <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                        className="flex gap-1"
                      >
                        <span className="h-1 w-1 rounded-full bg-white" />
                        <span className="h-1 w-1 rounded-full bg-white" />
                        <span className="h-1 w-1 rounded-full bg-white" />
                      </motion.div>
                    )}
                  </motion.div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-white/30 bg-white/[0.17] px-4 py-3.5 backdrop-blur-xl">
                  <span className="flex-1 text-sm font-medium text-white/85">
                    Ask Notique anything...
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-red-700">
                    <ArrowRight size={17} />
                  </div>
                </div>

                <p className="mt-4 text-center text-[10px] font-bold tracking-[0.15em] text-white/90">
                  YOUR AI-POWERED LEARNING EXPERIENCE
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* HOW IT WORKS */}

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
        <SectionHeading
          eyebrow="SIMPLE BY DESIGN"
          title="A better way to"
          accent="learn and grow."
          description="Everything is designed to make discovering, understanding and sharing knowledge straightforward."
          initial={initial}
        />

        <div className="relative mt-16 grid gap-6 md:grid-cols-3">
          <div
            aria-hidden="true"
            className="absolute left-[16.66%] right-[16.66%] top-10 hidden h-px bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-emerald-500/30 md:block"
          />

          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.div
                key={step.number}
                initial={initial}
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={reveal}
                transition={{ delay: index * 0.15 }}
                whileHover={reduceMotion ? undefined : { y: -6 }}
                className="relative rounded-[26px] border border-[var(--border)] bg-[var(--card)] p-7 transition-shadow duration-300 hover:shadow-xl"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div className={`flex h-[60px] w-[60px] items-center justify-center rounded-2xl ${step.bg} ${step.color}`}>
                    <Icon size={27} />
                  </div>
                  <span className="text-3xl font-black tracking-tight text-[var(--border)]">
                    {step.number}
                  </span>
                </div>

                <h3 className="mt-8 text-xl font-black text-[var(--foreground)]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* SUBJECTS */}

      <section className="relative z-10 border-y border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
          <SectionHeading
            eyebrow="EXPLORE & DISCOVER"
            title="Find resources for"
            accent="your subjects."
            description="Explore learning materials across different subjects and discover resources that support your learning journey."
            initial={initial}
          />

          <motion.div
            initial={initial}
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            className="mt-12 flex flex-wrap justify-center gap-3"
          >
            {subjects.map((subject) => (
              <motion.div
                key={subject}
                variants={reveal}
                whileHover={reduceMotion ? undefined : { y: -4, scale: 1.02 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              >
                <Link
                  href={`/browse?subject=${encodeURIComponent(subject)}`}
                  className="group inline-flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-5 py-4 text-sm font-bold text-[var(--foreground)] transition-all duration-300 hover:border-red-500/40 hover:bg-red-500/[0.04] hover:text-red-500 hover:shadow-lg"
                >
                  <BookOpen size={17} className="text-red-500" />
                  {subject}
                  <ArrowUpRight size={15} className="text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-red-500" />
                </Link>
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-10 text-center">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 text-sm font-bold text-red-500 transition hover:gap-3"
            >
              Explore all resources
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}

      <section className="relative z-10 px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
        <motion.div
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={reveal}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-red-500/20 bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-red-500/[0.08] px-6 py-16 text-center shadow-[0_25px_80px_-45px_rgba(220,38,38,0.3)] sm:rounded-[38px] sm:px-12 sm:py-20"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-red-500/[0.09] blur-[100px]"
          />

          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
              <GraduationCap size={32} />
            </div>

            <span className="mt-7 inline-block text-xs font-black tracking-[0.2em] text-red-500">
              YOUR NEXT CHAPTER STARTS HERE
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-5xl">
              Your learning journey
              <br />
              <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                starts here.
              </span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
              Join Edukrate and discover a better way to
              explore, understand and share knowledge.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-3 rounded-xl bg-red-600 px-8 py-4 font-bold text-white shadow-lg shadow-red-600/20 transition duration-300 hover:-translate-y-1 hover:bg-red-700"
              >
                Create Your Account
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/signin"
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-8 py-4 font-bold text-[var(--foreground)] transition duration-300 hover:-translate-y-1 hover:border-red-500/50 hover:text-red-500"
              >
                Sign In
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* AUTHENTICATION POPUP */}

      {authPromptOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-5 backdrop-blur-md"
          onClick={() => setAuthPromptOpen(false)}
          role="presentation"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-popup-title"
            className="relative w-full max-w-md rounded-[30px] border border-[var(--border)] bg-[var(--card)] p-7 text-center shadow-2xl sm:p-9"
          >
            <button
              type="button"
              onClick={() => setAuthPromptOpen(false)}
              aria-label="Close popup"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-red-500"
            >
              <X size={19} />
            </button>

            <div className="mt-2 flex items-center justify-center">
              <Image
                src={
                  isDark
                    ? "/edukratelogowithnamewhite.png"
                    : "/edukratelogowithname.png"
                }
                alt="Edukrate"
                width={220}
                height={65}
                className="h-14 w-auto object-contain"
              />
            </div>

            <div className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
              <GraduationCap size={25} />
            </div>

            <h2
              id="auth-popup-title"
              className="mt-5 text-2xl font-black text-[var(--foreground)]"
            >
              Join Edukrate!
            </h2>

            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
              Sign in or create your free account to explore
              the Edukrate learning experience.
            </p>

            <div className="mt-7 flex flex-col gap-3">
              <Link
                href="/signup"
                data-auth-bypass
                className="rounded-xl bg-red-600 px-6 py-3.5 font-bold text-white transition hover:bg-red-700"
              >
                Create Account
              </Link>

              <Link
                href="/signin"
                data-auth-bypass
                className="rounded-xl border border-[var(--border)] px-6 py-3.5 font-bold text-[var(--foreground)] transition hover:border-red-500 hover:text-red-500"
              >
                Sign In
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setAuthPromptOpen(false)}
              className="mt-5 text-sm font-medium text-[var(--muted-foreground)] transition hover:text-red-500"
            >
              Maybe later
            </button>
          </motion.div>
        </div>
      )}
    </main>
  );
}

/* -------------------------------------------------------
   REUSABLE SECTION HEADING
------------------------------------------------------- */

function SectionHeading({
  eyebrow,
  title,
  accent,
  description,
  initial,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  initial: false | "hidden";
}) {
  return (
    <motion.div
      initial={initial}
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      variants={reveal}
      className="mx-auto max-w-2xl text-center"
    >
      <span className="text-xs font-black tracking-[0.2em] text-red-500">
        {eyebrow}
      </span>

      <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-[var(--foreground)] sm:text-5xl">
        {title}
        <br className="hidden sm:block" />
        <span className="text-red-500"> {accent}</span>
      </h2>

      <p className="mt-5 text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
        {description}
      </p>
    </motion.div>
  );
}

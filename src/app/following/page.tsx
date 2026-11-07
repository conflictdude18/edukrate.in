
"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  Users,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { db } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Note } from "@/types/note";

export default function FollowingFeedPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    async function fetchFollowingNotes() {
      if (loading) return;

      if (!user) {
        router.push("/signin");
        return;
      }

      setPageLoading(true);

      try {
        const followsQuery = query(
          collection(db, "follows"),
          where("followerId", "==", user.uid)
        );

        const followsSnap = await getDocs(followsQuery);

        const followingIds = followsSnap.docs
          .map((followDoc) => followDoc.data().followingId)
          .filter((id): id is string => typeof id === "string");

        if (followingIds.length === 0) {
          setNotes([]);
          return;
        }

        const allNotes: Note[] = [];

        for (const followingId of followingIds) {
          const notesQuery = query(
            collection(db, "notes"),
            where("uploaderId", "==", followingId),
            where("status", "==", "approved")
          );

          const notesSnap = await getDocs(notesQuery);

          notesSnap.docs.forEach((noteDoc) => {
            allNotes.push({
              id: noteDoc.id,
              ...(noteDoc.data() as Omit<Note, "id">),
            });
          });
        }

        allNotes.sort((a, b) => {
          const dateA = new Date(String(a.uploadDate || "")).getTime();
          const dateB = new Date(String(b.uploadDate || "")).getTime();

          return dateB - dateA;
        });

        setNotes(allNotes);
      } catch (err) {
        console.error("FOLLOWING FEED ERROR:", err);
        toast.error("Failed to load following feed.");
      } finally {
        setPageLoading(false);
      }
    }

    fetchFollowingNotes();
  }, [user, loading, router]);

  if (loading || pageLoading) {
    return (
      <main
        className="flex min-h-[75vh] w-full items-center justify-center px-4"
        style={{
          background: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        <div className="text-center">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border"
            style={{
              borderColor: "var(--border)",
              background: "var(--card)",
            }}
          >
            <RefreshCw className="animate-spin text-red-500" size={30} />
          </div>
          <h1 className="mt-5 text-xl font-black">
            Loading following feed
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Finding the latest notes from people you follow...
          </p>
        </div>
      </main>
    );
  }

  const contributorCount = new Set(
    notes.map((note) => note.uploaderId).filter(Boolean)
  ).size;

  return (
    <main
      className="w-full min-w-0 space-y-7 overflow-x-hidden px-1 py-5 pb-28 sm:px-2 lg:px-3 md:pb-10"
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border p-5 sm:p-7 lg:p-9"
        style={{
          borderColor: "var(--border)",
          background:
            "linear-gradient(125deg, color-mix(in srgb, var(--primary) 10%, var(--panel)), var(--panel) 65%, var(--card))",
        }}
      >
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-red-600/10 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-red-500/[0.07] blur-[90px]" />

        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3.5 py-2 text-xs font-black text-red-500">
              <Users size={15} />
              YOUR COMMUNITY
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Following <span className="text-red-500">Feed</span>
            </h1>

            <p
              className="mt-3 max-w-2xl text-sm leading-7 sm:text-base"
              style={{ color: "var(--muted)" }}
            >
              Your personalized space for the latest approved notes uploaded
              by contributors you follow.
            </p>

            <div
              className="mt-6 flex flex-wrap items-center gap-3 text-xs font-bold"
              style={{ color: "var(--muted)" }}
            >
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Approved uploads
              </span>
              <span className="h-1 w-1 rounded-full bg-current opacity-40" />
              <span>Personalized learning feed</span>
            </div>
          </div>

          <Link
            href="/browse"
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-red-950/20 transition hover:-translate-y-0.5 hover:bg-red-500 sm:w-fit"
          >
            <Search size={18} />
            Discover Contributors
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Stats */}
        <div className="relative mt-8 grid grid-cols-2 gap-3 sm:max-w-lg">
          <StatCard
            label="Notes in Feed"
            value={notes.length}
            icon={<FileText size={18} />}
          />
          <StatCard
            label="Contributors"
            value={contributorCount}
            icon={<Users size={18} />}
          />
        </div>
      </section>

      {/* Feed heading */}
      <section
        className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-red-500" />
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-500">
              Your Latest Updates
            </p>
          </div>

          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Notes from your network
          </h2>

          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Explore the latest uploads from people you follow.
          </p>
        </div>

        <span
          className="w-fit rounded-full border px-3.5 py-2 text-xs font-bold"
          style={{
            borderColor: "var(--border)",
            background: "var(--card)",
            color: "var(--muted-strong)",
          }}
        >
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </span>
      </section>

      {/* Empty state */}
      {notes.length === 0 ? (
        <section
          className="flex min-h-[360px] flex-col items-center justify-center rounded-[2rem] border border-dashed px-5 py-12 text-center sm:min-h-[420px]"
          style={{
            borderColor: "var(--border)",
            background: "var(--card)",
          }}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-[1.7rem] border border-red-500/20 bg-red-500/10 text-red-500">
            <BookOpen size={36} />
          </div>

          <h2 className="mt-7 text-2xl font-black sm:text-3xl">
            Your feed is waiting
          </h2>

          <p
            className="mx-auto mt-3 max-w-md text-sm leading-7"
            style={{ color: "var(--muted)" }}
          >
            You don't have any notes from followed contributors yet. Discover
            people who share useful study material and their approved uploads
            will appear here.
          </p>

          <Link
            href="/browse"
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-3.5 text-sm font-black text-white transition hover:bg-red-500"
          >
            <Users size={17} />
            Find Contributors
            <ArrowRight size={16} />
          </Link>
        </section>
      ) : (
        /* Notes grid */
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {notes.map((note) => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              className="group flex min-w-0 flex-col overflow-hidden rounded-[1.6rem] border transition duration-300 hover:-translate-y-1 hover:border-red-500/40 hover:shadow-xl"
              style={{
                borderColor: "var(--border)",
                background: "var(--card)",
              }}
            >
              {/* Thumbnail */}
              <div
                className="relative h-52 overflow-hidden sm:h-56 lg:h-60"
                style={{ background: "var(--card-soft)" }}
              >
                {note.thumbnailUrl ? (
                  <img
                    src={note.thumbnailUrl}
                    alt={note.title || "Note thumbnail"}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, color-mix(in srgb, var(--primary) 15%, var(--card-soft)), var(--card-soft))",
                    }}
                  >
                    <FileText size={55} className="text-red-500/70" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-black/65 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Approved
                </span>

                <span className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition group-hover:border-red-500 group-hover:bg-red-600">
                  <ArrowRight size={17} />
                </span>
              </div>

              {/* Card content */}
              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <h3
                  className="line-clamp-2 text-lg font-black leading-snug transition group-hover:text-red-500 sm:text-xl"
                  style={{ color: "var(--foreground)" }}
                >
                  {note.title || "Untitled Note"}
                </h3>

                <div className="mt-4 flex flex-wrap gap-2">
                  <MiniTag>{note.subject || "Subject not set"}</MiniTag>
                  <MiniTag>Class {note.class || "N/A"}</MiniTag>
                  {note.topic && <MiniTag>{note.topic}</MiniTag>}
                </div>

                <div
                  className="mt-auto mt-5 flex items-center justify-between gap-3 border-t pt-4"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="min-w-0">
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--muted)" }}
                    >
                      Uploaded by
                    </p>
                    <p
                      className="mt-1 truncate text-xs font-bold"
                      style={{ color: "var(--muted-strong)" }}
                    >
                      {note.uploaderName || "Edukrate User"}
                    </p>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-[11px] font-black text-white transition group-hover:bg-red-500">
                    Open Note
                    <ExternalLink size={12} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
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
    <div
      className="rounded-2xl border p-4 sm:p-5"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--background) 35%, var(--card))",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-2xl font-black tabular-nums sm:text-3xl">
          {value}
        </p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-500">
          {icon}
        </span>
      </div>
      <p
        className="mt-2 text-[11px] font-bold sm:text-xs"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </p>
    </div>
  );
}

function MiniTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="max-w-full truncate rounded-full border px-3 py-1.5 text-[10px] font-bold"
      style={{
        borderColor: "var(--border)",
        background: "var(--card-soft)",
        color: "var(--muted-strong)",
      }}
    >
      {children}
    </span>
  );
}

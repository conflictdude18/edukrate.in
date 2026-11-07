
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  documentId,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  ArrowRight,
  RefreshCw,
  Search,
  Sparkles,
  UserPlus,
  Users,
  X,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

import { db } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";

type FollowDoc = {
  id: string;
  followerId: string;
  followingId: string;
};

type UserDoc = {
  id: string;
  name?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  avatarUrl?: string;
  occupation?: string;
};

export default function FollowersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [followers, setFollowers] = useState<UserDoc[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchFollowers() {
      if (!user) return;

      setFetching(true);

      try {
        const followsQuery = query(
          collection(db, "follows"),
          where("followingId", "==", user.uid)
        );

        const followsSnap = await getDocs(followsQuery);

        const followsData: FollowDoc[] = followsSnap.docs.map((document) => ({
          id: document.id,
          ...(document.data() as Omit<FollowDoc, "id">),
        }));

        const followerIds = [
          ...new Set(followsData.map((follow) => follow.followerId)),
        ];

        if (followerIds.length === 0) {
          setFollowers([]);
          return;
        }

        const followerChunks = chunkArray(followerIds, 10);
        const allFollowers: UserDoc[] = [];

        for (const chunk of followerChunks) {
          const usersQuery = query(
            collection(db, "users"),
            where(documentId(), "in", chunk)
          );

          const usersSnap = await getDocs(usersQuery);

          const usersData: UserDoc[] = usersSnap.docs.map((document) => ({
            id: document.id,
            ...(document.data() as Omit<UserDoc, "id">),
          }));

          allFollowers.push(...usersData);
        }

        setFollowers(allFollowers);
      } catch (err) {
        console.error("FOLLOWERS ERROR:", err);
        toast.error("Failed to load followers.");
      } finally {
        setFetching(false);
      }
    }

    fetchFollowers();
  }, [user]);

  const filteredFollowers = useMemo(() => {
    const term = search.toLowerCase().trim();

    return followers.filter((person) => {
      const displayName = getDisplayName(person);
      const value = `${displayName} ${person.email || ""} ${
        person.occupation || ""
      }`;

      return value.toLowerCase().includes(term);
    });
  }, [followers, search]);

  if (loading || fetching) {
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

          <h1 className="mt-5 text-xl font-black">Loading followers</h1>

          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Checking your student network...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="w-full min-w-0 space-y-7 overflow-x-hidden px-1 py-5 pb-28 sm:px-2 lg:px-3 md:pb-10"
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-[2rem] border p-5 sm:p-7 lg:p-9"
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
              Your <span className="text-red-500">Followers</span>
            </h1>

            <p
              className="mt-3 max-w-2xl text-sm leading-7 sm:text-base"
              style={{ color: "var(--muted)" }}
            >
              Meet the students who follow your profile and keep up with your
              notes, uploads, and study material.
            </p>

            <div
              className="mt-6 flex flex-wrap items-center gap-3 text-xs font-bold"
              style={{ color: "var(--muted)" }}
            >
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Your student network
              </span>
              <span className="h-1 w-1 rounded-full bg-current opacity-40" />
              <span>Growing together</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
            <StatCard
              label="Total Followers"
              value={followers.length}
              icon={<Users size={18} />}
            />
            <StatCard
              label="Search Results"
              value={filteredFollowers.length}
              icon={<Search size={18} />}
            />
          </div>
        </div>
      </section>

      {/* Search and section heading */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={17} className="text-red-500" />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-500">
                Student Network
              </p>
            </div>

            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              People following you
            </h2>

            <p
              className="mt-1 text-sm"
              style={{ color: "var(--muted)" }}
            >
              View the profiles of students in your community.
            </p>
          </div>

          {followers.length > 0 && (
            <span
              className="w-fit rounded-full border px-3.5 py-2 text-xs font-bold"
              style={{
                borderColor: "var(--border)",
                background: "var(--card)",
                color: "var(--muted-strong)",
              }}
            >
              {filteredFollowers.length} of {followers.length} followers
            </span>
          )}
        </div>

        {followers.length > 0 && (
          <div
            className="rounded-2xl border p-2"
            style={{
              borderColor: "var(--border)",
              background: "var(--card)",
            }}
          >
            <div
              className="flex items-center gap-3 rounded-xl border px-4 py-3.5"
              style={{
                borderColor: "var(--border)",
                background: "var(--input-background)",
              }}
            >
              <Search
                size={19}
                className="shrink-0"
                style={{ color: "var(--muted)" }}
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, or occupation..."
                className="w-full min-w-0 bg-transparent text-sm font-semibold outline-none placeholder:opacity-50"
                style={{ color: "var(--foreground)" }}
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="shrink-0 rounded-full p-1.5 transition hover:bg-red-500/15 hover:text-red-500"
                  style={{ color: "var(--muted)" }}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Empty states */}
      {followers.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={38} />}
          title="No followers yet"
          text="Upload helpful notes and complete your profile so students can discover and follow you."
          href="/upload"
          buttonText="Upload Notes"
        />
      ) : filteredFollowers.length === 0 ? (
        <EmptyState
          icon={<Search size={36} />}
          title="No matching followers"
          text="We couldn't find anyone matching your search. Try another name, email, or occupation."
        />
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredFollowers.map((person) => {
            const displayName = getDisplayName(person);
            const photoURL = person.photoURL || person.avatarUrl || "";

            return (
              <Link
                key={person.id}
                href={`/profile/${person.id}`}
                className="group relative flex min-w-0 flex-col overflow-hidden rounded-[1.7rem] border p-5 transition duration-300 hover:-translate-y-1 hover:border-red-500/40 hover:shadow-xl sm:p-6"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--card)",
                }}
              >
                <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-red-500/[0.06] blur-3xl transition group-hover:bg-red-500/[0.12]" />

                <div className="relative flex items-center gap-4">
                  {photoURL ? (
                    <div
                      className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-[1.4rem] border"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--card-soft)",
                      }}
                    >
                      <Image
                        src={photoURL}
                        alt={displayName}
                        fill
                        sizes="76px"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[1.4rem] border border-red-500/20 bg-gradient-to-br from-red-500/20 to-red-950/30 text-2xl font-black text-red-500">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3
                      className="truncate text-lg font-black transition group-hover:text-red-500 sm:text-xl"
                      style={{ color: "var(--foreground)" }}
                    >
                      {displayName}
                    </h3>

                    <p
                      className="mt-1 truncate text-sm font-semibold"
                      style={{ color: "var(--muted)" }}
                    >
                      {person.occupation || "Student"}
                    </p>

                    <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <GraduationCap size={13} />
                      Community member
                    </div>
                  </div>
                </div>

                <div
                  className="relative mt-6 flex items-center justify-between gap-3 border-t pt-4"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-red-500">
                    <Users size={13} />
                    Follower
                  </span>

                  <span className="inline-flex items-center gap-1.5 text-xs font-black transition group-hover:text-red-500"
                    style={{ color: "var(--muted)" }}
                  >
                    View Profile
                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </span>
                </div>
              </Link>
            );
          })}
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

function EmptyState({
  icon,
  title,
  text,
  href,
  buttonText,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href?: string;
  buttonText?: string;
}) {
  return (
    <section
      className="flex min-h-[360px] flex-col items-center justify-center rounded-[2rem] border border-dashed px-5 py-12 text-center sm:min-h-[420px]"
      style={{
        borderColor: "var(--border)",
        background: "var(--card)",
      }}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-[1.7rem] border border-red-500/20 bg-red-500/10 text-red-500">
        {icon}
      </div>

      <h2 className="mt-7 text-2xl font-black sm:text-3xl">{title}</h2>

      <p
        className="mx-auto mt-3 max-w-md text-sm leading-7"
        style={{ color: "var(--muted)" }}
      >
        {text}
      </p>

      {href && buttonText && (
        <Link
          href={href}
          className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-3.5 text-sm font-black text-white transition hover:bg-red-500"
        >
          <Sparkles size={17} />
          {buttonText}
          <ArrowRight size={16} />
        </Link>
      )}
    </section>
  );
}

function getDisplayName(person: UserDoc) {
  return person.displayName || person.name || "Edukrate User";
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

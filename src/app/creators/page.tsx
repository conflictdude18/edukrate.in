
"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import {
  BadgeCheck,
  Download,
  FileText,
  Flame,
  Medal,
  RefreshCw,
  Search,
  Sparkles,
  Trophy,
  Users,
  X,
  Crown,
  Eye,
  ArrowUpRight,
  TrendingUp,
  SlidersHorizontal,
  Award,
} from "lucide-react";

import { db } from "@/firebase/firebase";
import UserAvatar from "@/components/UserAvatar";
import type {
  CreatorBadge,
  CreatorLevel,
} from "@/types/creator";

type Creator = {
  userId: string;
  displayName: string;
  photoURL?: string;
  uploads: number;
  approvedUploads: number;
  totalDownloads: number;
  totalLikes: number;
  totalViews: number;
  uploadStreak: number;
  bestUploadStreak: number;
  profileCompletion: number;
  badges: CreatorBadge[];
  creatorLevel?: CreatorLevel;
  reputation: number;
  monthlyReputation: number;
  weeklyReputation: number;
  verifiedCreator?: boolean;
};

type SortMode = "overall" | "uploads" | "downloads" | "streak";

const numberFormat = (value: number) =>
  new Intl.NumberFormat("en-IN").format(value);

function getScore(creator: Creator) {
  return creator.reputation || 0;
}

function getLevel(creator: Creator) {
  return creator.creatorLevel?.level || 1;
}

function getLevelTitle(creator: Creator) {
  return creator.creatorLevel?.title || "Starter";
}

function getRankLabel(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `#${index + 1}`;
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("overall");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchCreators() {
      try {
        setError(false);

        const creatorStatsQuery = query(
          collection(db, "creatorStats"),
          orderBy("reputation", "desc")
        );

        const snap = await getDocs(creatorStatsQuery);

        const data: Creator[] = snap.docs.map((docSnap) => {
          const raw = docSnap.data();

          return {
            userId: raw.userId || docSnap.id,
            displayName: raw.displayName || "NotesWallah Creator",
            photoURL: raw.photoURL || "",
            uploads: Number(raw.uploads || 0),
            approvedUploads: Number(raw.approvedUploads || 0),
            totalDownloads: Number(raw.totalDownloads || 0),
            totalLikes: Number(raw.totalLikes || 0),
            totalViews: Number(raw.totalViews || 0),
            uploadStreak: Number(raw.uploadStreak || 0),
            bestUploadStreak: Number(raw.bestUploadStreak || 0),
            profileCompletion: Number(raw.profileCompletion || 0),
            reputation: Number(raw.reputation || 0),
            monthlyReputation: Number(raw.monthlyReputation || 0),
            weeklyReputation: Number(raw.weeklyReputation || 0),
            verifiedCreator: Boolean(raw.verifiedCreator),
            badges: Array.isArray(raw.badges) ? raw.badges : [],
            creatorLevel: raw.creatorLevel || undefined,
          };
        });

        if (active) setCreators(data);
      } catch (err) {
        console.error("CREATORS ERROR:", err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchCreators();

    return () => {
      active = false;
    };
  }, []);

  const filteredCreators = useMemo(() => {
    const term = search.toLowerCase().trim();

    const filtered = creators.filter((creator) =>
      creator.displayName.toLowerCase().includes(term)
    );

    return [...filtered].sort((a, b) => {
      if (sortMode === "uploads") {
        return b.approvedUploads - a.approvedUploads;
      }

      if (sortMode === "downloads") {
        return b.totalDownloads - a.totalDownloads;
      }

      if (sortMode === "streak") {
        return b.bestUploadStreak - a.bestUploadStreak;
      }

      return getScore(b) - getScore(a);
    });
  }, [creators, search, sortMode]);

  const totalCreators = creators.length;

  const totalApprovedUploads = creators.reduce(
    (sum, creator) => sum + creator.approvedUploads,
    0
  );

  const totalDownloads = creators.reduce(
    (sum, creator) => sum + creator.totalDownloads,
    0
  );

  const totalViews = creators.reduce(
    (sum, creator) => sum + creator.totalViews,
    0
  );

  const topCreator = filteredCreators[0];

  if (loading) {
    return (
      <main className="flex min-h-[65vh] w-full items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <RefreshCw className="animate-spin text-red-500" size={27} />
          </div>
          <h1 className="mt-5 text-xl font-black text-[var(--foreground)]">
            Loading leaderboard
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Fetching creator rankings...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-w-0 space-y-6 overflow-x-hidden px-1 py-5 pb-28 text-[var(--foreground)] sm:px-2 lg:px-3 md:space-y-7 md:pb-12">

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-red-500/[0.09] blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-orange-500/[0.07] blur-[90px]" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-300">
              <Trophy size={15} />
              Community leaderboard
            </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
              Creator
              <span className="block bg-gradient-to-r from-red-500 via-red-600 to-orange-500 bg-clip-text text-transparent">
                Leaderboard.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              Celebrating the students and contributors who make
              learning better. Explore top creators, discover
              achievements and get inspired.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3 text-xs font-bold text-[var(--muted)]">
              <span className="flex items-center gap-2">
                <Sparkles size={15} className="text-yellow-500" />
                Community driven
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--muted)]/40" />
              <span className="flex items-center gap-2">
                <TrendingUp size={15} className="text-green-500" />
                Reputation rankings
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <HeroStat
              icon={<Users size={19} />}
              label="Creators"
              value={totalCreators}
            />
            <HeroStat
              icon={<FileText size={19} />}
              label="Approved Notes"
              value={totalApprovedUploads}
            />
            <HeroStat
              icon={<Download size={19} />}
              label="Downloads"
              value={totalDownloads}
            />
            <HeroStat
              icon={<Eye size={19} />}
              label="Total Views"
              value={totalViews}
            />
          </div>
        </div>
      </section>

      {/* FEATURED CREATOR */}
      {topCreator && (
        <section className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-500/[0.09] via-[var(--panel)] to-orange-500/[0.06] p-5 shadow-sm sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-red-500/[0.08] blur-[90px]" />

          <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
                <Crown size={17} className="text-yellow-500" />
                Current top creator
              </div>

              <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-1">
                    <UserAvatar
                      name={topCreator.displayName}
                      src={topCreator.photoURL || ""}
                      size="lg"
                    />
                  </div>

                  <div className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--panel)] bg-yellow-500 text-black">
                    <Medal size={20} />
                  </div>
                </div>

                <div className="min-w-0">
                  <h2 className="flex flex-wrap items-center gap-2 text-2xl font-black text-[var(--foreground)] sm:text-3xl">
                    {topCreator.displayName}
                    {topCreator.verifiedCreator && (
                      <BadgeCheck size={23} className="shrink-0 text-blue-500" />
                    )}
                  </h2>

                  <p className="mt-2 text-sm font-bold text-red-600 dark:text-red-300">
                    Level {getLevel(topCreator)} · {getLevelTitle(topCreator)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-yellow-500/25 bg-yellow-500/10 px-3 py-1.5 text-xs font-black text-yellow-700 dark:text-yellow-300">
                      <Trophy size={12} className="mr-1 inline" />
                      #1 Ranked Creator
                    </span>

                    <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-bold text-[var(--muted-strong)]">
                      {numberFormat(topCreator.reputation)} Reputation
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href={`/profile/${topCreator.userId}`}
              className="group inline-flex items-center justify-center gap-3 rounded-xl bg-red-600 px-7 py-4 text-sm font-black text-white shadow-lg shadow-red-950/10 transition hover:bg-red-500"
            >
              View Top Creator
              <ArrowUpRight
                size={18}
                className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          <div className="relative mt-8 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-6">
            <FeatureStat label="Approved Notes" value={topCreator.approvedUploads} />
            <FeatureStat label="Downloads" value={topCreator.totalDownloads} />
            <FeatureStat label="Reputation" value={topCreator.reputation} />
          </div>
        </section>
      )}

      {/* SEARCH AND FILTER */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users size={20} className="text-red-500" />
              <h2 className="text-xl font-black text-[var(--foreground)] sm:text-2xl">
                Explore Creators
              </h2>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Find and discover talented contributors.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative flex-1 lg:w-[340px]">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search creators by name..."
                className="nw-input h-12 pl-11 pr-11 text-sm font-semibold"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="relative sm:w-[210px]">
              <SlidersHorizontal
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />

              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="nw-input h-12 appearance-none pl-11 pr-4 text-sm font-bold"
              >
                <option value="overall">Overall Rank</option>
                <option value="uploads">Most Uploads</option>
                <option value="downloads">Most Downloads</option>
                <option value="streak">Best Streak</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
          <p className="text-xs font-bold text-[var(--muted)]">
            Showing{" "}
            <span className="text-[var(--foreground)]">
              {filteredCreators.length}
            </span>{" "}
            of {totalCreators} creators
          </p>

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs font-black text-red-600 transition hover:text-red-500 dark:text-red-400"
            >
              Clear search
            </button>
          )}
        </div>
      </section>

      {/* ERROR STATE */}
      {error && (
        <section className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-6 text-center">
          <p className="font-bold text-red-600 dark:text-red-300">
            Unable to load creators.
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Check your connection and Firestore permissions.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-500"
          >
            Retry
          </button>
        </section>
      )}

      {/* CREATOR GRID */}
      {!error && (
        <>
          {filteredCreators.length === 0 ? (
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] px-5 py-16 text-center shadow-sm sm:py-20">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300">
                <Users size={36} />
              </div>

              <h2 className="mt-6 text-2xl font-black text-[var(--foreground)]">
                {search ? "No creators found" : "No creators yet"}
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--muted)]">
                {search
                  ? "Try searching with a different name."
                  : "Creators will appear here once their statistics are available."}
              </p>

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-6 rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white transition hover:bg-red-500"
                >
                  Clear Search
                </button>
              )}
            </section>
          ) : (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredCreators.map((creator, index) => {
                const unlockedBadges = creator.badges.filter(
                  (badge) => badge.unlocked
                );

                return (
                  <Link
                    key={creator.userId}
                    href={`/profile/${creator.userId}`}
                    className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-red-500/35 hover:shadow-lg sm:p-6"
                  >
                    {/* CARD TOP */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar
                          name={creator.displayName}
                          src={creator.photoURL || ""}
                          size="lg"
                        />

                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                            Creator
                          </p>
                          <p className="mt-1 truncate text-sm font-black text-[var(--foreground)]">
                            {getLevelTitle(creator)}
                          </p>
                          <p className="mt-1 text-xs font-bold text-yellow-600 dark:text-yellow-400">
                            Level {getLevel(creator)}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-black ${
                          index === 0
                            ? "border-yellow-500/25 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
                            : index === 1
                              ? "border-slate-400/25 bg-slate-400/10 text-slate-600 dark:text-slate-300"
                              : index === 2
                                ? "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                                : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted)]"
                        }`}
                      >
                        {getRankLabel(index)}
                      </div>
                    </div>

                    {/* NAME */}
                    <div className="mt-6 min-h-[65px]">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="truncate text-xl font-black tracking-tight text-[var(--foreground)]">
                          {creator.displayName}
                        </h3>

                        {creator.verifiedCreator && (
                          <BadgeCheck
                            size={19}
                            className="shrink-0 text-blue-500"
                          />
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
                        <Sparkles size={13} className="text-red-500" />
                        {numberFormat(creator.reputation)} Reputation
                      </div>
                    </div>

                    {/* STATISTICS */}
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <MiniStat
                        icon={<FileText size={17} />}
                        value={creator.approvedUploads}
                        label="Approved"
                      />
                      <MiniStat
                        icon={<Download size={17} />}
                        value={creator.totalDownloads}
                        label="Downloads"
                      />
                      <MiniStat
                        icon={<Flame size={17} />}
                        value={creator.bestUploadStreak}
                        label="Best Streak"
                      />
                    </div>

                    {/* BADGES */}
                    <div className="mt-5 min-h-[104px] rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs font-black text-[var(--muted-strong)]">
                        <Award size={15} className="text-yellow-500" />
                        Achievements
                        <span className="ml-auto text-[var(--muted)]">
                          {unlockedBadges.length}
                        </span>
                      </div>

                      {unlockedBadges.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {unlockedBadges.slice(0, 3).map((badge) => (
                            <span
                              key={badge.id}
                              className="max-w-full truncate rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[10px] font-black text-red-700 dark:text-red-300"
                            >
                              {badge.title}
                            </span>
                          ))}

                          {unlockedBadges.length > 3 && (
                            <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[10px] font-black text-[var(--muted)]">
                              +{unlockedBadges.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="pt-1 text-xs font-semibold text-[var(--muted)]">
                          No achievements unlocked yet.
                        </p>
                      )}
                    </div>

                    {/* PROFILE LINK */}
                    <div className="mt-5 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm font-black transition group-hover:border-red-500/30 group-hover:bg-red-600">
                      <span className="text-[var(--foreground)] transition group-hover:text-white">
                        View Profile
                      </span>
                      <ArrowUpRight
                        size={18}
                        className="text-[var(--muted)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
                      />
                    </div>
                  </Link>
                );
              })}
            </section>
          )}
        </>
      )}
    </main>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:border-red-500/25 sm:p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-300">
        {icon}
      </div>

      <p className="mt-4 text-xl font-black tracking-tight text-[var(--foreground)] sm:text-2xl">
        {numberFormat(value)}
      </p>

      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-[var(--muted)] sm:text-xs">
        {label}
      </p>
    </div>
  );
}

function FeatureStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <p className="text-xl font-black text-[var(--foreground)] sm:text-2xl">
        {numberFormat(value)}
      </p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-[var(--muted)] sm:text-xs">
        {label}
      </p>
    </div>
  );
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-3 text-center">
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-300">
        {icon}
      </div>

      <p className="mt-2 truncate text-base font-black text-[var(--foreground)] sm:text-lg">
        {numberFormat(value)}
      </p>

      <p className="mt-1 truncate text-[9px] font-black uppercase tracking-wide text-[var(--muted)] sm:text-[10px]">
        {label}
      </p>
    </div>
  );
}


"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  ArrowRight,
  Award,
  Crown,
  Download,
  Flame,
  Medal,
  RefreshCw,
  Sparkles,
  Trophy,
  UploadCloud,
  Users,
  Star,
} from "lucide-react";

import { db } from "@/firebase/firebase";
import UserAvatar from "@/components/UserAvatar";
import type { CreatorBadge, CreatorLevel } from "@/types/creator";

type HallCreator = {
  userId: string;
  displayName: string;
  photoURL?: string;
  approvedUploads: number;
  totalDownloads: number;
  totalLikes: number;
  totalViews: number;
  bestUploadStreak: number;
  badges: CreatorBadge[];
  creatorLevel?: CreatorLevel;
};

function getScore(creator: HallCreator) {
  const unlockedBadges = creator.badges.filter((badge) => badge.unlocked).length;

  return (
    creator.approvedUploads * 10 +
    creator.totalDownloads * 2 +
    creator.totalLikes * 4 +
    creator.totalViews +
    creator.bestUploadStreak * 8 +
    unlockedBadges * 15
  );
}

function getUnlockedBadges(creator: HallCreator) {
  return creator.badges.filter((badge) => badge.unlocked).length;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export default function HallOfFamePage() {
  const [creators, setCreators] = useState<HallCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCreators() {
      try {
        const snap = await getDocs(collection(db, "creatorStats"));

        const data: HallCreator[] = snap.docs.map((item) => {
          const value = item.data();

          return {
            userId: value.userId || item.id,
            displayName: value.displayName || "Edukrate Creator",
            photoURL: value.photoURL || "",
            approvedUploads: Number(value.approvedUploads || 0),
            totalDownloads: Number(value.totalDownloads || 0),
            totalLikes: Number(value.totalLikes || 0),
            totalViews: Number(value.totalViews || 0),
            bestUploadStreak: Number(value.bestUploadStreak || 0),
            badges: Array.isArray(value.badges) ? value.badges : [],
            creatorLevel: value.creatorLevel || undefined,
          };
        });

        setCreators(data.filter((creator) => creator.approvedUploads > 0));
      } catch (error) {
        console.error("HALL OF FAME ERROR:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCreators();
  }, []);

  const legends = useMemo(
    () =>
      [...creators]
        .sort((a, b) => getScore(b) - getScore(a))
        .slice(0, 10),
    [creators]
  );

  const downloadKings = useMemo(
    () =>
      [...creators]
        .sort((a, b) => b.totalDownloads - a.totalDownloads)
        .slice(0, 5),
    [creators]
  );

  const uploadMasters = useMemo(
    () =>
      [...creators]
        .sort((a, b) => b.approvedUploads - a.approvedUploads)
        .slice(0, 5),
    [creators]
  );

  const streakChampions = useMemo(
    () =>
      [...creators]
        .sort((a, b) => b.bestUploadStreak - a.bestUploadStreak)
        .slice(0, 5),
    [creators]
  );

  const badgeCollectors = useMemo(
    () =>
      [...creators]
        .sort((a, b) => getUnlockedBadges(b) - getUnlockedBadges(a))
        .slice(0, 5),
    [creators]
  );

  const totalUploads = creators.reduce(
    (sum, creator) => sum + creator.approvedUploads,
    0
  );

  const totalDownloads = creators.reduce(
    (sum, creator) => sum + creator.totalDownloads,
    0
  );

  if (loading) {
    return (
      <main className="min-h-screen w-full bg-[var(--background)] px-3 py-8 text-[var(--foreground)] sm:px-5 lg:px-7">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--card)]">
              <RefreshCw className="animate-spin text-red-500" size={30} />
            </div>
            <h1 className="mt-5 text-xl font-black">Loading Hall of Fame</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Ranking Edukrate creators...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[var(--background)] px-3 py-5 text-[var(--foreground)] sm:px-5 lg:px-7 xl:px-9">
      <div className="w-full space-y-6 pb-28 md:pb-10">
        {/* HERO */}
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-yellow-500/20 bg-[var(--panel)] shadow-xl">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-yellow-500/15 via-transparent to-red-600/10" />
          <div className="absolute -right-20 -top-24 -z-10 h-80 w-80 rounded-full bg-yellow-500/15 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 -z-10 h-72 w-72 rounded-full bg-red-600/10 blur-3xl" />

          <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[1fr_390px] lg:items-center lg:p-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/25 bg-yellow-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-yellow-500">
                <Trophy size={16} />
                Creator Hall of Fame
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Edukrate
                <span className="block bg-gradient-to-r from-yellow-500 via-amber-400 to-red-500 bg-clip-text text-transparent">
                  Legends
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                Celebrating the most consistent, helpful, and trusted creators
                on Edukrate. Every upload, download, achievement, and
                contribution counts.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-2.5 text-sm font-bold text-yellow-600 dark:text-yellow-300">
                  <Sparkles size={16} />
                  Top creator rankings
                </div>
                <Link
                  href="/creators"
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-500"
                >
                  View Leaderboard
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <HeroStat
                icon={<Users size={18} />}
                label="Creators"
                value={creators.length}
              />
              <HeroStat
                icon={<UploadCloud size={18} />}
                label="Uploads"
                value={totalUploads}
              />
              <HeroStat
                icon={<Download size={18} />}
                label="Downloads"
                value={totalDownloads}
              />
            </div>
          </div>
        </section>

        {creators.length === 0 ? (
          <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-10 text-center">
            <Trophy className="mx-auto text-[var(--muted)]" size={48} />
            <h2 className="mt-5 text-2xl font-black">No legends yet</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Creators will appear after they upload approved notes.
            </p>
          </section>
        ) : (
          <>
            {/* TOP THREE */}
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-500">
                  <Crown size={21} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-600 dark:text-yellow-400">
                    The best of the best
                  </p>
                  <h2 className="text-xl font-black sm:text-2xl">
                    Top Three Legends
                  </h2>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {legends.slice(0, 3).map((creator, index) => (
                  <TopLegendCard
                    key={creator.userId}
                    creator={creator}
                    rank={index + 1}
                  />
                ))}
              </div>
            </section>

            {/* OVERALL LEADERBOARD */}
            <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)]">
              <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:p-7">
                <div>
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-yellow-600 dark:text-yellow-400">
                    <Trophy size={15} />
                    Overall Ranking
                  </p>
                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                    Top Legends
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Ranked by total creator score
                  </p>
                </div>

                <Link
                  href="/creators"
                  className="inline-flex w-fit items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm font-black transition hover:border-red-500/40 hover:text-red-500"
                >
                  Full Leaderboard
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="space-y-2 p-3 sm:p-5 lg:p-6">
                {legends.map((creator, index) => (
                  <CreatorRow
                    key={creator.userId}
                    creator={creator}
                    rank={index + 1}
                    value={getScore(creator)}
                    valueLabel="Score"
                    featured={index === 0}
                  />
                ))}
              </div>
            </section>

            {/* CATEGORY RANKINGS */}
            <section>
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">
                  Creator achievements
                </p>
                <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                  Category Champions
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Leaders across different creator milestones.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <RankingPanel
                  title="Download Kings"
                  subtitle="Most downloaded notes"
                  icon={<Download size={18} />}
                  creators={downloadKings}
                  valueLabel="Downloads"
                  getValue={(creator) => creator.totalDownloads}
                />

                <RankingPanel
                  title="Upload Masters"
                  subtitle="Most approved uploads"
                  icon={<UploadCloud size={18} />}
                  creators={uploadMasters}
                  valueLabel="Approved"
                  getValue={(creator) => creator.approvedUploads}
                />

                <RankingPanel
                  title="Streak Champions"
                  subtitle="Longest upload streaks"
                  icon={<Flame size={18} />}
                  creators={streakChampions}
                  valueLabel="Best Streak"
                  getValue={(creator) => creator.bestUploadStreak}
                />

                <RankingPanel
                  title="Badge Collectors"
                  subtitle="Most unlocked achievements"
                  icon={<Award size={18} />}
                  creators={badgeCollectors}
                  valueLabel="Badges"
                  getValue={getUnlockedBadges}
                />
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function TopLegendCard({
  creator,
  rank,
}: {
  creator: HallCreator;
  rank: number;
}) {
  const isFirst = rank === 1;

  return (
    <Link
      href={`/profile/${creator.userId}`}
      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-[2rem] border bg-[var(--card)] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6 ${
        isFirst
          ? "border-yellow-500/35 shadow-lg shadow-yellow-500/5"
          : "border-[var(--border)] hover:border-yellow-500/30"
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 ${
          rank === 1
            ? "bg-yellow-500"
            : rank === 2
              ? "bg-zinc-400"
              : "bg-amber-700"
        }`}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-1">
          <UserAvatar
            name={creator.displayName}
            src={creator.photoURL || ""}
            size="lg"
          />
        </div>

        <div
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${
            rank === 1
              ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-300"
              : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-strong)]"
          }`}
        >
          {rank === 1 ? <Crown size={14} /> : <Medal size={14} />}
          Rank #{rank}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="truncate text-xl font-black sm:text-2xl">
          {creator.displayName}
        </h3>
        <p className="mt-1 text-sm font-bold text-yellow-600 dark:text-yellow-400">
          Level {creator.creatorLevel?.level || 1} ·{" "}
          {creator.creatorLevel?.title || "Starter"}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <MiniStat label="Creator Score" value={getScore(creator)} />
        <MiniStat label="Badges" value={getUnlockedBadges(creator)} />
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white transition group-hover:bg-red-500">
        View Creator Profile
        <ArrowRight
          size={17}
          className="transition group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

function RankingPanel({
  title,
  subtitle,
  icon,
  creators,
  valueLabel,
  getValue,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  creators: HallCreator[];
  valueLabel: string;
  getValue: (creator: HallCreator) => number;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[1.8rem] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 lg:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black sm:text-xl">{title}</h2>
          <p className="text-xs text-[var(--muted)]">{subtitle}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        {creators.map((creator, index) => (
          <CreatorRow
            key={creator.userId}
            creator={creator}
            rank={index + 1}
            value={getValue(creator)}
            valueLabel={valueLabel}
          />
        ))}
      </div>
    </section>
  );
}

function CreatorRow({
  creator,
  rank,
  value,
  valueLabel,
  featured = false,
}: {
  creator: HallCreator;
  rank: number;
  value: number;
  valueLabel: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/profile/${creator.userId}`}
      className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 transition sm:gap-4 sm:p-4 ${
        featured
          ? "border-yellow-500/25 bg-yellow-500/[0.06] hover:border-yellow-500/40"
          : "border-[var(--border)] bg-[var(--panel)] hover:border-red-500/30 hover:bg-[var(--surface-hover)]"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          rank <= 3
            ? "bg-yellow-500/10 text-yellow-500"
            : "bg-[var(--card-soft)] text-[var(--muted)]"
        }`}
      >
        {rank <= 3 ? (
          <Medal size={19} />
        ) : (
          <span className="text-xs font-black">#{rank}</span>
        )}
      </div>

      <UserAvatar
        name={creator.displayName}
        src={creator.photoURL || ""}
        size="sm"
      />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-black sm:text-base">
          {creator.displayName}
        </h3>
        <p className="mt-1 truncate text-xs font-semibold text-[var(--muted)]">
          Level {creator.creatorLevel?.level || 1} ·{" "}
          {creator.creatorLevel?.title || "Starter"}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-black tabular-nums sm:text-base">
          {formatNumber(value)}
        </p>
        <p className="mt-0.5 text-[10px] font-bold text-[var(--muted)] sm:text-xs">
          {valueLabel}
        </p>
      </div>
    </Link>
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
    <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)]/70 p-3 text-center sm:p-4">
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-300">
        {icon}
      </div>
      <p className="mt-2 truncate text-lg font-black tabular-nums sm:text-2xl">
        {formatNumber(value)}
      </p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-[var(--muted)] sm:text-[10px]">
        {label}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3 sm:p-4">
      <p className="text-xl font-black tabular-nums">
        {formatNumber(value)}
      </p>
      <p className="mt-1 text-xs font-bold text-[var(--muted)]">{label}</p>
    </div>
  );
}

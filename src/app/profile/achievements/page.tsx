
"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Lock,
  RefreshCw,
  Sparkles,
  Trophy,
  Target,
  Zap,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";

import { db } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";
import AchievementProgress from "@/components/AchievementProgress";
import AchievementBadge from "@/components/AchievementBadge";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { updateUserAchievements } from "@/lib/updateUserAchievements";

type AchievementStats = {
  approvedNotes?: number;
  totalDownloads?: number;
  totalViews?: number;
  totalLikes?: number;
};

type UserData = {
  achievements?: string[];
  achievementStats?: AchievementStats;
};

export default function AchievementsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/signin");
  }, [loading, user, router]);

  useEffect(() => {
    async function fetchAchievements() {
      if (!user) return;

      try {
        await updateUserAchievements(user.uid);

        const userSnap = await getDoc(doc(db, "users", user.uid));

        if (userSnap.exists()) {
          setUserData(userSnap.data() as UserData);
        }
      } catch (err) {
        console.error("ACHIEVEMENTS FETCH ERROR:", err);
      } finally {
        setFetching(false);
      }
    }

    if (user) fetchAchievements();
  }, [user]);

  const achievements = userData?.achievements || [];
  const achievementStats = userData?.achievementStats || {};

  const unlockedBadges = useMemo(
    () =>
      ACHIEVEMENTS.filter((achievement) =>
        achievements.includes(achievement.id)
      ),
    [achievements]
  );

  const lockedBadges = useMemo(
    () =>
      ACHIEVEMENTS.filter(
        (achievement) => !achievements.includes(achievement.id)
      ),
    [achievements]
  );

  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = unlockedBadges.length;
  const lockedCount = lockedBadges.length;

  const progressPercentage =
    totalCount > 0
      ? Math.round((unlockedCount / totalCount) * 100)
      : 0;

  if (loading || fetching) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)]">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--card)]">
            <RefreshCw className="animate-spin text-red-500" size={28} />
          </div>
          <h1 className="mt-5 text-xl font-black">Loading achievements</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Updating your creator progress...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[var(--background)] px-3 py-5 text-[var(--foreground)] sm:px-5 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-28 md:pb-10">

        {/* Back navigation */}
        <Link
          href="/profile"
          className="group inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-bold text-[var(--muted-strong)] transition hover:border-red-500/40 hover:text-red-500"
        >
          <ArrowLeft size={16} className="transition group-hover:-translate-x-1" />
          Back to Profile
        </Link>

        {/* Hero */}
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.16),transparent_55%)]" />
          <div className="pointer-events-none absolute -right-20 -top-20 -z-10 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />

          <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_300px] lg:items-center lg:p-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-red-500">
                <Trophy size={14} />
                Achievement Center
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Your Achievements
                <span className="mt-1 block text-red-500">
                  Your progress matters.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                Every helpful upload and every student you support brings you
                closer to your next milestone. Keep learning, contributing
                and growing with Edukrate.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/upload"
                  className="btn-primary justify-center"
                >
                  <Zap size={17} />
                  Upload Notes
                </Link>

                <Link
                  href="/profile"
                  className="btn-secondary justify-center"
                >
                  My Profile
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Overall progress */}
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--background)]/80 p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">
                    Overall Progress
                  </p>
                  <p className="mt-2 text-4xl font-black tabular-nums">
                    {progressPercentage}%
                  </p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                  <Award size={30} />
                </div>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--card-soft)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-700"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                <span className="text-[var(--muted)]">
                  {unlockedCount} of {totalCount} unlocked
                </span>
                <span className="text-red-500">
                  {lockedCount} remaining
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard
            icon={<Award size={22} />}
            label="Total Badges"
            value={totalCount}
            description="Available achievements"
            variant="default"
          />

          <SummaryCard
            icon={<CheckCircle2 size={22} />}
            label="Unlocked"
            value={unlockedCount}
            description="Achievements earned"
            variant="success"
          />

          <SummaryCard
            icon={<Lock size={22} />}
            label="Locked"
            value={lockedCount}
            description="Still waiting to unlock"
            variant="locked"
          />
        </section>

        {/* Main content */}
        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">

          {/* Earned achievements */}
          <div className="min-w-0 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-7">
            <SectionHeading
              icon={<Sparkles size={17} />}
              eyebrow="Your collection"
              title="Unlocked Badges"
              description="Milestones you've already achieved."
            />

            {unlockedBadges.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--background)] px-5 py-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                  <Trophy size={30} />
                </div>
                <h3 className="mt-4 text-lg font-black">
                  Your collection starts here
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
                  Upload approved notes and support other students to earn
                  your first achievement.
                </p>
                <Link href="/upload" className="btn-primary mt-5 inline-flex">
                  <Zap size={16} />
                  Upload Your First Note
                </Link>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap gap-3">
                {unlockedBadges.map((achievement) => (
                  <AchievementBadge
                    key={achievement.id}
                    id={achievement.id}
                  />
                ))}
              </div>
            )}

            {/* Locked achievements */}
            <div className="mt-8 border-t border-[var(--border)] pt-6">
              <SectionHeading
                icon={<Lock size={16} />}
                eyebrow="What's next"
                title="Locked Badges"
                description="Keep contributing to unlock these milestones."
              />

              {lockedBadges.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-green-500/20 bg-green-500/10 p-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="shrink-0 text-green-500" size={25} />
                    <div>
                      <p className="font-black text-green-600 dark:text-green-400">
                        All achievements unlocked!
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        You've completed every available milestone.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {lockedBadges.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3.5 transition hover:border-red-500/30 hover:bg-[var(--surface-hover)]"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] text-2xl grayscale">
                        {achievement.emoji}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-black">
                          {achievement.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                          {achievement.description}
                        </p>
                      </div>

                      <Lock
                        size={16}
                        className="shrink-0 text-[var(--muted)] transition group-hover:text-red-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Milestone progress */}
          <div className="min-w-0 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-7">
            <SectionHeading
              icon={<Target size={17} />}
              eyebrow="Keep progressing"
              title="Next Milestones"
              description="See what you need to accomplish to earn more badges."
            />

            <div className="mt-6">
              <AchievementProgress
                unlockedAchievements={achievements}
                stats={achievementStats}
              />
            </div>

            <div className="mt-7 rounded-3xl border border-red-500/20 bg-red-500/[0.06] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                  <Sparkles size={21} />
                </div>
                <div>
                  <h3 className="font-black">Keep the momentum going</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Every contribution counts.
                  </p>
                </div>
              </div>

              <Link
                href="/upload"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-500"
              >
                Share Study Material
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* Bottom navigation */}
        <div className="flex flex-col gap-3 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="font-black">Ready for your next achievement?</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Continue sharing helpful resources with the Edukrate community.
            </p>
          </div>

          <Link
            href="/profile"
            className="btn-secondary justify-center"
          >
            Return to Profile
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}

function SectionHeading({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-red-500">
        {icon}
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
        {description}
      </p>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  description,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
  variant: "default" | "success" | "locked";
}) {
  const iconStyles = {
    default: "bg-red-500/10 text-red-500",
    success: "bg-green-500/10 text-green-600 dark:text-green-400",
    locked: "bg-[var(--card-soft)] text-[var(--muted)]",
  };

  return (
    <div className="group rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 transition hover:-translate-y-0.5 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            {label}
          </p>
          <p className="mt-3 text-4xl font-black tabular-nums">
            {value}
          </p>
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconStyles[variant]}`}>
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs font-medium text-[var(--muted)]">
        {description}
      </p>
    </div>
  );
}

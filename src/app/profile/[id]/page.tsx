
"use client";

import type { CreatorStats } from "@/types/creator";
import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import {
  Award,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Download,
  Eye,
  FileText,
  Flame,
  GraduationCap,
  Heart,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  getCreatorLevelProgress,
  getNextCreatorLevel,
} from "@/lib/creatorLevels";
import { db } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import type { Note } from "@/types/note";
import { createNotification } from "@/lib/createNotification";

type UserProfile = {
  uid: string;
  displayName?: string;
  name?: string;
  bio?: string;
  occupation?: string;
  avatarUrl?: string;
  photoURL?: string;
  profileImage?: string;
  profileImageUrl?: string;
  imageUrl?: string;
  verified?: boolean;
  createdAt?: unknown;
};

type PublicNote = Note & {
  id: string;
  views?: number;
  likes?: number;
  downloads?: number;
  downloadsCount?: number;
  createdAt?: unknown;
};

export default function PublicProfilePage() {
  const params = useParams<{ id?: string; uid?: string }>();
  const id = params.id || params.uid;
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notes, setNotes] = useState<PublicNote[]>([]);
  const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followDocId, setFollowDocId] = useState("");
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const userSnap = await getDoc(doc(db, "users", id));
        const creatorStatsSnap = await getDoc(doc(db, "creatorStats", id));

        setCreatorStats(
          creatorStatsSnap.exists()
            ? (creatorStatsSnap.data() as CreatorStats)
            : null
        );

        if (userSnap.exists()) {
          setProfile({
            uid: id,
            ...(userSnap.data() as Omit<UserProfile, "uid">),
          });
        } else {
          setProfile(null);
        }

        const notesQuery = query(
          collection(db, "notes"),
          where("uploaderId", "==", id),
          where("status", "==", "approved")
        );

        const followersQuery = query(
          collection(db, "follows"),
          where("followingId", "==", id)
        );

        const followingQuery = query(
          collection(db, "follows"),
          where("followerId", "==", id)
        );

        const [notesSnap, followersSnap, followingSnap] = await Promise.all([
          getDocs(notesQuery),
          getDocs(followersQuery),
          getDocs(followingQuery),
        ]);

        const notesData: PublicNote[] = notesSnap.docs.map((noteDoc) => ({
          id: noteDoc.id,
          ...(noteDoc.data() as Omit<PublicNote, "id">),
        }));

        setNotes(notesData);
        setFollowersCount(followersSnap.docs.length);
        setFollowingCount(followingSnap.docs.length);

        if (user) {
          const currentFollowQuery = query(
            collection(db, "follows"),
            where("followerId", "==", user.uid),
            where("followingId", "==", id)
          );

          const currentFollowSnap = await getDocs(currentFollowQuery);

          if (!currentFollowSnap.empty) {
            setIsFollowing(true);
            setFollowDocId(currentFollowSnap.docs[0].id);
          } else {
            setIsFollowing(false);
            setFollowDocId("");
          }
        } else {
          setIsFollowing(false);
          setFollowDocId("");
        }
      } catch (err) {
        console.error("PROFILE ERROR:", err);
        toast.error("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [id, user]);

  const totalDownloads = useMemo(
    () => notes.reduce((sum, note) => sum + getDownloads(note), 0),
    [notes]
  );

  const totalLikes = useMemo(
    () => notes.reduce((sum, note) => sum + getNumber(note.likes), 0),
    [notes]
  );

  const totalViews = useMemo(
    () => notes.reduce((sum, note) => sum + getNumber(note.views), 0),
    [notes]
  );

  const topSubjects = useMemo(() => {
    const subjectMap = new Map<string, number>();

    notes.forEach((note) => {
      if (!note.subject) return;
      subjectMap.set(
        note.subject,
        (subjectMap.get(note.subject) || 0) + 1
      );
    });

    return Array.from(subjectMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [notes]);

  const topNotes = useMemo(
    () =>
      [...notes]
        .sort((a, b) => getCreatorScore(b) - getCreatorScore(a))
        .slice(0, 3),
    [notes]
  );

  const latestNotes = useMemo(
    () =>
      [...notes]
        .sort(
          (a, b) =>
            getCreatedTime(b.createdAt) - getCreatedTime(a.createdAt)
        )
        .slice(0, 6),
    [notes]
  );

  const bestNote = topNotes[0];

  const currentCreatorLevel = creatorStats?.creatorLevel || {
    level: 1,
    title: "Starter",
    minApprovedUploads: 1,
  };

  const nextCreatorLevel = getNextCreatorLevel(
    creatorStats?.approvedUploads || 0
  );

  const levelProgress = getCreatorLevelProgress(
    creatorStats?.approvedUploads || 0
  );

  const unlockedBadges =
    creatorStats?.badges?.filter((badge) => badge.unlocked) || [];

  const creatorScore = creatorStats
    ? creatorStats.approvedUploads * 10 +
      creatorStats.totalDownloads * 2 +
      creatorStats.totalLikes * 4 +
      creatorStats.totalViews +
      creatorStats.bestUploadStreak * 8
    : 0;

  async function handleFollow() {
    if (!user) {
      router.push("/signin");
      return;
    }

    if (!id || user.uid === id || !profile) return;

    const displayName =
      profile.displayName || profile.name || "Edukrate User";

    try {
      setFollowLoading(true);

      if (isFollowing && followDocId) {
        await deleteDoc(doc(db, "follows", followDocId));

        setIsFollowing(false);
        setFollowDocId("");
        setFollowersCount((prev) => Math.max(0, prev - 1));
        toast.success("Unfollowed.");
      } else {
        const newFollow = await addDoc(collection(db, "follows"), {
          followerId: user.uid,
          followerName: user.displayName || user.email || "Edukrate User",
          followerAvatar: user.photoURL || "",
          followingId: id,
          followingName: displayName,
          createdAt: new Date().toISOString(),
        });

        await createNotification({
          userId: id,
          type: "follow",
          title: "New follower 👋",
          message: `${
            user.displayName || user.email || "Someone"
          } started following you.`,
          link: `/profile/${user.uid}`,
        });

        setFollowDocId(newFollow.id);
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
        toast.success("Following.");
      }
    } catch (err) {
      console.error("FOLLOW ERROR:", err);
      toast.error("Follow action failed.");
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen w-full bg-[var(--background)] px-3 py-8 text-[var(--foreground)] sm:px-5">
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <RefreshCw className="animate-spin text-[var(--primary)]" size={28} />
            </div>
            <h1 className="mt-5 text-xl font-black">Loading profile</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Fetching profile and creator stats...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)]">
        <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 text-center">
          <UserRound size={44} className="mx-auto text-[var(--primary)]" />
          <h1 className="mt-5 text-3xl font-black">User not found</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            This profile may no longer be available.
          </p>
          <button
            onClick={() => router.back()}
            className="btn-primary mt-6"
          >
            Go back
          </button>
        </div>
      </main>
    );
  }

  const displayName =
    profile.displayName || profile.name || "Edukrate User";

  const avatarUrl =
    profile.avatarUrl ||
    profile.photoURL ||
    profile.profileImage ||
    profile.profileImageUrl ||
    profile.imageUrl ||
    "";

  const memberSince = getJoinedDate(profile.createdAt);

  const trustLabel =
    creatorScore >= 10000
      ? "Elite Creator"
      : creatorScore >= 5000
        ? "Trusted Creator"
        : creatorScore >= 1000
          ? "Rising Creator"
          : "New Creator";

  const creatorBadges: string[] = [];

  if (notes.length >= 10) creatorBadges.push("📚 Contributor");
  if (notes.length >= 50) creatorBadges.push("🏆 Top Creator");
  if (followersCount >= 25) creatorBadges.push("❤️ Community Favourite");
  if (followersCount >= 100) creatorBadges.push("🔥 Influencer");
  if (creatorScore >= 5000) creatorBadges.push("⭐ Elite Creator");
  if (profile.verified) creatorBadges.push("✅ Verified");

  const profileCompletion = Math.min(
    100,
    Math.max(0, creatorStats?.profileCompletion || 0)
  );

  return (
    <main className="min-h-screen w-full min-w-0 bg-[var(--background)] px-2 pb-24 pt-3 text-[var(--foreground)] sm:px-4 sm:pt-5 lg:px-5">
      <div className="mx-auto w-full max-w-[1800px] space-y-5">
        {/* Profile hero */}
        <section className="overflow-hidden rounded-[1.8rem] border border-[var(--border)] bg-[var(--panel)] shadow-xl">
          <div className="relative min-h-[230px] overflow-hidden border-b border-[var(--border)] bg-gradient-to-br from-red-700/40 via-red-500/10 to-[var(--panel)] px-5 py-7 sm:px-8 lg:px-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.15),transparent_38%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[var(--panel)] to-transparent" />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end">
                <div className="w-fit rounded-[1.8rem] border-4 border-[var(--panel)] bg-[var(--background)] shadow-2xl">
                  <UserAvatar name={displayName} src={avatarUrl} size="lg" />
                </div>

                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                      {displayName}
                    </h1>

                    {profile.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-500">
                        <BadgeCheck size={14} />
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-500">
                      <Award size={14} />
                      {trustLabel}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-xs font-bold text-yellow-600">
                      <Sparkles size={14} />
                      Level {currentCreatorLevel.level} · {currentCreatorLevel.title}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-bold text-[var(--muted-strong)]">
                      <GraduationCap size={14} />
                      {profile.occupation || "Student Creator"}
                    </span>
                  </div>
                </div>
              </div>

              {user?.uid !== id && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 md:w-auto ${
                    isFollowing ? "btn-secondary" : "btn-primary"
                  }`}
                >
                  {followLoading && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {followLoading
                    ? "Please wait..."
                    : isFollowing
                      ? "Following"
                      : "Follow Creator"}
                </button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
              <div className="min-w-0">
                <SectionLabel>About the creator</SectionLabel>
                <p className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm leading-7 text-[var(--muted-strong)] sm:p-5">
                  {profile.bio || "This creator has not added a bio yet."}
                </p>

                {topSubjects.length > 0 && (
                  <div className="mt-4">
                    <SectionLabel>Top subjects</SectionLabel>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {topSubjects.map(([subject, count]) => (
                        <span
                          key={subject}
                          className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-500"
                        >
                          {subject} · {count} uploads
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
                <SectionLabel>Creator identity</SectionLabel>

                <div className="mt-4 space-y-4">
                  <IdentityRow
                    icon={<ShieldCheck size={17} />}
                    label="Status"
                    value={trustLabel}
                  />
                  <IdentityRow
                    icon={<TrendingUp size={17} />}
                    label="Creator score"
                    value={String(formatNumber(creatorScore))}
                  />
                  <IdentityRow
                    icon={<CalendarDays size={17} />}
                    label="Joined"
                    value={memberSince}
                  />
                </div>
              </div>
            </div>

            {/* Main stats */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <StatCard
                icon={<BookOpen size={21} />}
                value={notes.length}
                label="Notes"
              />
              <StatCard
                icon={<Users size={21} />}
                value={followersCount}
                label="Followers"
              />
              <StatCard
                icon={<Download size={21} />}
                value={totalDownloads}
                label="Downloads"
              />
              <StatCard
                icon={<Heart size={21} />}
                value={totalLikes}
                label="Likes"
              />
              <StatCard
                icon={<Eye size={21} />}
                value={totalViews}
                label="Views"
              />
              <StatCard
                icon={<Flame size={21} />}
                value={creatorStats?.bestUploadStreak || 0}
                label="Best streak"
              />
            </div>

            {/* Social links */}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/profile/${id}/followers`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-bold text-[var(--foreground)] transition hover:border-red-500/40 hover:bg-[var(--surface-hover)]"
              >
                <Users size={16} />
                View followers
                <span className="text-[var(--muted)]">({followersCount})</span>
              </Link>

              <Link
                href={`/profile/${id}/following`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-bold text-[var(--foreground)] transition hover:border-red-500/40 hover:bg-[var(--surface-hover)]"
              >
                <Users size={16} />
                View following
                <span className="text-[var(--muted)]">({followingCount})</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Creator progress and achievements */}
        <section className="grid gap-5 xl:grid-cols-2">
          <CreatorPanel
            title="Creator progress"
            subtitle="Progress through creator levels"
            icon={<Sparkles size={16} />}
          >
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-yellow-600">
                    Current creator level
                  </p>
                  <h3 className="mt-1 text-xl font-black">
                    Level {currentCreatorLevel.level} · {currentCreatorLevel.title}
                  </h3>
                </div>

                <span className="rounded-xl bg-yellow-500/10 px-4 py-2 text-sm font-black text-yellow-600">
                  {creatorStats?.approvedUploads || 0} uploads
                </span>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--card-soft)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(0, levelProgress))}%`,
                  }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-[var(--muted)]">
                  {Math.round(levelProgress)}% complete
                </span>
                <span className="font-bold text-[var(--muted)]">
                  {nextCreatorLevel
                    ? `Next: ${nextCreatorLevel.title}`
                    : "Maximum level"}
                </span>
              </div>

              {nextCreatorLevel && (
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                  {nextCreatorLevel.minApprovedUploads} approved uploads
                  required for the next level.
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniCreatorStat
                label="Creator score"
                value={creatorScore}
              />
              <MiniCreatorStat
                label="Upload streak"
                value={creatorStats?.uploadStreak || 0}
              />
            </div>
          </CreatorPanel>

          <CreatorPanel
            title="Achievements"
            subtitle="Milestones earned by this creator"
            icon={<Award size={16} />}
          >
            {creatorBadges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {creatorBadges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-500"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyBox text="Upload notes and build a community to unlock creator achievements." />
            )}

            <div className="mt-5 border-t border-[var(--border)] pt-5">
              <SectionLabel>Unlocked creator badges</SectionLabel>

              {unlockedBadges.length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {unlockedBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                          <Award size={20} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-black">
                            {badge.title}
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                            {badge.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3">
                  <EmptyBox text="No additional creator badges unlocked yet." />
                </div>
              )}
            </div>
          </CreatorPanel>
        </section>

        {/* Profile strength */}
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <SectionLabel>Profile strength</SectionLabel>
              <h2 className="mt-2 text-xl font-black sm:text-2xl">
                Profile completion
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                A complete profile helps other students understand who
                created the notes they are viewing.
              </p>
            </div>

            <div className="w-full lg:max-w-xl">
              <div className="flex items-center justify-between text-sm font-black">
                <span>Completion</span>
                <span className="text-red-500">{profileCompletion}%</span>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--card-soft)]">
                <div
                  className="h-full rounded-full bg-red-600 transition-all duration-700"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>

              {profileCompletion >= 100 ? (
                <p className="mt-3 text-sm font-bold text-green-600">
                  <BadgeCheck className="mr-1 inline" size={16} />
                  Complete Profile badge unlocked
                </p>
              ) : (
                <p className="mt-3 text-xs text-[var(--muted)]">
                  Add a profile picture, display name, bio and occupation
                  to complete the profile.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Best performing and featured notes */}
        <section className="grid gap-5 xl:grid-cols-2">
          <CreatorPanel
            title="Best performing note"
            subtitle="Top note based on downloads, likes and views"
            icon={<Flame size={16} />}
          >
            {bestNote ? (
              <NoteRow note={bestNote} />
            ) : (
              <EmptyBox text="No top note available yet." />
            )}
          </CreatorPanel>

          <CreatorPanel
            title="Featured notes"
            subtitle="Best performing uploads from this creator"
            icon={<Award size={16} />}
          >
            {topNotes.length > 0 ? (
              <div className="space-y-3">
                {topNotes.map((note) => (
                  <NoteRow key={note.id} note={note} />
                ))}
              </div>
            ) : (
              <EmptyBox text="Featured notes will appear here once notes are uploaded." />
            )}
          </CreatorPanel>
        </section>

        {/* Public library */}
        <section className="space-y-5">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel>Public library</SectionLabel>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Uploaded notes
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Browse the approved notes shared by {displayName}.
              </p>
            </div>

            <span className="w-fit rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-bold text-[var(--muted-strong)]">
              {notes.length} {notes.length === 1 ? "note" : "notes"}
            </span>
          </div>

          {latestNotes.length === 0 ? (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] px-5 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                <FileText size={26} />
              </div>
              <h3 className="mt-4 text-lg font-black">No notes uploaded yet</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                This creator has not published any approved notes.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {latestNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ------------------------------ Components ------------------------------ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-500">
      {children}
    </p>
  );
}

function IdentityRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-[var(--muted)]">
        {icon}
        {label}
      </span>
      <span className="text-right font-black text-[var(--foreground)]">
        {value}
      </span>
    </div>
  );
}

function CreatorPanel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 sm:p-6">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-500">
        {icon}
        Creator stats
      </div>
      <h2 className="mt-2 text-xl font-black">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function NoteCard({ note }: { note: PublicNote }) {
  return (
    <Link
      href={`/notes/${note.id}`}
      className="group min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] transition hover:-translate-y-1 hover:border-red-500/40 hover:shadow-xl"
    >
      <div className="relative h-48 overflow-hidden bg-[var(--card-soft)] sm:h-52">
        {note.thumbnailUrl ? (
          <Image
            src={note.thumbnailUrl}
            alt={note.title || "Note thumbnail"}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-red-500/5">
            <FileText className="text-red-500" size={42} />
          </div>
        )}

        <div className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
          {note.subject || "General"}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <h3 className="line-clamp-2 min-h-12 text-base font-black leading-snug">
          {note.title || "Untitled Note"}
        </h3>

        <p className="mt-2 truncate text-xs font-semibold text-[var(--muted)]">
          {note.subject || "General"} · {formatClassLabel(note.class)}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--border)] pt-3 text-xs font-semibold text-[var(--muted)]">
          <span className="flex items-center gap-1.5">
            <Download size={14} />
            {formatNumber(getDownloads(note))}
          </span>
          <span className="flex items-center gap-1.5">
            <Heart size={14} />
            {formatNumber(getNumber(note.likes))}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye size={14} />
            {formatNumber(getNumber(note.views))}
          </span>
        </div>
      </div>
    </Link>
  );
}

function NoteRow({ note }: { note: PublicNote }) {
  return (
    <Link
      href={`/notes/${note.id}`}
      className="block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:border-red-500/40 hover:bg-[var(--surface-hover)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
          <BookOpen size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-500">
              {note.subject || "General"}
            </span>

            {note.type && (
              <span className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--muted)]">
                {note.type}
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 text-sm font-black">
            {note.title || "Untitled Note"}
          </h3>

          <p className="mt-1 line-clamp-1 text-xs text-[var(--muted)]">
            {note.topic || note.description || "No description"}
          </p>

          <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <Download size={13} />
              {formatNumber(getDownloads(note))}
            </span>
            <span className="flex items-center gap-1">
              <Heart size={13} />
              {formatNumber(getNumber(note.likes))}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={13} />
              {formatNumber(getNumber(note.views))}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm leading-6 text-[var(--muted)]">
      {text}
    </div>
  );
}

function MiniCreatorStat({
  label,
  value,
}: {
  label: string;
  value: number | string | undefined | null;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-2xl font-black tabular-nums">
        {formatNumber(Number.isFinite(Number(value)) ? Number(value) : 0)}
      </p>
      <p className="mt-1 text-xs font-bold text-[var(--muted)]">{label}</p>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 sm:p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
        {icon}
      </div>
      <p className="mt-3 truncate text-xl font-black tabular-nums sm:text-2xl">
        {formatNumber(value)}
      </p>
      <p className="mt-1 text-xs font-bold text-[var(--muted)] sm:text-sm">
        {label}
      </p>
    </div>
  );
}

/* -------------------------------- Helpers -------------------------------- */

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getDownloads(note: PublicNote) {
  return getNumber(note.downloads) || getNumber(note.downloadsCount);
}

function getCreatorScore(note: PublicNote) {
  return getDownloads(note) * 3 + getNumber(note.likes) * 2 + getNumber(note.views);
}

function getCreatedTime(value: unknown) {
  if (!value) return 0;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().getTime();
  }

  if (typeof value === "string") {
    return new Date(value).getTime() || 0;
  }

  return 0;
}

function normalizeClassName(value?: string) {
  const match = value?.match(/\d+/);
  return match ? match[0] : (value || "").toLowerCase().trim();
}

function formatClassLabel(value?: string) {
  const normalized = normalizeClassName(value);

  if (!normalized) return "Class not set";
  if (/^\d+$/.test(normalized)) return `Class ${normalized}`;

  return value || "Class not set";
}

function getJoinedDate(value: unknown) {
  if (!value) return "Recently";

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  }

  if (typeof value === "string") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      });
    }
  }

  return "Recently";
}

function formatNumber(value: string | number) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return value;
  return new Intl.NumberFormat("en-IN", {
    notation: numericValue >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(numericValue);
}

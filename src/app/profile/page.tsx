
"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AchievementBadge from "@/components/AchievementBadge";
import { updateUserAchievements } from "@/lib/updateUserAchievements";
import {
  Activity,
  ArrowRight,
  Award,
  BookOpen,
  Download,
  Eye,
  Flame,
  Heart,
  Mail,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import type { Note } from "@/types/note";

type UserProfile = {
  uid?: string;
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
  role?: string;
  achievements?: string[];
  createdAt?: unknown;
  achievementStats?: {
    approvedNotes?: number;
    totalDownloads?: number;
    totalViews?: number;
    totalLikes?: number;
  };
};

type CreatorNote = Note & {
  id: string;
  board?: string;
  type?: string;
  topic?: string;
  views?: number;
  likes?: number;
  downloads?: number;
  downloadsCount?: number;
  createdAt?: unknown;
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fetching, setFetching] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [uploadedNotes, setUploadedNotes] = useState<CreatorNote[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      updateUserAchievements(user.uid).catch(console.error);

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));

        if (userSnap.exists()) {
          setProfile(userSnap.data() as UserProfile);
        }

        const followersQuery = query(
          collection(db, "follows"),
          where("followingId", "==", user.uid)
        );

        const followingQuery = query(
          collection(db, "follows"),
          where("followerId", "==", user.uid)
        );

        const notesQuery = query(
          collection(db, "notes"),
          where("uploaderId", "==", user.uid)
        );

        const [followersSnap, followingSnap, notesSnap] = await Promise.all([
          getDocs(followersQuery),
          getDocs(followingQuery),
          getDocs(notesQuery),
        ]);

        const notesData: CreatorNote[] = notesSnap.docs.map((noteDoc) => ({
          id: noteDoc.id,
          ...(noteDoc.data() as Omit<CreatorNote, "id">),
        }));

        setFollowersCount(followersSnap.docs.length);
        setFollowingCount(followingSnap.docs.length);
        setUploadedNotes(notesData);
      } catch (err) {
        console.error("PROFILE FETCH ERROR:", err);
      } finally {
        setFetching(false);
      }
    }

    if (user) fetchProfile();
  }, [user]);

  const approvedNotes = useMemo(
    () => uploadedNotes.filter((note) => note.status === "approved"),
    [uploadedNotes]
  );

  const totalDownloads = useMemo(
    () => uploadedNotes.reduce((total, note) => total + getDownloads(note), 0),
    [uploadedNotes]
  );

  const totalLikes = useMemo(
    () => uploadedNotes.reduce((total, note) => total + getNumber(note.likes), 0),
    [uploadedNotes]
  );

  const totalViews = useMemo(
    () => uploadedNotes.reduce((total, note) => total + getNumber(note.views), 0),
    [uploadedNotes]
  );

  const topSubjects = useMemo(() => {
    const subjectMap = new Map<string, number>();

    uploadedNotes.forEach((note) => {
      if (!note.subject) return;
      subjectMap.set(note.subject, (subjectMap.get(note.subject) || 0) + 1);
    });

    return Array.from(subjectMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [uploadedNotes]);

  const latestNotes = useMemo(
    () =>
      [...uploadedNotes]
        .sort(
          (a, b) =>
            getCreatedTime(b.createdAt) - getCreatedTime(a.createdAt)
        )
        .slice(0, 3),
    [uploadedNotes]
  );

  const topNotes = useMemo(
    () =>
      [...uploadedNotes]
        .sort((a, b) => getCreatorScore(b) - getCreatorScore(a))
        .slice(0, 3),
    [uploadedNotes]
  );

  const bestNote = topNotes[0];

  if (loading || fetching) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 text-[var(--foreground)]">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--card)]">
            <RefreshCw className="animate-spin text-red-500" size={30} />
          </div>
          <h1 className="mt-5 text-xl font-black">Loading profile</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Fetching your creator stats...
          </p>
        </div>
      </div>
    );
  }

  const displayName =
    profile?.displayName || profile?.name || user?.displayName || "User";

  const avatarUrl =
    profile?.avatarUrl ||
    profile?.photoURL ||
    profile?.profileImage ||
    profile?.profileImageUrl ||
    profile?.imageUrl ||
    "";

  const creatorLevel =
    totalDownloads >= 100
      ? "Rising Creator"
      : uploadedNotes.length >= 5
        ? "Active Creator"
        : "New Creator";

  const achievements = profile?.achievements || [];

  return (
    <div className="w-full min-w-0 space-y-6 px-1 pb-28 text-[var(--foreground)] sm:px-2 lg:px-3 md:pb-10">
      {/* Profile hero */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.13),transparent_48%)]" />
        <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-red-500/[0.07] blur-3xl" />

        <div className="p-5 sm:p-7 lg:p-9">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4 sm:gap-6">
              <div className="shrink-0 rounded-[28px] border border-[var(--border)] bg-[var(--card-soft)] p-1.5 shadow-xl">
                <UserAvatar name={displayName} src={avatarUrl} size="lg" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="max-w-full break-words text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                    {displayName}
                  </h1>

                  {(profile?.verified || profile?.role === "admin") && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-500">
                      <ShieldCheck size={14} />
                      Verified
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm font-semibold text-[var(--muted)] sm:text-base">
                  {profile?.occupation || "Student Creator"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge icon={<Activity size={13} />} text="Active Profile" />
                  <Badge icon={<Award size={13} />} text={creatorLevel} />
                  <Badge
                    icon={<ShieldCheck size={13} />}
                    text={profile?.role === "admin" ? "Admin" : "User"}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:shrink-0">
              <Link href="/settings/profile" className="btn-primary justify-center">
                <Settings size={17} />
                Edit Profile
              </Link>
              <Link
                href={`/profile/${user?.uid}`}
                className="btn-secondary justify-center"
              >
                <UserRound size={17} />
                Public Profile
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">
                About
              </p>
              <p className="max-w-4xl rounded-2xl border border-[var(--border)] bg-[var(--background)]/60 p-4 text-sm leading-7 text-[var(--muted-strong)]">
                {profile?.bio ||
                  "Add a bio from Settings so students can learn more about you and your uploads."}
              </p>
            </div>

            {topSubjects.length > 0 && (
              <div className="lg:max-w-sm">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">
                  Main Subjects
                </p>
                <div className="flex flex-wrap gap-2">
                  {topSubjects.map(([subject, count]) => (
                    <span
                      key={subject}
                      className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-500"
                    >
                      {subject} · {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section>
        <SectionHeading
          eyebrow="Your activity"
          title="Creator Overview"
          subtitle="A snapshot of your profile and study material."
        />

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <ProfileCard
            href={`/profile/${user?.uid}/followers`}
            icon={<Users size={21} />}
            label="Followers"
            value={followersCount}
          />
          <ProfileCard
            href={`/profile/${user?.uid}/following`}
            icon={<UserPlus size={21} />}
            label="Following"
            value={followingCount}
          />
          <InfoCard
            icon={<UploadCloud size={21} />}
            label="Uploads"
            value={uploadedNotes.length}
          />
          <InfoCard
            icon={<Download size={21} />}
            label="Downloads"
            value={totalDownloads}
          />
          <InfoCard
            icon={<Heart size={21} />}
            label="Likes"
            value={totalLikes}
          />
          <InfoCard
            icon={<Eye size={21} />}
            label="Views"
            value={totalViews}
          />
        </div>
      </section>

      {/* Achievements */}
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <SectionEyebrow icon={<Award size={15} />}>
              Creator Achievements
            </SectionEyebrow>
            <h2 className="mt-2 text-2xl font-black">Unlocked Badges</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Earn badges by uploading helpful notes and supporting students.
            </p>
          </div>

          <Link
            href="/profile/achievements"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-500/15"
          >
            View Progress
            <ArrowRight size={16} />
          </Link>
        </div>

        {achievements.length === 0 ? (
          <div className="mt-5">
            <EmptyBox text="No achievements unlocked yet. Upload approved notes to start earning badges." />
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap gap-3">
            {achievements.map((id) => (
              <AchievementBadge key={id} id={id} />
            ))}
          </div>
        )}
      </section>

      {/* Highlight and account */}
      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
          <SectionEyebrow icon={<Flame size={15} />}>
            Creator Highlight
          </SectionEyebrow>
          <h2 className="mt-2 text-2xl font-black">Best Performing Note</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Your strongest note based on downloads, likes and views.
          </p>

          <div className="mt-5">
            {bestNote ? (
              <NoteRow note={bestNote} />
            ) : (
              <EmptyBox text="Upload notes to see your best performing content here." />
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
          <SectionEyebrow icon={<Mail size={15} />}>Account</SectionEyebrow>
          <h2 className="mt-2 text-2xl font-black">Account Details</h2>

          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Email
            </p>
            <p className="mt-2 break-all text-sm font-bold text-[var(--foreground)]">
              {user?.email || "No email"}
            </p>
          </div>

          <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Approved Notes
            </p>
            <p className="mt-2 text-3xl font-black text-green-500">
              {approvedNotes.length}
            </p>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionEyebrow icon={<Sparkles size={15} />}>
              Shortcuts
            </SectionEyebrow>
            <h2 className="mt-2 text-2xl font-black">Quick Actions</h2>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Manage your study material.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <QuickAction
            href="/my-notes"
            label="My Notes"
            description="Manage your uploads"
            icon={<BookOpen size={20} />}
          />
          <QuickAction
            href="/saved-notes"
            label="Saved Notes"
            description="Open your saved material"
            icon={<Heart size={20} />}
          />
          <QuickAction
            href="/upload"
            label="Upload Notes"
            description="Share new study material"
            icon={<UploadCloud size={20} />}
          />
        </div>
      </section>

      {/* Note lists */}
      <section className="grid gap-5 xl:grid-cols-2">
        <NotesPanel
          title="Top Notes"
          subtitle="Ranked by downloads, likes and views"
          icon={<Award size={15} />}
          notes={topNotes}
          emptyText="Your top notes will appear here."
        />

        <NotesPanel
          title="Latest Uploads"
          subtitle="Recently uploaded study material"
          icon={<Sparkles size={15} />}
          notes={latestNotes}
          emptyText="Your latest uploads will appear here."
        />
      </section>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-black tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
    </div>
  );
}

function SectionEyebrow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-500">
      {icon}
      {children}
    </p>
  );
}

function Badge({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-bold text-[var(--muted-strong)]">
      {icon}
      {text}
    </span>
  );
}

function ProfileCard({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="group min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/5 sm:p-5"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 transition group-hover:bg-red-500 group-hover:text-white">
        {icon}
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 break-words text-3xl font-black tabular-nums">
        {value.toLocaleString()}
      </p>
      <div className="mt-3 flex items-center gap-1 text-xs font-bold text-red-500 opacity-80">
        View details <ArrowRight size={13} />
      </div>
    </Link>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
        {icon}
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 break-words text-3xl font-black tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function QuickAction({
  href,
  label,
  description,
  icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 transition hover:border-red-500/40 hover:bg-[var(--surface-hover)] sm:p-5"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 transition group-hover:bg-red-500 group-hover:text-white">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-black">{label}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
      </div>
      <ArrowRight
        size={18}
        className="shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-red-500"
      />
    </Link>
  );
}

function NotesPanel({
  title,
  subtitle,
  icon,
  notes,
  emptyText,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  notes: CreatorNote[];
  emptyText: string;
}) {
  return (
    <div className="min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
      <SectionEyebrow icon={icon}>Creator Notes</SectionEyebrow>
      <h2 className="mt-2 text-2xl font-black">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>

      <div className="mt-5 space-y-3">
        {notes.length > 0 ? (
          notes.map((note) => <NoteRow key={note.id} note={note} />)
        ) : (
          <EmptyBox text={emptyText} />
        )}
      </div>
    </div>
  );
}

function NoteRow({ note }: { note: CreatorNote }) {
  return (
    <Link
      href={`/notes/${note.id}`}
      className="group block min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 transition hover:border-red-500/40 hover:bg-[var(--surface-hover)] sm:p-5"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <BookOpen size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-500">
              {note.subject || "General"}
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-2.5 py-1 text-[10px] font-bold capitalize text-[var(--muted)]">
              {note.status || "pending"}
            </span>
          </div>

          <h3 className="line-clamp-2 text-base font-black text-[var(--foreground)] transition group-hover:text-red-500">
            {note.title || "Untitled Note"}
          </h3>

          <p className="mt-1 line-clamp-1 text-xs text-[var(--muted)]">
            {note.topic || note.description || "No description"}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <Download size={14} />
              {getDownloads(note).toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5">
              <Heart size={14} />
              {getNumber(note.likes).toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye size={14} />
              {getNumber(note.views).toLocaleString()}
            </span>
          </div>
        </div>

        <ArrowRight
          size={17}
          className="mt-1 shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-red-500"
        />
      </div>
    </Link>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-6 text-sm leading-6 text-[var(--muted)]">
      {text}
    </div>
  );
}

function getNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function getDownloads(note: CreatorNote) {
  return getNumber(note.downloads) || getNumber(note.downloadsCount);
}

function getCreatorScore(note: CreatorNote) {
  return (
    getDownloads(note) * 3 +
    getNumber(note.likes) * 2 +
    getNumber(note.views)
  );
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

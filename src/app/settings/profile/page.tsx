
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { updateCreatorStats } from "@/lib/updateCreatorStats";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { db, storage } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";

type UserProfile = {
  displayName: string;
  bio: string;
  occupation: string;
  avatarUrl: string;
};

const initialProfile: UserProfile = {
  displayName: "",
  bio: "",
  occupation: "Student",
  avatarUrl: "",
};

export default function ProfileSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");

  const [profile, setProfile] = useState<UserProfile>(initialProfile);

  const previewUrl = localPreviewUrl || profile.avatarUrl;
  const isSaving = saving || uploadingAvatar;

  // Generate and clean up local image previews.
  useEffect(() => {
    if (!avatarFile) {
      setLocalPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(avatarFile);
    setLocalPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [avatarFile]);

  // Load profile.
  useEffect(() => {
    let active = true;

    async function fetchProfile() {
      if (!user) return;

      setFetching(true);

      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (!active) return;

        if (snap.exists()) {
          const data = snap.data() as Partial<UserProfile>;

          setProfile({
            displayName: data.displayName || user.displayName || "",
            bio: data.bio || "",
            occupation: data.occupation || "Student",
            avatarUrl: data.avatarUrl || "",
          });
        } else {
          setProfile({
            ...initialProfile,
            displayName: user.displayName || "",
          });
        }
      } catch (error) {
        console.error("PROFILE LOAD ERROR:", error);
        toast.error("Failed to load profile.");
      } finally {
        if (active) setFetching(false);
      }
    }

    if (!loading && !user) {
      router.replace("/signin");
    }

    if (user) {
      void fetchProfile();
    }

    return () => {
      active = false;
    };
  }, [user, loading, router]);

  function updateField<K extends keyof UserProfile>(
    field: K,
    value: UserProfile[K]
  ) {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleAvatarChange(file: File | null) {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG or WebP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile picture must be under 2 MB.");
      return;
    }

    setAvatarFile(file);
  }

  async function uploadAvatarIfSelected(): Promise<string> {
    if (!user || !avatarFile) return profile.avatarUrl;

    setUploadingAvatar(true);

    try {
      const safeName = avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const avatarPath = `avatars/${user.uid}/${Date.now()}-${safeName}`;
      const avatarRef = ref(storage, avatarPath);

      await uploadBytes(avatarRef, avatarFile);

      const avatarUrl = await getDownloadURL(avatarRef);

      return avatarUrl;
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    if (!user) return;

    if (!profile.displayName.trim()) {
      toast.error("Display name is required.");
      return;
    }

    if (avatarFile) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(avatarFile.type)) {
        toast.error("Choose a JPG, PNG or WebP image.");
        return;
      }

      if (avatarFile.size > 2 * 1024 * 1024) {
        toast.error("Profile picture must be under 2 MB.");
        return;
      }
    }

    try {
      setSaving(true);

      const finalAvatarUrl = await uploadAvatarIfSelected();

      await updateDoc(doc(db, "users", user.uid), {
        displayName: profile.displayName.trim(),
        name: profile.displayName.trim(),
        bio: profile.bio.trim(),
        occupation: profile.occupation.trim() || "Student",
        avatarUrl: finalAvatarUrl,
        photoURL: finalAvatarUrl,
      });

      try {
        await updateCreatorStats(user.uid);
      } catch (error) {
        console.warn("Creator stats refresh failed:", error);
      }

      toast.success("Profile updated successfully.");

      router.refresh();
      router.push("/profile");
    } catch (error) {
      console.error("PROFILE SAVE ERROR:", error);
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || fetching) {
    return (
      <main className="flex min-h-[75vh] items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)]">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] text-red-500 shadow-lg">
            <RefreshCw size={27} className="animate-spin" />
          </div>

          <h1 className="mt-5 text-xl font-black">
            Loading settings
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Preparing your profile editor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--background)] px-4 pb-32 pt-6 text-[var(--foreground)] sm:px-6 sm:pt-8 md:pb-10 lg:px-8">

      <div className="mx-auto max-w-6xl">

        {/* BACK NAVIGATION */}
        <Link
          href="/profile"
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-bold text-[var(--muted-strong)] transition hover:border-red-500/40 hover:text-red-600"
        >
          <ArrowLeft size={17} />
          Back to Profile
        </Link>

        {/* PAGE HEADER */}
        <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
              <UserRound size={14} />
              Account Settings
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Profile Settings
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              Manage your public identity on Edukrate. Update your
              profile picture, personal information and bio.
            </p>
          </div>
        </section>

        {/* EDITOR GRID */}
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">

          {/* MAIN EDITOR */}
          <section className="min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-7">

            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                <UserRound size={20} />
              </div>

              <div>
                <h2 className="text-lg font-black">
                  Personal Information
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  Edit how others see you.
                </p>
              </div>
            </div>

            {/* AVATAR SECTION */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-5 sm:p-6">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">

                <div className="relative shrink-0">
                  <UserAvatar
                    name={profile.displayName || "User"}
                    src={previewUrl}
                    size="xl"
                  />

                  <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-xl border-4 border-[var(--card-soft)] bg-red-600 text-white">
                    <Camera size={16} />
                  </span>
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-black">
                    Profile Picture
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    Choose a clear picture so other students can
                    recognize your profile.
                  </p>

                  <p className="mt-2 text-xs font-semibold text-[var(--muted)]">
                    JPG, PNG or WebP · Maximum 2 MB
                  </p>

                  <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-500">
                      <Camera size={16} />
                      Choose Image

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        aria-label="Choose profile picture"
                        className="sr-only"
                        onChange={(event) => {
                          handleAvatarChange(event.target.files?.[0] || null);
                          event.target.value = "";
                        }}
                      />
                    </label>

                    {avatarFile && (
                      <button
                        type="button"
                        onClick={() => setAvatarFile(null)}
                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-bold text-[var(--muted-strong)] transition hover:border-red-500/40 hover:text-red-600"
                      >
                        <X size={16} />
                        Remove
                      </button>
                    )}
                  </div>

                  {avatarFile && (
                    <p className="mt-3 truncate text-xs font-semibold text-[var(--muted)]">
                      Selected: {avatarFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* FORM FIELDS */}
            <div className="mt-7 space-y-6">

              <InputField
                label="Display Name"
                description="This name will be visible to other students."
                value={profile.displayName}
                onChange={(value) => updateField("displayName", value)}
                placeholder="Enter your name"
                required
              />

              <InputField
                label="Occupation"
                description="Your current role or what you do."
                value={profile.occupation}
                onChange={(value) => updateField("occupation", value)}
                placeholder="e.g. Student, Teacher"
              />

              <div>
                <label
                  htmlFor="profile-bio"
                  className="mb-2 block text-sm font-bold text-[var(--foreground)]"
                >
                  About You
                </label>

                <p className="mb-3 text-xs text-[var(--muted)]">
                  Introduce yourself to the Edukrate community.
                </p>

                <textarea
                  id="profile-bio"
                  value={profile.bio}
                  onChange={(event) =>
                    updateField("bio", event.target.value)
                  }
                  rows={5}
                  maxLength={500}
                  placeholder="Tell students about yourself, your class, interests or subjects..."
                  className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 text-sm leading-6 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
                />

                <div className="mt-2 flex justify-end">
                  <span className="text-xs font-medium text-[var(--muted)]">
                    {profile.bio.length}/500
                  </span>
                </div>
              </div>

              {/* DESKTOP SAVE */}
              <div className="hidden border-t border-[var(--border)] pt-6 md:flex md:items-center md:justify-between">
                <p className="text-xs text-[var(--muted)]">
                  Your changes will be reflected on your public profile.
                </p>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-red-600/15 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}

                  {isSaving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </div>
          </section>

          {/* RIGHT INFORMATION PANEL */}
          <aside className="space-y-5">

            {/* PROFILE TIPS */}
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
                  <CheckCircle2 size={22} />
                </div>

                <div>
                  <h3 className="font-black">
                    Profile Tips
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Build a recognizable profile.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <Tip
                  title="Use a recognizable name"
                  text="Choose a name that your classmates and other students can identify."
                />

                <Tip
                  title="Add a profile picture"
                  text="A clear picture makes your profile easier to recognize."
                />

                <Tip
                  title="Write a useful bio"
                  text="Mention your class, interests or the subjects you study."
                />

                <Tip
                  title="Keep your occupation updated"
                  text="Use a simple description such as Student or Teacher."
                />
              </div>
            </section>

            {/* PROFILE PREVIEW */}
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">
                Live Preview
              </p>

              <div className="mt-5 flex items-center gap-3">
                <UserAvatar
                  name={profile.displayName || "User"}
                  src={previewUrl}
                  size="md"
                />

                <div className="min-w-0">
                  <h3 className="truncate font-black">
                    {profile.displayName || "Your Name"}
                  </h3>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {profile.occupation || "Student"}
                  </p>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--muted-strong)]">
                {profile.bio || "Your bio will appear here."}
              </p>

              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <p className="text-xs font-semibold text-[var(--muted)]">
                  Edukrate Profile
                </p>
              </div>
            </section>

          </aside>
        </div>
      </div>

      {/* MOBILE SAVE BAR */}
      <div className="fixed inset-x-0 bottom-[76px] z-40 border-t border-[var(--border)] bg-[var(--background)] px-4 pb-3 pt-3 shadow-[0_-8px_25px_rgba(0,0,0,0.08)] md:hidden">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-black text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}

          {isSaving ? "Saving Changes..." : "Save Changes"}
        </button>
      </div>
    </main>
  );
}

// REUSABLE INPUT
function InputField({
  label,
  description,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        className="mb-2 block text-sm font-bold text-[var(--foreground)]"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {description && (
        <p className="mb-3 text-xs text-[var(--muted)]">
          {description}
        </p>
      )}

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
      />
    </div>
  );
}

// PROFILE TIP
function Tip({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600">
        <CheckCircle2 size={14} />
      </div>

      <div>
        <h4 className="text-sm font-bold">
          {title}
        </h4>

        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          {text}
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { toast } from "sonner";
import { Save, User } from "lucide-react";

import { db, storage } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";

type UserDoc = {
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
  bio?: string;
  occupation?: string;
  photoURL?: string;
  avatarUrl?: string;
};

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/signin");
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      setFetching(true);

      const snap = await getDoc(doc(db, "users", user.uid));

      if (snap.exists()) {
        const data = snap.data() as UserDoc;

        setName(data.name || data.displayName || user.displayName || "");
        setOccupation(data.occupation || "Student");
        setBio(data.bio || "");
        setPhotoURL(data.photoURL || data.avatarUrl || user.photoURL || "");
      } else {
        setName(user.displayName || "");
        setOccupation("Student");
        setBio("");
        setPhotoURL(user.photoURL || "");
      }

      setFetching(false);
    }

    if (user) fetchProfile();
  }, [user]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user) return;

    setSaving(true);

    try {
      let finalPhotoURL = photoURL;

      if (imageFile) {
        const imagePath = `avatars/${user.uid}/${Date.now()}-${imageFile.name}`;
        const imageRef = ref(storage, imagePath);

        await uploadBytes(imageRef, imageFile);

        finalPhotoURL = await getDownloadURL(imageRef);
      }

      await updateProfile(user, {
        displayName: name.trim(),
        photoURL: finalPhotoURL || null,
      });

      await setDoc(
        doc(db, "users", user.uid),
        {
          name: name.trim(),
          displayName: name.trim(),
          email: user.email || "",
          bio: bio.trim(),
          occupation: occupation.trim() || "Student",
          photoURL: finalPhotoURL,
          avatarUrl: finalPhotoURL,
          reputation: 0,
          weeklyReputation: 0,
          monthlyReputation: 0,
        },
        { merge: true }
      );

      toast.success("Profile updated successfully.");
      router.push("/profile");
    } catch (err) {
      console.error("PROFILE UPDATE ERROR:", err);
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || fetching) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center">
        <p className="font-medium text-white/60">Loading settings...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-[#0d0d0d] p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-300">
            <User size={28} />
          </div>

          <div>
            <h1 className="text-3xl font-semibold text-white">
              Edit Profile
            </h1>

            <p className="mt-1 text-sm text-white/50">
              Update your Edukrate profile details.
            </p>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSave}
        className="rounded-[2rem] border border-white/10 bg-[#0d0d0d] p-6 sm:p-8"
      >
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">
              Full Name
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="nw-input"
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">
              Role / Occupation
            </label>

            <input
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className="nw-input"
              placeholder="Student, Founder, Teacher..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">
              Bio
            </label>

            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="nw-input min-h-[120px] resize-none"
              placeholder="Write something about yourself..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">
              Profile Image
            </label>

            <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt="Profile preview"
                    className="h-20 w-20 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 text-red-300">
                    <User size={34} />
                  </div>
                )}

                <div className="flex-1">
                  <input
                    title="Upload profile image"
                    aria-label="Upload profile image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setImageFile(file);

                      if (file) {
                        setPhotoURL(URL.createObjectURL(file));
                      }
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70 file:mr-4 file:rounded-xl file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-red-500"
                  />

                  <p className="mt-2 text-xs text-white/40">
                    Upload JPG, PNG or WebP image.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-4 text-sm text-white/60">
            Complete your profile to help other students recognize and trust your uploads.
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full text-base"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </main>
  );
}
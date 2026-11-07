
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { db } from "@/firebase/firebase";
import UserAvatar from "@/components/UserAvatar";

type FollowingUser = {
  id: string;
  followingId: string;
  followingName: string;
  followingAvatar?: string;
};

export default function FollowingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFollowing() {
      if (!id) return;

      try {
        setLoading(true);

        const q = query(
          collection(db, "follows"),
          where("followerId", "==", id)
        );

        const snap = await getDocs(q);

        const data: FollowingUser[] = await Promise.all(
          snap.docs.map(async (followDoc) => {
            const followData = followDoc.data();
            const followingId = followData.followingId;

            const userSnap = await getDoc(doc(db, "users", followingId));

            if (userSnap.exists()) {
              const userData = userSnap.data();

              return {
                id: followDoc.id,
                followingId,
                followingName:
                  userData.displayName ||
                  userData.name ||
                  followData.followingName ||
                  "Edukrate User",
                followingAvatar:
                  userData.avatarUrl || userData.photoURL || "",
              };
            }

            return {
              id: followDoc.id,
              followingId,
              followingName:
                followData.followingName || "Edukrate User",
              followingAvatar: "",
            };
          })
        );

        setFollowing(data);
      } catch (err) {
        console.error("FOLLOWING ERROR:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchFollowing();
  }, [id]);

  if (loading) {
    return (
      <main className="flex min-h-[75vh] w-full items-center justify-center px-4 text-[var(--foreground)]">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--card)]">
            <RefreshCw
              className="animate-spin text-red-500"
              size={30}
            />
          </div>

          <h1 className="mt-5 text-xl font-black">
            Loading following
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Fetching contributors this user follows...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-w-0 overflow-x-hidden px-1 py-3 text-[var(--foreground)] sm:px-2 lg:px-3">
      <div className="w-full min-w-0 pb-28 md:pb-10">
        {/* Back navigation */}
        <button
          onClick={() => router.back()}
          className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-bold text-[var(--muted-strong)] transition hover:border-red-500/30 hover:text-red-500"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Hero section */}
        <section className="relative isolate overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.15),transparent_50%)]" />

          <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />

          <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:p-9">
            <div className="flex min-w-0 items-center gap-4 sm:gap-6">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500 sm:h-20 sm:w-20 sm:rounded-3xl">
                <UserRoundCheck size={34} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">
                  Student Network
                </p>

                <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                  Following
                </h1>

                <p className="mt-2 text-sm text-[var(--muted)] sm:text-base">
                  Contributors followed by this user.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 sm:min-w-48 sm:p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                <UserRoundCheck size={23} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Total Following
                </p>
                <p className="mt-1 text-3xl font-black tabular-nums">
                  {following.length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Following list */}
        <section className="mt-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-500">
                Community
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Following Contributors
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Open a profile to view more details.
              </p>
            </div>

            <span className="w-fit rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-bold text-[var(--muted-strong)]">
              {following.length}{" "}
              {following.length === 1 ? "Person" : "People"}
            </span>
          </div>

          {following.length === 0 ? (
            <section className="mt-5 flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-red-500/20 bg-red-500/10 text-red-500">
                <UserRound size={38} />
              </div>

              <h2 className="mt-6 text-2xl font-black">
                Not following anyone yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[var(--muted)]">
                Contributors followed by this user will appear here.
              </p>
            </section>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {following.map((item) => (
                <Link
                  key={item.id}
                  href={`/profile/${item.followingId}`}
                  className="group flex min-w-0 items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/5 sm:p-5"
                >
                  <div className="shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-1">
                    <UserAvatar
                      name={item.followingName}
                      src={item.followingAvatar || ""}
                      size="md"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-black text-[var(--foreground)] transition group-hover:text-red-500 sm:text-lg">
                      {item.followingName}
                    </h3>

                    <p className="mt-1 text-xs font-semibold text-[var(--muted)] sm:text-sm">
                      Edukrate Member
                    </p>

                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-red-500">
                      View Profile
                      <ArrowRight
                        size={14}
                        className="transition group-hover:translate-x-1"
                      />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

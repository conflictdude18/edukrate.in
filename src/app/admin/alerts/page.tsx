
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Megaphone,
  RefreshCw,
  Send,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  addDoc,
  collection,
  getDoc,
  getDocs,
  serverTimestamp,
  doc,
} from "firebase/firestore";
import { toast } from "sonner";

import { db } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

type UserDoc = {
  id: string;
  email?: string;
  displayName?: string;
  role?: string;
};

export default function AdminAlertsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [sending, setSending] = useState(false);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("/notifications");

  useEffect(() => {
    async function checkAdmin() {
      if (loading) return;

      if (!user) {
        router.push("/signin");
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const role = userSnap.data()?.role;

        if (role !== "admin") {
          router.push("/dashboard");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("ADMIN CHECK ERROR:", error);
        router.push("/dashboard");
      } finally {
        setCheckingAdmin(false);
      }
    }

    checkAdmin();
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchUsers() {
      if (!isAdmin) return;

      try {
        const usersSnap = await getDocs(collection(db, "users"));

        setUsers(
          usersSnap.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<UserDoc, "id">),
          }))
        );
      } catch (error) {
        console.error("FETCH USERS ERROR:", error);
        toast.error("Could not fetch users.");
      }
    }

    fetchUsers();
  }, [isAdmin]);

  const validUsers = useMemo(() => users.filter((item) => item.id), [users]);

  async function sendAlert() {
    if (!title.trim()) {
      toast.error("Enter alert title.");
      return;
    }

    if (!message.trim()) {
      toast.error("Enter alert message.");
      return;
    }

    if (validUsers.length === 0) {
      toast.error("No users found.");
      return;
    }

    setSending(true);

    try {
      await Promise.all(
        validUsers.map((item) =>
          addDoc(collection(db, "notifications"), {
            userId: item.id,
            type: "admin",
            title: title.trim(),
            message: message.trim(),
            link: link.trim() || "/notifications",
            read: false,
            createdAt: serverTimestamp(),
          })
        )
      );

      toast.success(`Alert sent to ${validUsers.length} users.`);
      setTitle("");
      setMessage("");
      setLink("/notifications");
    } catch (error) {
      console.error("SEND ADMIN ALERT ERROR:", error);
      toast.error("Failed to send alert.");
    } finally {
      setSending(false);
    }
  }

  if (loading || checkingAdmin) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-5 pb-28 text-white md:pb-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7 lg:p-8">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-red-500/20 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-black text-red-300">
              <ShieldAlert size={15} />
              Admin Alerts
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
              Send platform update
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
              Send important announcements to all Edukrate users through
              their notification page.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
            <p className="text-xs font-bold text-white/45">Recipients</p>
            <p className="mt-1 text-2xl font-black">{validUsers.length}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-300">
              <Megaphone size={22} />
            </div>

            <div>
              <h2 className="text-xl font-black">Create alert</h2>
              <p className="text-sm text-white/45">
                This will appear as an admin notification.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-white/70">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: New feature launched"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-red-500/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-white/70">Message</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write the update users should see..."
                rows={6}
                className="resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-semibold leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-red-500/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-white/70">
                Link after opening
              </span>
              <input
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="/notifications"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-red-500/40"
              />
            </label>

            <button
              type="button"
              onClick={sendAlert}
              disabled={sending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Alert
                </>
              )}
            </button>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-300">
                <Users size={22} />
              </div>

              <div>
                <h3 className="font-black">Audience</h3>
                <p className="text-sm text-white/45">All registered users</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-bold text-white/45">Total users</p>
              <p className="mt-2 text-3xl font-black">{validUsers.length}</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-green-500/20 bg-green-500/5 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-black text-green-300">
              <CheckCircle2 size={18} />
              Admin only
            </div>

            <p className="mt-3 text-sm leading-6 text-white/55">
              This page is protected by checking the current user role from the
              users collection.
            </p>
          </div>

          <div className="rounded-[2rem] border border-red-500/20 bg-red-500/5 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-black text-red-300">
              <Bell size={18} />
              Tip
            </div>

            <p className="mt-3 text-sm leading-6 text-white/55">
              Keep admin alerts short and useful so students do not ignore
              future updates.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

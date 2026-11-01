
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  Inbox,
  Megaphone,
  UserPlus,
  UploadCloud,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Mail,
  MailOpen,
  Sparkles,
} from "lucide-react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { toast } from "sonner";

import { db } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

type Notification = {
  id: string;
  userId: string;
  type: "follow" | "upload" | "approved" | "rejected" | "admin";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  };
};

type NotificationFilter = "all" | "unread" | "read";

function formatDate(notification: Notification) {
  if (!notification.createdAt?.seconds) return "Just now";

  const date = new Date(notification.createdAt.seconds * 1000);

  if (Number.isNaN(date.getTime())) return "Just now";

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return `Today · ${date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "follow":
      return <UserPlus size={20} />;
    case "upload":
      return <UploadCloud size={20} />;
    case "approved":
      return <CheckCircle2 size={20} />;
    case "rejected":
      return <XCircle size={20} />;
    case "admin":
      return <Megaphone size={20} />;
    default:
      return <Bell size={20} />;
  }
}

function getNotificationLabel(type: Notification["type"]) {
  switch (type) {
    case "follow":
      return "New follower";
    case "upload":
      return "Upload activity";
    case "approved":
      return "Note approved";
    case "rejected":
      return "Note update";
    case "admin":
      return "Announcement";
    default:
      return "Notification";
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(false);
  const [actionIds, setActionIds] = useState<string[]>([]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/signin");
      return;
    }

    setFetching(true);

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as Notification[];

        setNotifications(data);
        setFetching(false);
      },
      (error) => {
        console.error("NOTIFICATIONS FETCH ERROR:", error);
        toast.error("Failed to load notifications.");
        setFetching(false);
      }
    );

    return () => unsubscribe();
  }, [user, loading, router]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const readCount = notifications.length - unreadCount;

  const adminCount = useMemo(
    () => notifications.filter((item) => item.type === "admin").length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    const q = search.trim().toLowerCase();

    return notifications.filter((item) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && !item.read) ||
        (filter === "read" && item.read);

      const matchesSearch =
        !q ||
        `${item.title} ${item.message} ${item.type}`
          .toLowerCase()
          .includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [notifications, filter, search]);

  async function markAsRead(id: string) {
    if (actionIds.includes(id)) return;

    setActionIds((current) => [...current, id]);

    try {
      await updateDoc(doc(db, "notifications", id), {
        read: true,
      });
    } catch (error) {
      console.error("MARK READ ERROR:", error);
      toast.error("Could not update notification.");
    } finally {
      setActionIds((current) => current.filter((item) => item !== id));
    }
  }

  async function markAllAsRead() {
    const unread = notifications.filter((item) => !item.read);

    if (unread.length === 0 || updating) return;

    setUpdating(true);

    try {
      const results = await Promise.allSettled(
        unread.map((item) =>
          updateDoc(doc(db, "notifications", item.id), {
            read: true,
          })
        )
      );

      const failed = results.filter(
        (result) => result.status === "rejected"
      ).length;

      if (failed === 0) {
        toast.success("All notifications marked as read.");
      } else {
        toast.error(`${failed} notification(s) could not be updated.`);
      }
    } catch (error) {
      console.error("MARK ALL READ ERROR:", error);
      toast.error("Failed to update notifications.");
    } finally {
      setUpdating(false);
    }
  }

  if (loading || fetching) {
    return <LoadingSpinner />;
  }

  return (
    <main className="w-full min-w-0 space-y-5 overflow-x-hidden bg-[var(--background)] px-1 py-5 pb-28 text-[var(--foreground)] sm:px-2 lg:px-3 md:pb-10">

      {/* HEADER */}
      <section className="relative overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-xl sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-red-500/[0.11] blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-orange-500/[0.06] blur-[80px]" />

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-300">
              <Bell size={15} />
              Notification Center
            </div>

            {unreadCount > 0 && (
              <div className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-300">
                {unreadCount} unread
              </div>
            )}
          </div>

          <div className="mt-7 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Your Notifications<span className="text-red-500">.</span>
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Keep up with followers, note activity, approvals and important
                Edukrate announcements.
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={updating}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300"
              >
                {updating ? (
                  <RefreshCw size={17} className="animate-spin" />
                ) : (
                  <CheckCheck size={17} />
                )}
                Mark all as read
              </button>
            )}
          </div>
        </div>
      </section>

      {/* STATISTICS */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          label="Total Notifications"
          value={notifications.length}
          icon={<Bell size={19} />}
        />
        <MiniStat
          label="Unread"
          value={unreadCount}
          icon={<Mail size={19} />}
          accent="red"
        />
        <MiniStat
          label="Read"
          value={readCount}
          icon={<MailOpen size={19} />}
        />
        <MiniStat
          label="Admin Updates"
          value={adminCount}
          icon={<Megaphone size={19} />}
        />
      </section>

      {/* NOTIFICATION WORKSPACE */}
      <section className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--panel)] shadow-xl">

        {/* TOOLBAR */}
        <div className="border-b border-[var(--border)] p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Inbox size={20} className="text-red-500" />
                <h2 className="text-xl font-black sm:text-2xl">
                  Activity Inbox
                </h2>
              </div>

              <p className="mt-1 text-xs text-[var(--muted)] sm:text-sm">
                {filteredNotifications.length} of {notifications.length} notifications
              </p>
            </div>

            <div className="relative w-full xl:max-w-[350px]">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-background)] py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-red-500/60"
              />
            </div>
          </div>

          {/* FILTERS */}
          <div className="mt-5 flex flex-wrap gap-2">
            {([
              ["all", "All", notifications.length],
              ["unread", "Unread", unreadCount],
              ["read", "Read", readCount],
            ] as [NotificationFilter, string, number][]).map(
              ([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                    filter === key
                      ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300"
                      : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-strong)] hover:border-red-500/30"
                  }`}
                >
                  {label}
                  <span className="ml-2 opacity-60">{count}</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* NOTIFICATION LIST */}
        {filteredNotifications.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card-soft)]">
              {notifications.length === 0 ? (
                <Inbox size={30} className="text-[var(--muted)]" />
              ) : (
                <Search size={28} className="text-[var(--muted)]" />
              )}
            </div>

            <h3 className="mt-5 text-xl font-black">
              {notifications.length === 0
                ? "No notifications yet"
                : "No matching notifications"}
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              {notifications.length === 0
                ? "When someone follows you, your notes receive an update, or there is an important announcement, it will appear here."
                : "Try changing your search or selecting another notification filter."}
            </p>

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-500/15 dark:text-red-300"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-3 sm:p-4">
            {filteredNotifications.map((item) => {
              const isBusy = actionIds.includes(item.id);

              return (
                <article
                  key={item.id}
                  className={`group relative min-w-0 overflow-hidden rounded-2xl border p-4 transition sm:p-5 ${
                    item.read
                      ? "border-[var(--border)] bg-[var(--card)] hover:border-red-500/20"
                      : "border-red-500/25 bg-red-500/[0.055] hover:border-red-500/40"
                  }`}
                >
                  {!item.read && (
                    <div className="absolute bottom-0 left-0 top-0 w-1 bg-red-500" />
                  )}

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                          item.read
                            ? "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-strong)]"
                            : "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300"
                        }`}
                      >
                        {getNotificationIcon(item.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
                            {getNotificationLabel(item.type)}
                          </span>

                          {!item.read && (
                            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                              New
                            </span>
                          )}
                        </div>

                        <h3 className="mt-1 break-words text-base font-black text-[var(--foreground)] sm:text-lg">
                          {item.title}
                        </h3>

                        <p className="mt-1 break-words text-sm leading-6 text-[var(--muted-strong)]">
                          {item.message}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted)]">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={13} />
                            {formatDate(item)}
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            {item.read ? (
                              <CheckCircle2 size={13} />
                            ) : (
                              <Sparkles size={13} />
                            )}
                            {item.read ? "Already read" : "Awaiting attention"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                      {!item.read && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => markAsRead(item.id)}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2 text-xs font-bold text-[var(--muted-strong)] transition hover:border-red-500/30 hover:text-[var(--foreground)] disabled:opacity-40"
                        >
                          {isBusy ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <CheckCheck size={14} />
                          )}
                          Mark read
                        </button>
                      )}

                      <Link
                        href={item.link || "/notifications"}
                        onClick={() => {
                          if (!item.read) {
                            void markAsRead(item.id);
                          }
                        }}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white transition hover:bg-red-500"
                      >
                        Open
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* FOOTER */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-xs text-[var(--muted)] sm:px-6">
          <span>
            Showing {filteredNotifications.length} notification
            {filteredNotifications.length === 1 ? "" : "s"}
          </span>
          <span>Edukrate · Notification Center</span>
        </div>
      </section>
    </main>
  );
}

/* STAT CARD */

function MiniStat({
  label,
  value,
  icon,
  accent = "neutral",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: "neutral" | "red";
}) {
  const isActive = accent === "red";

  return (
    <div
      className={`rounded-[20px] border p-4 shadow-lg transition sm:p-5 ${
        isActive
          ? "border-red-500/20 bg-red-500/[0.055]"
          : "border-[var(--border)] bg-[var(--card)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
            isActive
              ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300"
              : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-strong)]"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

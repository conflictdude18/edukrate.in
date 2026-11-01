"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import {
  ArrowLeft,
  Ban,
  Eye,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  UserCog,
  Users,
  AlertTriangle,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase/firebase";

type UserDoc = {
  id: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
  bio?: string;
  occupation?: string;
  photoURL?: string;
  avatarUrl?: string;
  strikes?: number;
  banned?: boolean;
  banReason?: string;
};

type UserFilter = "all" | "admin" | "banned" | "risky" | "normal";

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      if (!user) return;

      setChecking(true);

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data() as UserDoc | undefined;
        setIsAdmin(data?.role === "admin");
      } catch (err) {
        console.error("ADMIN CHECK ERROR:", err);
        toast.error("Failed to verify admin access.");
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    }

    if (!loading && !user) {
      router.replace("/signin");
      return;
    }

    if (!loading && user) checkAdmin();
  }, [user, loading, router]);

  async function fetchUsers() {
    setFetching(true);

    try {
      const snap = await getDocs(collection(db, "users"));

      const data: UserDoc[] = snap.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<UserDoc, "id">),
      }));

      data.sort((a, b) => {
        if (Boolean(a.banned) !== Boolean(b.banned)) {
          return a.banned ? -1 : 1;
        }
        return (b.strikes ?? 0) - (a.strikes ?? 0);
      });

      setUsers(data);
    } catch (err) {
      console.error("USERS FETCH ERROR:", err);
      toast.error("Failed to load users.");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  async function updateUser(
    targetUser: UserDoc,
    changes: Partial<UserDoc>,
    successMessage: string,
    errorMessage: string
  ) {
    if (actionUserId) return;

    setActionUserId(targetUser.id);

    try {
      await updateDoc(doc(db, "users", targetUser.id), changes);

      setUsers((current) =>
        current.map((item) =>
          item.id === targetUser.id ? { ...item, ...changes } : item
        )
      );

      toast.success(successMessage);
    } catch (err) {
      console.error("USER UPDATE ERROR:", err);
      toast.error(errorMessage);
    } finally {
      setActionUserId(null);
    }
  }

  async function banUser(targetUser: UserDoc) {
    if (targetUser.id === user?.uid || targetUser.role === "admin") return;

    const ok = confirm(
      `Ban ${targetUser.email || targetUser.name || "this user"} from uploading?`
    );
    if (!ok) return;

    await updateUser(
      targetUser,
      {
        banned: true,
        banReason: "Upload access blocked by admin.",
      },
      "User banned from uploading.",
      "Failed to ban user."
    );
  }

  async function unbanUser(targetUser: UserDoc) {
    await updateUser(
      targetUser,
      {
        banned: false,
        banReason: "",
      },
      "User unbanned.",
      "Failed to unban user."
    );
  }

  async function resetStrikes(targetUser: UserDoc) {
    const ok = confirm(
      `Reset strikes for ${targetUser.email || targetUser.name || "this user"}?`
    );
    if (!ok) return;

    await updateUser(
      targetUser,
      {
        strikes: 0,
        banned: false,
        banReason: "",
      },
      "Strikes reset successfully.",
      "Failed to reset strikes."
    );
  }

  async function makeAdmin(targetUser: UserDoc) {
    if (targetUser.banned) return;

    const ok = confirm(
      `Make ${targetUser.email || targetUser.name || "this user"} an admin?`
    );
    if (!ok) return;

    await updateUser(
      targetUser,
      { role: "admin" },
      "User promoted to admin.",
      "Failed to make admin."
    );
  }

  async function removeAdmin(targetUser: UserDoc) {
    if (targetUser.id === user?.uid) return;

    const ok = confirm(
      `Remove admin access from ${targetUser.email || targetUser.name || "this user"}?`
    );
    if (!ok) return;

    await updateUser(
      targetUser,
      { role: "user" },
      "Admin access removed.",
      "Failed to remove admin."
    );
  }

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((item) => item.role === "admin").length,
      banned: users.filter((item) => item.banned).length,
      risky: users.filter((item) => (item.strikes ?? 0) >= 3).length,
    }),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return users.filter((item) => {
      const name = item.name || item.displayName || "";
      const combined =
        `${name} ${item.email || ""} ${item.role || ""} ${item.occupation || ""} ${item.bio || ""}`.toLowerCase();

      const matchesSearch = !q || combined.includes(q);

      const matchesFilter =
        filter === "all" ||
        (filter === "admin" && item.role === "admin") ||
        (filter === "banned" && item.banned === true) ||
        (filter === "risky" && (item.strikes ?? 0) >= 3) ||
        (filter === "normal" &&
          !item.banned &&
          item.role !== "admin" &&
          (item.strikes ?? 0) < 3);

      return matchesSearch && matchesFilter;
    });
  }, [users, search, filter]);

  if (loading || checking) {
    return (
      <AccessState
        title="Checking Admin Access"
        text="Verifying permissions before opening user management."
      />
    );
  }

  if (!isAdmin) {
    return (
      <AccessState
        title="Access Denied"
        text="You do not have admin permission for this page."
        danger
      />
    );
  }

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[var(--background)] px-1 py-5 text-[var(--foreground)] sm:px-2 lg:px-3">
      <div className="mx-auto w-full space-y-5 pb-24 md:pb-10">
        <section className="relative overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-xl sm:p-7 lg:p-9">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-red-500/[0.10] blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-orange-500/[0.06] blur-[80px]" />

          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2.5 text-sm font-bold text-[var(--muted-strong)] transition hover:border-red-400/40 hover:text-[var(--foreground)]"
              >
                <ArrowLeft size={16} />
                Admin Dashboard
              </button>

              <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/[0.08] px-3 py-2 text-xs font-bold text-green-600 dark:text-green-300">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Admin Access Active
              </div>
            </div>

            <div className="mt-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-300">
                  <UserCog size={15} />
                  User Administration
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                  Manage Users<span className="text-red-500">.</span>
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                  Monitor account safety, manage upload restrictions, review
                  strikes, and control administrator access.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchUsers}
                disabled={fetching}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-5 py-3 text-sm font-bold text-[var(--foreground)] transition hover:border-red-400/40 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={fetching ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Total Users"
            value={stats.total}
            icon={<Users size={20} />}
            detail="All registered accounts"
          />
          <StatCard
            label="Administrators"
            value={stats.admins}
            icon={<ShieldCheck size={20} />}
            detail="Privileged accounts"
            accent="green"
          />
          <StatCard
            label="Banned Accounts"
            value={stats.banned}
            icon={<Ban size={20} />}
            detail="Upload access blocked"
            accent="red"
          />
          <StatCard
            label="High Strike Count"
            value={stats.risky}
            icon={<AlertTriangle size={20} />}
            detail="Three or more strikes"
            accent="yellow"
          />
        </section>

        <section className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--panel)] shadow-xl">
          <div className="border-b border-[var(--border)] p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-red-500" />
                  <h2 className="text-xl font-black sm:text-2xl">
                    User Directory
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)] sm:text-sm">
                  {filteredUsers.length} of {users.length} accounts displayed
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
                <div className="relative min-w-0 flex-1 sm:min-w-[280px] xl:w-[350px]">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, email, role..."
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-background)] py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-red-500/60"
                  />
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--input-background)] px-3">
                  <Filter size={16} className="shrink-0 text-[var(--muted)]" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as UserFilter)}
                    className="w-full bg-transparent py-3 text-sm font-semibold text-[var(--foreground)] outline-none sm:w-[150px]"
                  >
                    <option value="all">All Users</option>
                    <option value="admin">Admins</option>
                    <option value="banned">Banned</option>
                    <option value="risky">High Strikes</option>
                    <option value="normal">Regular Users</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {([
                ["all", "All Accounts", stats.total],
                ["admin", "Admins", stats.admins],
                ["banned", "Banned", stats.banned],
                ["risky", "High Strikes", stats.risky],
              ] as [UserFilter, string, number][]).map(
                ([key, label, count]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                      filter === key
                        ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300"
                        : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-strong)] hover:border-red-400/30"
                    }`}
                  >
                    {label}
                    <span className="ml-2 opacity-60">{count}</span>
                  </button>
                )
              )}
            </div>
          </div>

          {fetching ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm font-semibold text-[var(--muted)]">
                <RefreshCw size={19} className="animate-spin text-red-500" />
                Loading user directory...
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card-soft)]">
                <Users size={30} className="text-[var(--muted)]" />
              </div>
              <h3 className="mt-5 text-xl font-black">No users found</h3>
              <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">
                No accounts match your current search or filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-500/15 dark:text-red-300"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-3 sm:p-4 xl:grid-cols-2">
              {filteredUsers.map((item) => {
                const isBusy = actionUserId === item.id;
                const isSelf = item.id === user?.uid;
                const name =
                  item.name ||
                  item.displayName ||
                  item.email ||
                  "Edukrate User";
                const avatar = item.photoURL || item.avatarUrl;
                const strikes = item.strikes ?? 0;

                return (
                  <article
                    key={item.id}
                    className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:border-red-500/25 sm:p-5"
                  >
                    <div className="grid gap-4">
                      <div className="min-w-0">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] text-lg font-black text-red-500 sm:h-16 sm:w-16">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              name.charAt(0).toUpperCase()
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words text-lg font-black sm:text-xl">
                                {name}
                              </h3>
                              {isSelf && <Pill tone="blue">You</Pill>}
                              {item.role === "admin" && (
                                <Pill tone="green">Admin</Pill>
                              )}
                              {item.banned && (
                                <Pill tone="red">Banned</Pill>
                              )}
                              {strikes >= 3 && !item.banned && (
                                <Pill tone="yellow">High Strikes</Pill>
                              )}
                            </div>

                            <p className="mt-1 flex items-center gap-2 break-all text-xs text-[var(--muted)] sm:text-sm">
                              <Mail size={14} className="shrink-0" />
                              {item.email || "No email available"}
                            </p>

                            {item.occupation && (
                              <p className="mt-1 text-xs text-[var(--muted)]">
                                {item.occupation}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          <InfoBox
                            label="Strike Count"
                            value={String(strikes)}
                            warning={strikes >= 3}
                          />
                          <InfoBox
                            label="Account Role"
                            value={item.role || "user"}
                          />
                          <InfoBox
                            label="Account Status"
                            value={item.banned ? "Restricted" : "Active"}
                            success={!item.banned}
                            className="col-span-2 sm:col-span-1"
                          />
                        </div>

                        {item.banReason && item.banned && (
                          <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.07] p-3 text-xs leading-5 text-red-600 dark:text-red-300">
                            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                            <span>
                              <strong>Ban reason: </strong>
                              {item.banReason}
                            </span>
                          </div>
                        )}

                        {item.bio && (
                          <p className="mt-3 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                            {item.bio}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-2">
                        {item.banned ? (
                          <ActionButton
                            icon={<ShieldCheck size={16} />}
                            label="Unban User"
                            tone="green"
                            disabled={isBusy}
                            onClick={() => unbanUser(item)}
                          />
                        ) : (
                          <ActionButton
                            icon={<Ban size={16} />}
                            label="Ban Uploading"
                            tone="red"
                            disabled={isBusy || item.role === "admin" || isSelf}
                            onClick={() => banUser(item)}
                          />
                        )}

                        {item.role === "admin" ? (
                          <ActionButton
                            icon={<Shield size={16} />}
                            label="Remove Admin"
                            tone="yellow"
                            disabled={isBusy || isSelf}
                            onClick={() => removeAdmin(item)}
                          />
                        ) : (
                          <ActionButton
                            icon={<ShieldCheck size={16} />}
                            label="Make Admin"
                            tone="green"
                            disabled={isBusy || item.banned}
                            onClick={() => makeAdmin(item)}
                          />
                        )}

                        <ActionButton
                          icon={<RotateCcw size={16} />}
                          label="Reset Strikes"
                          disabled={isBusy || strikes === 0}
                          onClick={() => resetStrikes(item)}
                        />

                        <ActionButton
                          icon={<Eye size={16} />}
                          label="View Profile"
                          onClick={() => router.push(`/profile/${item.id}`)}
                        />
                      </div>

                      {isBusy && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-red-500">
                          <RefreshCw size={14} className="animate-spin" />
                          Updating account...
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-xs text-[var(--muted)] sm:px-6">
            <span>
              Showing {filteredUsers.length} account
              {filteredUsers.length === 1 ? "" : "s"}
            </span>
            <span>Edukrate Admin · User Management</span>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ACCESS STATE */

function AccessState({
  title,
  text,
  danger = false,
}: {
  title: string;
  text: string;
  danger?: boolean;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8 text-[var(--foreground)]">
      <section className="w-full max-w-md rounded-[26px] border border-[var(--border)] bg-[var(--panel)] p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
          <Shield size={32} className="text-red-500" />
        </div>
        <h1
          className={`mt-5 text-2xl font-black ${
            danger ? "text-red-500" : ""
          }`}
        >
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{text}</p>
      </section>
    </main>
  );
}

/* STAT CARD */

function StatCard({
  label,
  value,
  icon,
  detail,
  accent = "red",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  detail: string;
  accent?: "red" | "yellow" | "green";
}) {
  const iconStyle = {
    red: "border-red-500/20 bg-red-500/10 text-red-500",
    yellow: "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    green: "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400",
  };

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg transition hover:border-red-500/25 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--muted)] sm:text-sm">
            {label}
          </p>
          <p className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            {value}
          </p>
          <p className="mt-2 text-[10px] leading-4 text-[var(--muted)] sm:text-xs">
            {detail}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:h-11 sm:w-11 ${iconStyle[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* STATUS PILL */

function Pill({
  tone,
  children,
}: {
  tone: "green" | "red" | "yellow" | "blue";
  children: React.ReactNode;
}) {
  const styles = {
    green:
      "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-300",
    red: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300",
    yellow:
      "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

/* INFORMATION BOX */

function InfoBox({
  label,
  value,
  warning = false,
  success = false,
  className = "",
}: {
  label: string;
  value: string;
  warning?: boolean;
  success?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-3 ${className}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-black ${
          warning
            ? "text-yellow-600 dark:text-yellow-300"
            : success
              ? "text-green-600 dark:text-green-300"
              : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* ACTION BUTTON */

function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "red" | "green" | "yellow";
}) {
  const styles = {
    neutral:
      "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-strong)] hover:border-red-500/30 hover:text-[var(--foreground)]",
    red: "border-red-500/20 bg-red-500/[0.08] text-red-600 hover:bg-red-500/15 dark:text-red-300",
    green:
      "border-green-500/20 bg-green-500/[0.08] text-green-600 hover:bg-green-500/15 dark:text-green-300",
    yellow:
      "border-yellow-500/20 bg-yellow-500/[0.08] text-yellow-700 hover:bg-yellow-500/15 dark:text-yellow-300",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[43px] items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-extrabold transition sm:text-sm disabled:cursor-not-allowed disabled:opacity-30 ${styles[tone]}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
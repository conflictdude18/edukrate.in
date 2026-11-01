
"use client";

import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import {
  Bell,
  LibraryBig,
  FileText,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  PlaySquare,
  Plus,
  Shield,
  Sparkles,
  Sun,
  Trophy,
  User,
  Users,
  X,
} from "lucide-react";

import { auth, db } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";

type UserDoc = {
  role?: string;
};

type NavItem = {
  href: string;
  label: string;
  icon?: React.ElementType;
  badge?: number;
  special?: boolean;
};

type Theme = "light" | "dark";

function getCurrentTheme(): Theme {
  if (typeof document === "undefined") return "dark";

  return document.documentElement.dataset.theme === "light"
    ? "light"
    : "dark";
}

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(getCurrentTheme());

    const syncTheme = () => setTheme(getCurrentTheme());

    window.addEventListener("themechange", syncTheme);
    window.addEventListener("storage", syncTheme);

    return () => {
      window.removeEventListener("themechange", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (!cancelled) {
          setIsAdmin(
            snap.exists() && (snap.data() as UserDoc).role === "admin"
          );
        }
      } catch (error) {
        console.error("ADMIN CHECK ERROR:", error);
        if (!cancelled) setIsAdmin(false);
      }
    }

    void checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const unreadQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(
      unreadQuery,
      (snapshot) => setUnreadCount(snapshot.size),
      (error) => console.error("NOTIFICATION LISTENER ERROR:", error)
    );

    return () => unsubscribe();
  }, [user]);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";

    document.documentElement.dataset.theme = nextTheme;

    try {
      localStorage.setItem("noteswallah-theme", nextTheme);
    } catch {
      // Theme still applies to the current page.
    }

    setTheme(nextTheme);
    window.dispatchEvent(new Event("themechange"));
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      window.location.href = "/";
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
    }
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderIcon(item: NavItem, size = 28) {
    if (item.href === "/notique") {
      return (
        <span className="relative block h-6 w-6 overflow-hidden rounded-md">
          <Image
            src="/notique-icon.png"
            alt="Notique AI"
            fill
            sizes="24px"
            className="object-contain"
          />
        </span>
      );
    }

    const Icon = item.icon;
    if (!Icon) return null;

    return <Icon size={size} strokeWidth={2.15} />;
  }

  const mainLinks: NavItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/browse", label: "Browse", icon: LibraryBig },
    {
      href: user ? "/upload" : "/signin",
      label: "Upload",
      icon: Plus,
      special: true,
    },
    {
      href: user ? "/saved-notes" : "/signin",
      label: "Saved",
      icon: Heart,
    },
  ];

  const moreLinks: NavItem[] = user
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/videos", label: "Video Library", icon: PlaySquare },
        { href: "/creators", label: "Creators", icon: Trophy },
        { href: "/my-notes", label: "My Notes", icon: FileText },
        {
          href: "/notifications",
          label: "Notifications",
          icon: Bell,
          badge: unreadCount,
        },
        { href: "/following", label: "Following Feed", icon: Users },
        { href: "/followers", label: "Followers", icon: Users },
        { href: "/feedback", label: "Feedback", icon: MessageSquare },
        { href: "/notique", label: "Notique AI" },
        { href: "/profile", label: "Profile", icon: User },
        ...(isAdmin
          ? [
              { href: "/admin", label: "Admin", icon: Shield },
              {
                href: "/admin/alerts",
                label: "Admin Alerts",
                icon: Bell,
              },
            ]
          : []),
      ]
    : [
        { href: "/videos", label: "Video Library", icon: PlaySquare },
        { href: "/signin", label: "Sign In", icon: User },
        { href: "/signup", label: "Create Account", icon: Sparkles },
        { href: "/creators", label: "Creators", icon: Trophy },
      ];

  const hideBottomNav = pathname.startsWith("/notique");

  return (
    <>
      <style jsx global>{`
        @keyframes nw-mobile-feature-glow {
          0%, 100% {
            box-shadow: 0 0 10px var(--nw-glow-soft),
              0 0 19px var(--nw-glow-faint);
          }
          50% {
            box-shadow: 0 0 17px var(--nw-glow-strong),
              0 0 30px var(--nw-glow-soft);
          }
        }

        @keyframes nw-mobile-feature-shine {
          0% {
            transform: translateX(-160%) skewX(-20deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          45% {
            opacity: 1;
          }
          65%, 100% {
            transform: translateX(260%) skewX(-20deg);
            opacity: 0;
          }
        }

        .nw-mobile-featured {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          animation: nw-mobile-feature-glow 3.2s ease-in-out infinite;
          transition: background-color 180ms ease, border-color 180ms ease,
            box-shadow 180ms ease, transform 180ms ease;
        }

        .nw-mobile-featured::after {
          content: "";
          position: absolute;
          z-index: 0;
          top: -30%;
          bottom: -30%;
          left: 0;
          width: 38%;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            transparent,
            var(--nw-shine),
            transparent
          );
          animation: nw-mobile-feature-shine 4.5s ease-in-out infinite;
        }

        .nw-mobile-featured > * {
          position: relative;
          z-index: 1;
        }

        .nw-mobile-featured-active {
          border-color: var(--nw-active-border) !important;
          background: var(--nw-active-bg) !important;
          animation-duration: 2.2s;
        }

        .nw-mobile-video {
          --nw-glow-soft: rgb(245 158 11 / 0%);
          --nw-glow-faint: rgb(245 158 11 / 0%);
          --nw-glow-strong: rgb(245 158 11 / 0%);
          --nw-shine: rgb(255 255 255 / 48%);
          --nw-active-border: rgb(245 158 11 / 75%);
          --nw-active-bg: rgb(245 158 11 / 18%);
        }

        .nw-mobile-notique {
          --nw-glow-soft: rgb(139 92 246 / 0%);
          --nw-glow-faint: rgb(139 92 246 / 0%);
          --nw-glow-strong: rgb(139 92 246 / 0%);
          --nw-shine: rgb(255 255 255 / 48%);
          --nw-active-border: rgb(167 139 250 / 80%);
          --nw-active-bg: rgb(139 92 246 / 19%);
        }

        .nw-mobile-admin {
          --nw-glow-soft: rgb(220 38 38 / 0%);
          --nw-glow-faint: rgb(217 119 6 / 0%);
          --nw-glow-strong: rgb(220 38 38 / 0%);
          --nw-shine: rgb(255 255 255 / 55%);
          --nw-active-border: rgb(220 38 38 / 85%);
          --nw-active-bg: rgb(220 38 38 / 15%);
        }

        /* Light mode featured cards */
        html[data-theme="light"] .nw-mobile-video {
          --nw-glow-soft: rgb(217 119 6 / 0%);
          --nw-glow-faint: rgb(217 119 6 / 0%);
          --nw-glow-strong: rgb(180 83 9 / 0%);
          --nw-shine: rgb(180 83 9 / 32%);
          --nw-active-border: rgb(180 83 9 / 85%);
          --nw-active-bg: rgb(245 158 11 / 17%);
          border-color: rgb(217 119 6 / 48%);
          background: rgb(245 158 11 / 10%);
          color: #78350f;
        }

        html[data-theme="light"] .nw-mobile-notique {
          --nw-glow-soft: rgb(124 58 237 / 0%);
          --nw-glow-faint: rgb(124 58 237 / 0%);
          --nw-glow-strong: rgb(109 40 217 / 0%);
          --nw-shine: rgb(109 40 217 / 30%);
          --nw-active-border: rgb(109 40 217 / 75%);
          --nw-active-bg: rgb(139 92 246 / 16%);
          border-color: rgb(124 58 237 / 48%);
          background: rgb(139 92 246 / 12%);
          color: #4c1d95;
        }

        html[data-theme="light"] .nw-mobile-admin {
          --nw-glow-soft: rgb(220 38 38 / 0%);
          --nw-glow-faint: rgb(217 119 6 / 0%);
          --nw-glow-strong: rgb(185 28 28 / 0%);
          --nw-shine: rgb(185 28 28 / 28%);
          --nw-active-border: rgb(185 28 28 / 80%);
          --nw-active-bg: rgb(220 38 38 / 13%);
          border-color: rgb(220 38 38 / 48%);
          background: linear-gradient(
            110deg,
            rgb(220 38 38 / 10%),
            rgb(245 158 11 / 12%)
          );
          color: #991b1b;
        }

        /* Stronger light-mode shine */
        html[data-theme="light"] .nw-mobile-featured::after {
          width: 48%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgb(255 255 255 / 15%) 15%,
            rgb(255 255 255 / 95%) 50%,
            rgb(255 255 255 / 15%) 85%,
            transparent 100%
          );
          animation-duration: 2.8s;
        }

        html[data-theme="light"] .nw-mobile-video::after {
          background: linear-gradient(
            90deg,
            transparent,
            rgb(180 83 9 / 12%),
            rgb(255 255 255 / 95%),
            rgb(180 83 9 / 12%),
            transparent
          );
        }

        html[data-theme="light"] .nw-mobile-notique::after {
          background: linear-gradient(
            90deg,
            transparent,
            rgb(109 40 217 / 12%),
            rgb(255 255 255 / 95%),
            rgb(109 40 217 / 12%),
            transparent
          );
        }

        html[data-theme="light"] .nw-mobile-admin::after {
          background: linear-gradient(
            90deg,
            transparent,
            rgb(185 28 28 / 12%),
            rgb(255 255 255 / 95%),
            rgb(185 28 28 / 12%),
            transparent
          );
        }

        /* Badge base */
        .nw-mobile-badge {
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 5 !important;
          flex-shrink: 0;
          opacity: 1 !important;
          visibility: visible !important;
          white-space: nowrap;
          line-height: 1.2;
          isolation: isolate;
        }

        /* Explicit badge colors for light mode */
        html[data-theme="light"] .nw-mobile-badge,
        html[data-theme="light"] .nw-mobile-badge * {
          opacity: 1 !important;
          visibility: visible !important;
          -webkit-text-fill-color: currentColor !important;
        }

        html[data-theme="light"] .nw-mobile-badge-video {
          background: #fef3c7 !important;
          border: 1px solid #b45309 !important;
          color: #78350f !important;
        }

        html[data-theme="light"] .nw-mobile-badge-ai {
          background: #ede9fe !important;
          border: 1px solid #6d28d9 !important;
          color: #4c1d95 !important;
        }

        html[data-theme="light"] .nw-mobile-badge-admin {
          background: #fee2e2 !important;
          border: 1px solid #b91c1c !important;
          color: #991b1b !important;
        }

        html[data-theme="light"]
          .nw-mobile-notique.nw-mobile-featured-active,
        html[data-theme="light"]
          .nw-mobile-admin.nw-mobile-featured-active {
          box-shadow: 0 0 16px var(--nw-glow-soft),
            0 0 32px var(--nw-glow-faint);
        }

        @media (prefers-reduced-motion: reduce) {
          .nw-mobile-featured,
          .nw-mobile-featured::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {!hideBottomNav && open && (
        <section className="fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)] lg:hidden">
          <header className="border-b border-[var(--border)] px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight">Menu</h2>
                <p className="mt-0.5 text-xs font-medium text-[var(--muted)]">
                  Navigation, account and tools
                </p>
              </div>

              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)]"
              >
                <X size={21} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-3 py-4 pb-28">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="mb-4 flex min-h-[58px] w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-left transition hover:bg-[var(--card-soft)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
                {theme === "dark" ? <Sun size={21} /> : <Moon size={21} />}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  Switch your appearance
                </span>
              </span>

              <span
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  theme === "light" ? "bg-red-600" : "bg-zinc-500"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    theme === "light" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </span>
            </button>

            <div className="grid grid-cols-1 gap-2">
              {moreLinks.map((item) => {
                const active = isActive(item.href);
                const badge = typeof item.badge === "number" ? item.badge : 0;

                const isVideoLibrary = item.href === "/videos";
                const isNotique = item.href === "/notique";
                const isAdminLink = item.href === "/admin";
                const isFeatured =
                  isVideoLibrary || isNotique || isAdminLink;

                const featuredClass = isNotique
                  ? "nw-mobile-notique border-violet-500/40 bg-violet-500/[0.09] text-[var(--foreground)]"
                  : isAdminLink
                    ? "nw-mobile-admin border-red-500/40 bg-red-500/[0.09] text-[var(--foreground)]"
                    : "nw-mobile-video border-amber-500/40 bg-amber-500/[0.09] text-[var(--foreground)]";

                const featuredIconClass = isNotique
                  ? "bg-violet-500/15 text-violet-600 ring-1 ring-violet-500/25 dark:text-violet-300"
                  : isAdminLink
                    ? "bg-red-500/15 text-red-700 ring-1 ring-red-500/30 dark:text-red-300"
                    : "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/25 dark:text-amber-300";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex min-h-[62px] items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                      isFeatured
                        ? `nw-mobile-featured ${featuredClass} ${
                            active ? "nw-mobile-featured-active" : ""
                          }`
                        : active
                          ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
                          : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-strong)] hover:bg-[var(--card-soft)]"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        isFeatured
                          ? featuredIconClass
                          : active
                            ? "bg-red-500/10 text-red-600"
                            : "bg-[var(--card-soft)] text-[var(--muted-strong)]"
                      }`}
                    >
                      {renderIcon(item, 22)}
                    </span>

                    <span className="min-w-0 flex-1 text-sm font-bold">
                      {item.label}
                    </span>

                    {isVideoLibrary && (
                      <span className="nw-mobile-badge nw-mobile-badge-video rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide">
                        Videos
                      </span>
                    )}

                    {isNotique && (
                      <span className="nw-mobile-badge nw-mobile-badge-ai gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide">
                        <Sparkles size={10} />
                        AI
                      </span>
                    )}

                    {isAdminLink && (
                      <span className="nw-mobile-badge nw-mobile-badge-admin rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide">
                        Admin
                      </span>
                    )}

                    {!isFeatured && badge > 0 && (
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-[10px] font-black text-white">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {user && (
              <button
                type="button"
                aria-label="Logout"
                onClick={handleLogout}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-bold text-[var(--muted-strong)] transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-600"
              >
                <LogOut size={20} />
                Logout
              </button>
            )}
          </div>
        </section>
      )}

      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-[10000] border-t border-[var(--border)] bg-[var(--background)]/95 px-2 pb-2 pt-2 text-[var(--foreground)] backdrop-blur-xl lg:hidden">
          <div className="flex w-full items-end">
            {mainLinks.map((item) => {
              const active = !open && isActive(item.href);

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="relative flex h-[58px] w-1/5 shrink-0 flex-col items-center justify-center gap-1 rounded-xl"
                >
                  {active && !item.special && (
                    <span className="absolute top-0 h-1 w-8 rounded-full bg-red-500" />
                  )}

                  <span
                    className={
                      item.special
                        ? "flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-950/20"
                        : active
                          ? "flex h-8 w-8 items-center justify-center text-red-600"
                          : "flex h-8 w-8 items-center justify-center text-[var(--muted)]"
                    }
                  >
                    {renderIcon(item, item.special ? 28 : 25)}
                  </span>

                  {!item.special && (
                    <span
                      className={`text-[10px] font-black leading-none ${
                        active ? "text-red-600" : "text-[var(--muted)]"
                      }`}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}

            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen((previous) => !previous)}
              className="relative flex h-[58px] w-1/5 shrink-0 flex-col items-center justify-center gap-1 rounded-xl"
            >
              {unreadCount > 0 && !open && (
                <span className="absolute right-5 top-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}

              {open && (
                <span className="absolute top-0 h-1 w-8 rounded-full bg-red-500" />
              )}

              <span
                className={`flex h-8 w-8 items-center justify-center ${
                  open ? "text-red-600" : "text-[var(--muted)]"
                }`}
              >
                {open ? (
                  <X size={25} strokeWidth={2.4} />
                ) : (
                  <Menu size={25} strokeWidth={2.4} />
                )}
              </span>

              <span
                className={`text-[10px] font-black leading-none ${
                  open ? "text-red-600" : "text-[var(--muted)]"
                }`}
              >
                {open ? "Close" : "More"}
              </span>
            </button>
          </div>
        </nav>
      )}
    </>
  );
}

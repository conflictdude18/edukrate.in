
"use client";

import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  BookOpen,
  FileText,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  PlaySquare,
  PlusCircle,
  Shield,
  Sun,
  Trophy,
  Users,
  Sparkles,
} from "lucide-react";

import { auth, db } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";

type UserDoc = {
  role?: string;
};

type Section = "main" | "library" | "tools" | "account";

type NavItem = {
  href: string;
  label: string;
  icon?: React.ElementType;
  section: Section;
};

const baseLinks: NavItem[] = [
  { href: "/", label: "Home", icon: Home, section: "main" },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "main" },
  { href: "/browse", label: "Browse Notes", icon: BookOpen, section: "main" },
  { href: "/videos", label: "Video Library", icon: PlaySquare, section: "main" },
  { href: "/upload", label: "Upload Notes", icon: PlusCircle, section: "library" },
  { href: "/saved-notes", label: "Saved Notes", icon: Heart, section: "library" },
  { href: "/my-notes", label: "My Notes", icon: FileText, section: "library" },
  { href: "/notique", label: "Notique AI", section: "tools" },
  { href: "/creators", label: "Creators", icon: Trophy, section: "tools" },
  { href: "/notifications", label: "Notifications", icon: Bell, section: "account" },
  { href: "/following", label: "Following", icon: Users, section: "account" },
  { href: "/followers", label: "Followers", icon: Users, section: "account" },
  { href: "/feedback", label: "Feedback", icon: MessageSquare, section: "account" },
];

function readTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";

  return document.documentElement.dataset.theme === "light"
    ? "light"
    : "dark";
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    setTheme(readTheme());

    const syncTheme = () => setTheme(readTheme());

    window.addEventListener("storage", syncTheme);
    window.addEventListener("themechange", syncTheme);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("themechange", syncTheme);
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

        if (cancelled) return;

        setIsAdmin(
          snap.exists() && (snap.data() as UserDoc).role === "admin"
        );
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

  const links = useMemo<NavItem[]>(() => {
    if (!isAdmin) return baseLinks;

    return [
      ...baseLinks,
      {
        href: "/admin",
        label: "Admin",
        icon: Shield,
        section: "tools",
      },
    ];
  }, [isAdmin]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    document.documentElement.dataset.theme = nextTheme;

    try {
      localStorage.setItem("noteswallah-theme", nextTheme);
    } catch {
      // Theme still works for the current page if storage is unavailable.
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

  function renderIcon(item: NavItem) {
    if (item.href === "/notique") {
      return (
        <span className="relative block h-5 w-5 overflow-hidden rounded-md">
          <Image
            src="/notique-icon.png"
            alt="Notique AI"
            fill
            sizes="20px"
            className="object-contain"
          />
        </span>
      );
    }

    const Icon = item.icon;
    return Icon ? <Icon size={18} strokeWidth={2} /> : null;
  }

  function sectionLinks(section: Section) {
    return links.filter((item) => item.section === section);
  }

  return (
    <>
      <style jsx global>{`
        @keyframes nw-feature-glow {
          0%, 100% {
            box-shadow: 0 0 9px var(--nw-glow-soft),
              0 0 18px var(--nw-glow-faint);
          }
          50% {
            box-shadow: 0 0 15px var(--nw-glow-strong),
              0 0 28px var(--nw-glow-soft);
          }
        }

        @keyframes nw-feature-shine {
          0% {
            transform: translateX(-160%) skewX(-20deg);
            opacity: 0;
          }
          15% {
            opacity: 0.7;
          }
          45% {
            opacity: 0.7;
          }
          65%, 100% {
            transform: translateX(260%) skewX(-20deg);
            opacity: 0;
          }
        }

        .nw-featured-link {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          animation: nw-feature-glow 3.2s ease-in-out infinite;
          transition: background-color 180ms ease, border-color 180ms ease,
            box-shadow 180ms ease, transform 180ms ease;
        }

        .nw-featured-link::after {
          content: "";
          position: absolute;
          z-index: 0;
          top: -30%;
          bottom: -30%;
          left: 0;
          width: 32%;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            transparent,
            var(--nw-shine),
            transparent
          );
          animation: nw-feature-shine 4.5s ease-in-out infinite;
        }

        .nw-featured-link > * {
          position: relative;
          z-index: 1;
        }

        .nw-featured-link:hover {
          transform: translateY(-1px);
        }

        .nw-featured-link-active {
          border-color: var(--nw-active-border) !important;
          background: var(--nw-active-bg) !important;
          animation-duration: 2.2s;
        }

        .nw-featured-video {
          --nw-glow-soft: rgb(245 158 11 / 0%);
          --nw-glow-faint: rgb(245 158 11 / 0%);
          --nw-glow-strong: rgb(245 158 11 / 0%);
          --nw-shine: rgb(255 255 255 / 48%);
          --nw-active-border: rgb(245 158 11 / 75%);
          --nw-active-bg: rgb(245 158 11 / 18%);
        }

        .nw-featured-notique {
          --nw-glow-soft: rgb(139 92 246 / 0%);
          --nw-glow-faint: rgb(139 92 246 / 0%);
          --nw-glow-strong: rgb(139 92 246 / 0%);
          --nw-shine: rgb(255 255 255 / 48%);
          --nw-active-border: rgb(167 139 250 / 80%);
          --nw-active-bg: rgb(139 92 246 / 19%);
        }

        .nw-featured-admin {
          --nw-glow-soft: rgb(220 38 38 / 0%);
          --nw-glow-faint: rgb(217 119 6 / 0%);
          --nw-glow-strong: rgb(220 38 38 / 0%);
          --nw-shine: rgb(255 255 255 / 48%);
          --nw-active-border: rgb(220 38 38 / 80%);
          --nw-active-bg: rgb(220 38 38 / 16%);
        }

        /* Stronger, colored shine in light mode */
        html[data-theme="light"] .nw-featured-video {
          --nw-glow-soft: rgb(217 119 6 / 0%);
          --nw-glow-faint: rgb(217 119 6 / 0%);
          --nw-glow-strong: rgb(180 83 9 / 0%);
          --nw-shine: rgb(180 83 9 / 32%);
          --nw-active-border: rgb(180 83 9 / 85%);
          --nw-active-bg: rgb(245 158 11 / 17%);
          border-color: rgb(217 119 6 / 48%);
          background: rgb(245 158 11 / 10%);
          color: #78350f;
          box-shadow: 0 0 13px rgb(217 119 6 / 20%),
            0 0 25px rgb(217 119 6 / 12%);
        }

        html[data-theme="light"] .nw-featured-notique {
          --nw-glow-soft: rgb(124 58 237 / 0%);
          --nw-glow-faint: rgb(124 58 237 / 0%);
          --nw-glow-strong: rgb(109 40 217 / 0%);
          --nw-shine: rgb(109 40 217 / 30%);
          --nw-active-border: rgb(109 40 217 / 80%);
          --nw-active-bg: rgb(139 92 246 / 16%);
          border-color: rgb(124 58 237 / 50%);
          background: rgb(139 92 246 / 12%);
          color: #4c1d95;
          box-shadow: 0 0 13px rgb(124 58 237 / 25%),
            0 0 25px rgb(124 58 237 / 15%);
        }

        html[data-theme="light"] .nw-featured-admin {
          --nw-glow-soft: rgb(220 38 38 / 0%);
          --nw-glow-faint: rgb(217 119 6 / 0%);
          --nw-glow-strong: rgb(185 28 28 / 0%);
          --nw-shine: rgb(185 28 28 / 28%);
          --nw-active-border: rgb(185 28 28 / 80%);
          --nw-active-bg: rgb(220 38 38 / 13%);
          border-color: rgb(220 38 38 / 50%);
          background: linear-gradient(
            110deg,
            rgb(220 38 38 / 10%),
            rgb(245 158 11 / 12%)
          );
          color: #991b1b;
          box-shadow: 0 0 13px rgb(220 38 38 / 25%),
            0 0 25px rgb(217 119 6 / 16%);
        }

        html[data-theme="light"]
          .nw-featured-notique.nw-featured-link-active,
        html[data-theme="light"]
          .nw-featured-admin.nw-featured-link-active {
          box-shadow: 0 0 16px var(--nw-glow-soft),
            0 0 32px var(--nw-glow-faint);
        }

        html[data-theme="light"] .nw-badge-ai,
        html[data-theme="light"] .nw-badge-ai * {
          color: #4c1d95 !important;
          -webkit-text-fill-color: #4c1d95 !important;
        }

        html[data-theme="light"] .nw-badge-admin,
        html[data-theme="light"] .nw-badge-admin * {
          color: #991b1b !important;
          -webkit-text-fill-color: #991b1b !important;
        }

        html[data-theme="light"] .nw-badge-video,
        html[data-theme="light"] .nw-badge-video * {
          color: #78350f !important;
          -webkit-text-fill-color: #78350f !important;
        }

        @media (prefers-reduced-motion: reduce) {
          .nw-featured-link,
          .nw-featured-link::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[270px] flex-col border-r border-[var(--border)] bg-[var(--sidebar-background)] text-[var(--foreground)] lg:flex xl:w-[290px]">

      <div className="border-b border-[var(--border)] px-4 py-3">
        <Link
          href="/"
          aria-label="Edukrate home"
          className="flex h-[90px] w-full items-center justify-center"
        >
          <Image
            src={
              theme === "light"
                ? "/edukratelogowithname.png"
                : "/edukratelogowithnamewhite.png"
            }
            alt="Edukrate - Learn, Organize, Grow"
            width={900}
            height={225}
            priority
            className="h-full w-full max-w-[260px] object-contain"
          />
        </Link>
      </div>


        <nav className="no-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
          <SidebarSection title="Main">
            {sectionLinks("main").map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                unreadCount={unreadCount}
                renderIcon={renderIcon}
              />
            ))}
          </SidebarSection>

          <SidebarSection title="Library">
            {sectionLinks("library").map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                unreadCount={unreadCount}
                renderIcon={renderIcon}
              />
            ))}
          </SidebarSection>

          <SidebarSection title="Tools">
            {sectionLinks("tools").map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                unreadCount={unreadCount}
                renderIcon={renderIcon}
              />
            ))}
          </SidebarSection>

          <SidebarSection title="Account">
            {sectionLinks("account").map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                unreadCount={unreadCount}
                renderIcon={renderIcon}
              />
            ))}
          </SidebarSection>
        </nav>

        <div className="space-y-3 border-t border-[var(--border)] p-4">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--card-soft)]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--card-soft)] text-red-600">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </span>
            <span className="flex-1 text-left">
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>

          {!loading && user ? (
            <>
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 transition hover:bg-[var(--card-soft)]"
              >
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-red-500/10">
                  {user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt="Profile"
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-black">
                      {user.email?.charAt(0).toUpperCase() || "U"}
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {user.displayName || "Edukrate User"}
                  </span>
                  <span className="block truncate text-xs text-[var(--muted)]">
                    {user.email}
                  </span>
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-bold text-[var(--muted-strong)] transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-600"
              >
                <LogOut size={17} />
                Logout
              </button>
            </>
          ) : !loading ? (
            <div className="grid gap-3">
              <Link href="/signin" className="btn-secondary w-full">
                Sign In
              </Link>
              <Link href="/signup" className="btn-primary w-full">
                Sign Up
              </Link>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function SidebarLink({
  item,
  active,
  unreadCount,
  renderIcon,
}: {
  item: NavItem;
  active: boolean;
  unreadCount: number;
  renderIcon: (item: NavItem) => React.ReactNode;
}) {
  const isNotique = item.href === "/notique";
  const isVideoLibrary = item.href === "/videos";
  const isAdminLink = item.href === "/admin";
  const isFeatured = isNotique || isVideoLibrary || isAdminLink;

  const featuredClass = isNotique
    ? "nw-featured-notique border-violet-500/40 bg-violet-500/[0.09] text-[var(--foreground)]"
    : isAdminLink
      ? "nw-featured-admin border-red-500/40 bg-red-500/[0.09] text-[var(--foreground)]"
      : "nw-featured-video border-amber-500/40 bg-amber-500/[0.09] text-[var(--foreground)]";

  const iconClass = isNotique
    ? "bg-violet-500/15 text-violet-600 ring-1 ring-violet-500/25 dark:text-violet-300"
    : isAdminLink
      ? "bg-red-500/15 text-red-700 ring-1 ring-red-500/30 dark:text-red-300"
      : "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/25 dark:text-amber-300";

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
        isFeatured
          ? `nw-featured-link ${featuredClass} ${active ? "nw-featured-link-active" : ""}`
          : active
            ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
            : "border-transparent text-[var(--muted-strong)] hover:border-[var(--border)] hover:bg-[var(--surface-hover)]"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isFeatured
            ? iconClass
            : active
              ? "bg-red-500/10 text-red-600"
              : "bg-[var(--card-soft)] text-[var(--muted-strong)]"
        }`}
      >
        {renderIcon(item)}
      </span>

      <span className="min-w-0 flex-1 truncate">{item.label}</span>

      {isNotique && (
        <span className="nw-badge-ai flex items-center gap-1 rounded-full border border-violet-600/50 bg-violet-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide shadow-sm dark:border-violet-400/40 dark:bg-violet-500/20 dark:text-violet-200">
          <Sparkles size={10} />
          AI
        </span>
      )}

      {isVideoLibrary && (
        <span className="nw-badge-video rounded-full border border-amber-600/50 bg-amber-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide shadow-sm dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-200">
          Videos
        </span>
      )}

      {isAdminLink && (
        <span className="nw-badge-admin rounded-full border border-red-600/50 bg-red-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide shadow-sm dark:border-red-400/40 dark:bg-red-500/20 dark:text-red-200">
          Admin
        </span>
      )}

      {item.href === "/notifications" && unreadCount > 0 && (
        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

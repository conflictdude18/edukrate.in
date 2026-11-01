
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { Bell, Menu, X } from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";

type UserDoc = {
  role?: string;
};

export default function Navbar() {
  const { user, loading } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  async function handleLogout() {
    await signOut(auth);
    setOpen(false);
    window.location.href = "/";
  }

  useEffect(() => {
    let active = true;

    async function checkRole() {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (active) {
          setIsAdmin(
            snap.exists() &&
              (snap.data() as UserDoc).role === "admin"
          );
        }
      } catch (error) {
        console.error("ADMIN ROLE CHECK ERROR:", error);
        if (active) setIsAdmin(false);
      }
    }

    checkRole();

    return () => {
      active = false;
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
      (snap) => setUnreadCount(snap.size),
      (error) => console.error("REALTIME NOTIFICATIONS ERROR:", error)
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050505]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

          {/* BRAND */}
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/edukratelogowithname.png"
              alt="Edukrate"
              width={190}
              height={58}
              priority
              className="hidden h-11 w-auto object-contain sm:block"
            />

            <Image
              src="/edukratelogo.png"
              alt="Edukrate"
              width={48}
              height={48}
              priority
              className="h-10 w-10 object-contain sm:hidden"
            />
          </Link>

          {/* DESKTOP NAVIGATION */}
          <nav className="hidden items-center gap-5 text-sm font-semibold text-white/65 lg:flex">
            <DesktopLink href="/browse" label="Browse" />
            <DesktopLink href="/following" label="Following" />
            <DesktopLink href="/creators" label="Creators" />
            <DesktopLink href="/feedback" label="Feedback" />

            {user && (
              <>
                <DesktopLink href="/upload" label="Upload" />
                <DesktopLink href="/saved-notes" label="Saved" />
                <DesktopLink href="/my-notes" label="My Notes" />
                <DesktopLink href="/dashboard" label="Dashboard" />
                <DesktopLink href="/profile" label="Profile" />

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="font-black text-red-400 transition hover:text-red-300"
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* DESKTOP ACTIONS */}
          <div className="hidden items-center gap-3 lg:flex">
            {!loading && !user && (
              <>
                <Link
                  href="/signin"
                  className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/[0.08]"
                >
                  Sign In
                </Link>

                <Link
                  href="/signup"
                  className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-500"
                >
                  Sign Up
                </Link>
              </>
            )}

            {!loading && user && (
              <>
                <Link
                  href="/notifications"
                  className="relative rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Notifications"
                >
                  <Bell size={20} />

                  {unreadCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>

                <button
                  onClick={handleLogout}
                  className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-500"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            aria-label="Open Menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="relative rounded-xl border border-white/10 bg-white/5 p-2 text-white lg:hidden"
          >
            <Menu size={22} />

            {unreadCount > 0 && user && (
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-600" />
            )}
          </button>
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* MOBILE SIDEBAR */}
      <aside
        aria-label="Mobile navigation"
        className={`fixed left-0 top-0 z-50 h-dvh w-[86vw] max-w-[340px] overflow-y-auto border-r border-white/10 bg-[#0b0b0d] shadow-2xl shadow-black/40 transition-transform duration-300 ease-in-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <Image
            src="/edukratelogowithname.png"
            alt="Edukrate"
            width={175}
            height={54}
            className="h-10 w-auto object-contain"
          />

          <button
            aria-label="Close Menu"
            onClick={() => setOpen(false)}
            className="rounded-xl bg-white/10 p-2 text-white"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-2 p-4 text-sm font-bold text-white/70">
          <MobileLink href="/browse" label="Browse Notes" close={() => setOpen(false)} />
          <MobileLink href="/following" label="Following Feed" close={() => setOpen(false)} />
          <MobileLink href="/creators" label="Creators" close={() => setOpen(false)} />
          <MobileLink href="/feedback" label="Feedback" close={() => setOpen(false)} />

          {user && (
            <>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-2xl px-4 py-3 transition hover:bg-white/[0.06] hover:text-white"
              >
                Notifications

                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <MobileLink href="/upload" label="Upload" close={() => setOpen(false)} />
              <MobileLink href="/saved-notes" label="Saved Notes" close={() => setOpen(false)} />
              <MobileLink href="/my-notes" label="My Notes" close={() => setOpen(false)} />
              <MobileLink href="/dashboard" label="Dashboard" close={() => setOpen(false)} />
              <MobileLink href="/profile" label="Profile" close={() => setOpen(false)} />

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3 font-black text-red-400 transition hover:bg-red-500/10"
                >
                  Admin
                </Link>
              )}
            </>
          )}

          {!loading && !user && (
            <div className="mt-4 grid gap-3">
              <Link
                href="/signin"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center font-black text-white"
              >
                Sign In
              </Link>

              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="rounded-2xl bg-red-600 px-4 py-3 text-center font-black text-white"
              >
                Sign Up
              </Link>
            </div>
          )}

          {!loading && user && (
            <button
              onClick={handleLogout}
              className="mt-4 rounded-2xl bg-red-600 px-4 py-3 font-black text-white"
            >
              Logout
            </button>
          )}
        </nav>
      </aside>
    </>
  );
}

function DesktopLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="transition hover:text-white">
      {label}
    </Link>
  );
}

function MobileLink({
  href,
  label,
  close,
}: {
  href: string;
  label: string;
  close: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={close}
      className="rounded-2xl px-4 py-3 transition hover:bg-white/[0.06] hover:text-white"
    >
      {label}
    </Link>
  );
}

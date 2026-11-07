
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

import {
  Menu,
  X,
  User,
  Settings,
  Upload,
  Bookmark,
  LogOut,
  FileText,
} from "lucide-react";

import { signOut } from "firebase/auth";

import { auth } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await signOut(auth);
    setOpen(false);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-2xl">
      <div className="container-max flex h-16 items-center justify-between">

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

        {/* DESKTOP NAV */}
        <nav className="hidden items-center gap-7 lg:flex">
          <Link
            href="/browse"
            className="text-sm text-white/70 transition hover:text-white"
          >
            Browse
          </Link>

          <Link
            href="/trending"
            className="text-sm text-white/70 transition hover:text-white"
          >
            Trending
          </Link>

          <Link
            href="/upload"
            className="text-sm text-white/70 transition hover:text-white"
          >
            Upload
          </Link>

          <Link
            href="/saved"
            className="text-sm text-white/70 transition hover:text-white"
          >
            Saved
          </Link>

          <Link
            href="/feedback"
            className="text-sm text-white/70 transition hover:text-white"
          >
            Feedback
          </Link>
        </nav>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-3">
          {!user ? (
            <>
              <Link
                href="/signin"
                className="hidden rounded-2xl border border-white/10 bg-white/5 px-5 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white md:block"
              >
                Sign In
              </Link>

              <Link
                href="/signup"
                className="hidden rounded-2xl bg-red-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-500 md:block"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <div className="hidden items-center gap-3 md:flex">
              <Link
                href={`/profile/${user.uid}`}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white">
                  {user.displayName?.charAt(0).toUpperCase() || "U"}
                </div>

                <div className="text-left">
                  <p className="max-w-[120px] truncate text-sm font-medium">
                    {user.displayName || "User"}
                  </p>

                  <p className="text-xs text-white/40">
                    Contributor
                  </p>
                </div>
              </Link>

              <Link
                href="/settings/profile"
                className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/70 transition hover:bg-white/10 hover:text-white"
                title="Profile Settings"
              >
                <Settings size={18} />
              </Link>
            </div>
          )}

          {/* MOBILE BUTTON */}
          <button
            onClick={() => setOpen(!open)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
            title="Open Menu"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* MOBILE SIDEBAR */}
      <div
        className={`fixed top-0 right-0 z-50 h-screen w-[85%] max-w-sm transform border-l border-white/10 bg-black/95 p-6 backdrop-blur-2xl transition duration-300 lg:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Image
            src="/edukratelogowithname.png"
            alt="Edukrate"
            width={170}
            height={52}
            className="h-10 w-auto object-contain"
          />

          <button
            onClick={() => setOpen(false)}
            className="rounded-xl border border-white/10 bg-white/5 p-2"
            title="Close Menu"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* USER */}
        {user && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-lg font-bold">
                {user.displayName?.charAt(0).toUpperCase() || "U"}
              </div>

              <div>
                <p className="font-semibold">
                  {user.displayName || "User"}
                </p>

                <p className="text-sm text-white/40">
                  Edukrate Member
                </p>
              </div>
            </div>
          </div>
        )}

        {/* LINKS */}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/browse"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:bg-white/10"
          >
            <FileText size={18} />
            Browse Notes
          </Link>

          {user && (
            <>
              <Link
                href="/upload"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:bg-white/10"
              >
                <Upload size={18} />
                Upload Notes
              </Link>

              <Link
                href="/trending"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:bg-white/10"
              >
                <FileText size={18} />
                Trending Notes
              </Link>

              <Link
                href="/saved"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:bg-white/10"
              >
                <Bookmark size={18} />
                Saved Notes
              </Link>

              <Link
                href={`/profile/${user.uid}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:bg-white/10"
              >
                <User size={18} />
                My Profile
              </Link>

              <Link
                href="/settings/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:bg-white/10"
              >
                <Settings size={18} />
                Profile Settings
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-red-400 transition hover:bg-red-500/20"
              >
                <LogOut size={18} />
                Logout
              </button>
            </>
          )}

          {!user && (
            <>
              <Link
                href="/signin"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center transition hover:bg-white/10"
              >
                Sign In
              </Link>

              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="rounded-2xl bg-red-600 px-5 py-4 text-center font-medium transition hover:bg-red-500"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import Image from "next/image";

import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";

type Props = {
  children: ReactNode;
  fullScreen?: boolean;
};

type Theme = "light" | "dark";

function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";

  return document.documentElement.dataset.theme === "light"
    ? "light"
    : "dark";
}

export default function AppShell({
  children,
  fullScreen = false,
}: Props) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const syncTheme = () => {
      setTheme(getTheme());
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("themechange", syncTheme);
    window.addEventListener("storage", syncTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener("themechange", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  const logoSrc =
    theme === "light"
      ? "/edukratelogowithname.png"
      : "/edukratelogowithnamewhite.png";

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";

    document.documentElement.dataset.theme = nextTheme;

    try {
      localStorage.setItem("noteswallah-theme", nextTheme);
    } catch {
      // Theme remains active for this page.
    }

    setTheme(nextTheme);
    window.dispatchEvent(new Event("themechange"));
  }

  return (
    <div
      className={
        fullScreen
          ? "fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]"
          : "min-h-screen w-full overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]"
      }
    >
      <Sidebar />

      <main
        className={
          fullScreen
            ? "relative flex h-full min-h-0 w-full flex-col overflow-hidden lg:pl-[290px]"
            : "min-h-screen w-full min-w-0 pb-24 lg:pb-0 lg:pl-[290px]"
        }
      >
        {!fullScreen && (
          <>
            {/* MOBILE HEADER */}
            <header className="flex h-16 items-center justify-between border-b border-[var(--border)] px-4 sm:px-6 lg:hidden">
              <Link
                href="/"
                aria-label="Edukrate home"
                className="flex min-w-0 items-center -ml-4"
              >
                <Image
                  key={logoSrc}
                  src={logoSrc}
                  alt="Edukrate"
                  width={900}
                  height={225}
                  priority
                  className="h-15 w-auto max-w-[280px] object-contain object-left"
                />
              </Link>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${
                  theme === "dark" ? "light" : "dark"
                } mode`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] transition hover:bg-[var(--card-soft)]"
              >
                {theme === "dark" ? (
                  <Sun size={19} />
                ) : (
                  <Moon size={19} />
                )}
              </button>
            </header>

            <div className="w-full min-w-0 px-4 pb-6 pt-7 sm:px-6 lg:px-8 lg:pt-9 xl:px-10">
              {children}
            </div>
          </>
        )}

        {fullScreen && (
          <div className="flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden">
            {children}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
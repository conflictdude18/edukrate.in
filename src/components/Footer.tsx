"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  Mail,
  ArrowUpRight,
  Heart,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";

  return document.documentElement.dataset.theme === "light"
    ? "light"
    : "dark";
}

export default function Footer() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const syncTheme = () => setTheme(readTheme());

    syncTheme();

    const observer = new MutationObserver(syncTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("storage", syncTheme);
    window.addEventListener("themechange", syncTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("themechange", syncTheme);
    };
  }, []);

  const logoSrc =
    theme === "light"
      ? "/edukratelogowithname.png"
      : "/edukratelogowithnamewhite.png";

  return (
    <footer className="relative mt-0 overflow-hidden border-t border-[var(--border)] bg-[var(--background)]">

      {/* Ambient footer decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-red-600/[0.045] blur-[100px]" />
        <div className="absolute -right-32 top-0 h-64 w-64 rounded-full bg-red-500/[0.04] blur-[90px]" />
      </div>

      {/* ================= MOBILE FOOTER ================= */}
      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-5 py-7 text-center sm:px-8 lg:hidden">

        <Link href="/" aria-label="Edukrate home">
          <Image
            src={logoSrc}
            alt="Edukrate"
            width={900}
            height={225}
            priority
            className="h-14 w-auto object-contain"
          />
        </Link>

        <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--muted)]">
          Upload, discover and share useful study notes, PDFs
          and educational resources. Making learning easier,
          one resource at a time.
        </p>

        {/* Compact navigation */}
        {/* Mobile credits */}
        <div className="flex w-full flex-col items-center gap-2.5 border-t border-[var(--border)] pt-5">

          <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            Built with
            <Heart size={13} className="fill-red-500 text-red-500" />
            for learners
          </p>

          <p className="text-xs text-[var(--muted)]">
            Founded &amp; developed by{" "}
            <a
              href="https://instagram.com/imxanshul"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--foreground)] hover:text-[var(--primary)]"
            >
              Anshul Harish Chaware
            </a>
          </p>

          <p className="text-[11px] text-[var(--muted)]">
            © {new Date().getFullYear()} Edukrate. All rights reserved.
          </p>
        </div>
      </div>

      {/* ================= ORIGINAL DESKTOP FOOTER ================= */}
      <div className="relative hidden w-full px-5 py-10 pb-28 sm:px-8 lg:block lg:px-10 lg:py-14 lg:pb-10">

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.8fr_0.8fr_1fr]">

          {/* Brand */}
          <div>
            <Link
              href="/"
              aria-label="Edukrate home"
              className="inline-flex items-center"
            >
              <Image
                src={logoSrc}
                alt="Edukrate"
                width={900}
                height={225}
                priority
                className="h-20 w-auto max-w-full object-contain object-left"
              />
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-7 text-[var(--muted)]">
              Upload, discover and share useful study notes, PDFs
              and educational resources. Making learning easier,
              one resource at a time.
            </p>
          </div>

          {/* Explore */}
          <FooterSection title="Explore">
            <FooterLink href="/">Home</FooterLink>
            <FooterLink href="/browse">Browse Notes</FooterLink>
            <FooterLink href="/videos">Video Library</FooterLink>
            <FooterLink href="/creators">Creators</FooterLink>
            <FooterLink href="/feedback">Feedback</FooterLink>
          </FooterSection>

          {/* Students */}
          <FooterSection title="Students">
            <FooterLink href="/saved-notes">Saved Notes</FooterLink>
            <FooterLink href="/following">Following Feed</FooterLink>
            <FooterLink href="/dashboard">Dashboard</FooterLink>
            <FooterLink href="/profile">Profile</FooterLink>
            <FooterLink href="/hall-of-fame">Hall of Fame</FooterLink>
          </FooterSection>

          {/* Connect */}
          <FooterSection title="Connect">
            <ExternalFooterLink href="https://instagram.com/edukrate.in">
              <Camera size={16} />
              Edukrate Instagram
            </ExternalFooterLink>

            <ExternalFooterLink href="mailto:support@edukrate.in">
              <Mail size={16} />
              Contact support
            </ExternalFooterLink>

            <div className="mt-2 border-t border-[var(--border)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Official website
              </p>

              <a
                href="https://edukrate.in"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--primary)]"
              >
                edukrate.in
                <ArrowUpRight size={14} />
              </a>
            </div>
          </FooterSection>

        </div>

        {/* Original desktop bottom bar */}
        <div className="mt-12 flex flex-col gap-4 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">

          <p>
            © {new Date().getFullYear()} Edukrate. All rights reserved.
          </p>

          <p>
            Founded &amp; developed by{" "}
            <a
              href="https://instagram.com/imxanshul"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--foreground)] transition hover:text-[var(--primary)]"
            >
              Anshul Harish Chaware
            </a>
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-1 font-semibold transition hover:text-[var(--foreground)]"
          >
            Back to top
            <ArrowUpRight size={13} />
          </Link>

        </div>
      </div>
    </footer>
  );
}

function FooterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--foreground)]">
        {title}
      </h3>

      <div className="mt-5 flex flex-col gap-3 text-sm text-[var(--muted)]">
        {children}
      </div>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="w-fit transition duration-200 hover:translate-x-1 hover:text-[var(--primary)]"
    >
      {children}
    </Link>
  );
}

function ExternalFooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const isMail = href.startsWith("mailto:");

  return (
    <a
      href={href}
      target={isMail ? undefined : "_blank"}
      rel={isMail ? undefined : "noopener noreferrer"}
      className="flex w-fit items-center gap-2 transition duration-200 hover:translate-x-1 hover:text-[var(--primary)]"
    >
      {children}
    </a>
  );
}
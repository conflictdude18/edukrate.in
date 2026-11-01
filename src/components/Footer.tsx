"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, Mail } from "lucide-react";
import { useEffect, useState } from "react";

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

    window.addEventListener("storage", syncTheme);
    window.addEventListener("themechange", syncTheme);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("themechange", syncTheme);
    };
  }, []);

  const logoSrc =
    theme === "light"
      ? "/edukratelogowithname.png"
      : "/edukratelogowithnamewhite.png";

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--background)]">
      <div className="container-max px-4 py-7 pb-28 sm:px-5 lg:px-8 lg:py-10 lg:pb-8">
        {/* MOBILE FOOTER */}
        <div className="lg:hidden">
          {/* Logo */}
          <div className="flex justify-center">
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
                className="h-20 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Contact */}
          <div className="mt-6 flex items-center justify-center gap-7">
            <a
              href="https://instagram.com/edukrate.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              <Camera size={16} />
              Instagram
            </a>

            <a
              href="mailto:support@edukrate.in"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              <Mail size={16} />
              Contact
            </a>
          </div>

          {/* Copyright */}
          <div className="mt-6 border-t border-[var(--border)] pt-5 text-center">
            <p className="text-xs leading-5 text-[var(--muted)]">
              © {new Date().getFullYear()} Edukrate. All rights reserved.
            </p>

            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              Founded & developed by{" "}
              <a
                href="https://instagram.com/imxanshul"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--foreground)] transition hover:text-red-600"
              >
                Anshul Harish Chaware
              </a>
            </p>
          </div>
        </div>

        {/* DESKTOP FOOTER — UNCHANGED */}
        <div className="hidden lg:block">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
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
                  className="h-25 w-auto max-w-full object-contain object-left"
                />
              </Link>

              <p className="mt-4 max-w-sm text-sm leading-7 text-[var(--muted)]">
                Upload, discover and share useful study notes, PDFs
                and educational resources.
              </p>
            </div>

            <FooterSection title="Explore">
              <FooterLink href="/">Home</FooterLink>
              <FooterLink href="/browse">Browse Notes</FooterLink>
              <FooterLink href="/videos">Video Library</FooterLink>
              <FooterLink href="/creators">Creators</FooterLink>
              <FooterLink href="/feedback">Feedback</FooterLink>
            </FooterSection>

            <FooterSection title="Students">
              <FooterLink href="/saved-notes">Saved Notes</FooterLink>
              <FooterLink href="/following">Following Feed</FooterLink>
              <FooterLink href="/dashboard">Dashboard</FooterLink>
              <FooterLink href="/profile">Profile</FooterLink>
              <FooterLink href="/hall-of-fame">Hall of Fame</FooterLink>
            </FooterSection>

            <FooterSection title="Connect">
              <ExternalFooterLink href="https://instagram.com/edukrate.in">
                <Camera size={16} />
                Instagram
              </ExternalFooterLink>

              <ExternalFooterLink href="mailto:support@edukrate.in">
                <Mail size={16} />
                Contact
              </ExternalFooterLink>
            </FooterSection>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)] lg:flex-row lg:items-center lg:justify-between">
            <p>
              © {new Date().getFullYear()} Edukrate. All rights reserved.
            </p>

            <p>
              Founded & developed by{" "}
              <a
                href="https://instagram.com/imxanshul"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--foreground)] transition hover:text-[var(--primary)]"
              >
                Anshul Harish Chaware
              </a>
            </p>
          </div>
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
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
        {title}
      </h3>

      <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--muted)]">
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
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="w-fit transition hover:text-[var(--foreground)]"
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
  children: React.ReactNode;
}) {
  const isMail = href.startsWith("mailto:");

  return (
    <a
      href={href}
      target={isMail ? undefined : "_blank"}
      rel={isMail ? undefined : "noopener noreferrer"}
      className="flex w-fit items-center gap-2 transition hover:text-[var(--foreground)]"
    >
      {children}
    </a>
  );
}
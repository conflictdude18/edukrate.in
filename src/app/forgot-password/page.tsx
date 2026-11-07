
"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/firebase/firebase";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  ShieldCheck,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess(true);
    } catch (err: any) {
      switch (err?.code) {
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/user-not-found":
          setError("If an account exists for this email, you can request a password reset.");
          break;
        case "auth/too-many-requests":
          setError("Too many requests. Please try again later.");
          break;
        case "auth/network-request-failed":
          setError("Network error. Check your internet connection.");
          break;
        default:
          setError("Unable to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] items-center justify-center p-3 sm:p-6 lg:p-10">
        <div className="grid min-h-[min(760px,calc(100vh-48px))] w-full max-w-[1240px] overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--panel)] shadow-2xl shadow-black/10 lg:grid-cols-[1fr_0.95fr]">

          {/* Branding panel */}
          <section className="relative hidden overflow-hidden bg-[#160707] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
            <div className="pointer-events-none absolute -right-32 -top-32 h-[430px] w-[430px] rounded-full bg-red-600/20 blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-red-900/30 blur-[100px]" />

            <Link href="/" className="relative z-10 flex w-fit items-center gap-3">
              <div className="relative h-12 w-12 shrink-0">
                <Image
                  src="/edukratelogo.png"
                  alt="Edukrate logo"
                  fill
                  sizes="48px"
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-2xl font-black tracking-tight">
                Edukrate
              </span>
            </Link>

            <div className="relative z-10 my-12 max-w-xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300">
                <GraduationCap size={15} />
                Account recovery
              </div>

              <h1 className="text-5xl font-black leading-[1.12] tracking-tight xl:text-6xl">
                Your learning.
                <br />
                Your account.
                <br />
                <span className="text-red-500">Your comeback.</span>
              </h1>

              <p className="mt-7 max-w-md text-base leading-8 text-white/60">
                Forgot your password? No worries. Reset it securely
                and get back to your notes, resources and learning
                community.
              </p>

              <div className="mt-12 flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                  <ShieldCheck size={19} />
                </span>
                Secure password recovery powered by Firebase.
              </div>
            </div>

            <p className="relative z-10 text-xs text-white/35">
              © {new Date().getFullYear()} Edukrate. All rights reserved.
            </p>
          </section>

          {/* Recovery form */}
          <section className="flex min-w-0 items-center justify-center px-5 py-8 sm:px-10 sm:py-12 lg:px-12 xl:px-16">
            <div className="w-full max-w-[420px]">

              <Link href="/" className="mb-10 flex w-fit items-center gap-3 lg:hidden">
                <div className="relative h-11 w-11 shrink-0">
                  <Image
                    src="/edukratelogo.png"
                    alt="Edukrate logo"
                    fill
                    sizes="44px"
                    className="object-contain"
                    priority
                  />
                </div>
                <span className="text-xl font-black tracking-tight">
                  Edukrate
                </span>
              </Link>

              <Link
                href="/login"
                className="mb-9 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] transition hover:text-red-500"
              >
                <ArrowLeft size={17} />
                Back to sign in
              </Link>

              <div className="mb-8">
                <div className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-red-500">
                  Password recovery
                </div>
                <h2 className="text-3xl font-black tracking-tight sm:text-[38px]">
                  Forgot password?
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Enter the email address associated with your
                  Edukrate account. We'll send you a password
                  reset link.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
                >
                  {error}
                </div>
              )}

              {success ? (
                <div className="rounded-2xl border border-green-500/25 bg-green-500/10 p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15 text-green-500">
                    <CheckCircle2 size={26} />
                  </div>
                  <h3 className="text-lg font-black">
                    Check your inbox
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    If an account exists for this email, a password
                    reset link has been sent. Check your inbox and
                    spam folder.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSuccess(false)}
                    className="mt-5 text-sm font-bold text-red-500 hover:text-red-400"
                  >
                    Try another email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="recovery-email"
                      className="mb-2 block text-sm font-bold"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <Mail
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                      />
                      <input
                        id="recovery-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-background)] py-3.5 pl-12 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        Send reset link
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
                <ShieldCheck size={15} />
                Secure recovery powered by Firebase
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

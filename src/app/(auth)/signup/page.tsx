
"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/firebase/firebase";
import {
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Mail,
  LockKeyhole,
  ShieldCheck,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getFirebaseErrorMessage = (code: string) => {
    switch (code) {
      case "auth/email-already-in-use":
        return "This email is already registered. Try signing in instead.";
      case "auth/weak-password":
        return "Password must contain at least 6 characters.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/network-request-failed":
        return "Network error. Check your internet connection.";
      default:
        return "Unable to create your account. Please try again.";
    }
  };

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await updateProfile(userCredential.user, {
        displayName: name.trim(),
      });

      await fetch("/api/send-welcome-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userCredential.user.email,
          name: name.trim() || "Student",
        }),
      });

      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err?.code || ""));
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] items-center justify-center p-3 sm:p-6 lg:p-10">
        <div className="grid min-h-[min(820px,calc(100vh-48px))] w-full max-w-[1240px] overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--panel)] shadow-2xl shadow-black/10 lg:grid-cols-[1fr_0.95fr]">

          {/* Desktop branding panel */}
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
                Start your journey
              </div>

              <h1 className="text-5xl font-black leading-[1.12] tracking-tight xl:text-6xl">
                Make learning
                <br />
                more meaningful.
                <br />
                <span className="text-red-500">Start with us.</span>
              </h1>

              <p className="mt-7 max-w-md text-base leading-8 text-white/60">
                Create your Edukrate account and become part of a community
                built around sharing knowledge and learning together.
              </p>

              <div className="mt-12 space-y-5">
                {[
                  "Build your personal learning profile",
                  "Discover notes and study resources",
                  "Connect with other students",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-white/80">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                      <CheckCircle2 size={16} />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <p className="relative z-10 text-xs text-white/35">
              © {new Date().getFullYear()} Edukrate. All rights reserved.
            </p>
          </section>

          {/* Form panel */}
          <section className="flex min-w-0 items-center justify-center px-5 py-8 sm:px-10 sm:py-12 lg:px-12 xl:px-16">
            <div className="w-full max-w-[420px]">

              {/* Mobile logo */}
              <Link href="/" className="mb-8 flex w-fit items-center gap-3 lg:hidden">
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

              <div className="mb-8">
                <div className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-red-500">
                  Get started for free
                </div>
                <h2 className="text-3xl font-black tracking-tight sm:text-[38px]">
                  Create account
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Set up your account and join the Edukrate community.
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

              <form onSubmit={handleSignup} className="space-y-5">
                <div>
                  <label htmlFor="signup-name" className="mb-2 block text-sm font-bold">
                    Full name
                  </label>
                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    />
                    <input
                      id="signup-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      required
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-background)] py-3.5 pl-12 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-email" className="mb-2 block text-sm font-bold">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    />
                    <input
                      id="signup-email"
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

                <div>
                  <label htmlFor="signup-password" className="mb-2 block text-sm font-bold">
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    />
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-background)] py-3.5 pl-12 pr-12 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] transition hover:text-[var(--foreground)]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Use at least 6 characters.
                  </p>
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
                      Create my account
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <p className="text-center text-xs leading-5 text-[var(--muted)]">
                  By creating an account, you agree to use Edukrate
                  responsibly and respectfully.
                </p>
              </form>

              <p className="mt-7 text-center text-sm text-[var(--muted)]">
                Already have an account?{" "}
                <Link
                  href="/signin"
                  className="font-extrabold text-red-500 transition hover:text-red-400"
                >
                  Sign in
                </Link>
              </p>

              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
                <ShieldCheck size={15} />
                Secure registration powered by Firebase
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

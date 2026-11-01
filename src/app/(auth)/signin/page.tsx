
"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/firebase/firebase";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const getFirebaseErrorMessage = (code: string) => {
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Invalid email or password.";
      case "auth/user-not-found":
        return "Account not found.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again later.";
      case "auth/network-request-failed":
        return "Network error. Check your internet connection.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      default:
        return "Unable to sign in. Please try again.";
    }
  };

  const handleEmailLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err?.code || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err?.code
          ? getFirebaseErrorMessage(err.code)
          : "Google sign in failed."
      );
    } finally {
      setGoogleLoading(false);
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
                Your learning community
              </div>

              <h1 className="text-5xl font-black leading-[1.12] tracking-tight xl:text-6xl">
                Your learning.
                <br />
                Your resources.
                <br />
                <span className="text-red-500">Your community.</span>
              </h1>

              <p className="mt-7 max-w-md text-base leading-8 text-white/60">
                Sign in to access your notes, discover useful study resources
                and continue your learning journey with Edukrate.
              </p>

              <div className="mt-12 space-y-5">
                {[
                  "Access your saved study materials",
                  "Explore notes shared by students",
                  "Stay connected with your learning community",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-white/80">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                      <ShieldCheck size={16} />
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

              <div className="mb-8">
                <div className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-red-500">
                  Welcome back
                </div>
                <h2 className="text-3xl font-black tracking-tight sm:text-[38px]">
                  Sign in
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Enter your account details to continue.
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

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3.5 text-sm font-bold transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {googleLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.25 5.62c4.23-3.91 7.52-9.68 7.52-17.27z" />
                    <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.81l-7.25-5.62c-2.01 1.35-4.58 2.15-8.66 2.15-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 43.62 14.62 48 24 48z" />
                  </svg>
                )}
                Continue with Google
              </button>

              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-[var(--border)]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Or with email
                </span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-5">
                <div>
                  <label htmlFor="signin-email" className="mb-2 block text-sm font-bold">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    />
                    <input
                      id="signin-email"
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
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label htmlFor="signin-password" className="text-sm font-bold">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-bold text-red-500 transition hover:text-red-400"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    />
                    <input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
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
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      Sign in to Edukrate
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-[var(--muted)]">
                Don't have an account?{" "}
                <Link
                  href="/signup"
                  className="font-extrabold text-red-500 transition hover:text-red-400"
                >
                  Create account
                </Link>
              </p>

              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
                <ShieldCheck size={15} />
                Secure sign-in powered by Firebase
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

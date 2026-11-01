
"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 text-center text-[var(--foreground)]">
      <section>
        <h1 className="text-2xl font-semibold">Error</h1>

        <p className="mt-2 text-sm text-[var(--muted)]">
          Something went wrong.
        </p>

        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--card-soft)]"
          >
            Try again
          </button>

          <Link
            href="/"
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--card-soft)]"
          >
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}

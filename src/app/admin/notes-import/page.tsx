"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  FileText,
  Globe,
  Import,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase/firebase";

type ImportedNote = {
  title?: string;
  subject?: string;
  content?: string;
  sourceUrl?: string;
};

export default function NotesImportPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [url, setUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importedNote, setImportedNote] =
    useState<ImportedNote | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin() {
      if (loading) return;

      if (!user) {
        router.replace("/login");
        setCheckingAccess(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        const admin =
          userSnap.exists() &&
          userSnap.data()?.role === "admin";

        if (!cancelled) {
          setIsAdmin(admin);

          if (!admin) {
            router.replace("/");
          }
        }
      } catch (err) {
        console.error("Admin access check failed:", err);

        if (!cancelled) {
          setIsAdmin(false);
          router.replace("/");
        }
      } finally {
        if (!cancelled) {
          setCheckingAccess(false);
        }
      }
    }

    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [user, loading, router]);

  async function handleImport() {
    setError("");
    setSuccess("");
    setImportedNote(null);

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Enter a webpage URL first.");
      return;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      setError("Enter a valid URL, including https://");
      return;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setError("Only HTTP and HTTPS URLs are supported.");
      return;
    }

    if (!user) {
      setError("You are not signed in.");
      router.replace("/login");
      return;
    }

    setIsImporting(true);

    try {
      const idToken = await user.getIdToken();

      const response = await fetch("/api/admin/notes-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          url: parsedUrl.toString(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "The webpage could not be imported."
        );
      }

      setImportedNote(data?.note ?? data);
      setSuccess("The page was imported for review.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while importing."
      );
    } finally {
      setIsImporting(false);
    }
  }

  if (loading || checkingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          Checking admin access...
        </div>
      </main>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium transition hover:bg-[var(--muted)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </button>

        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
              <Import className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Notes Import
              </h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Import educational content from a webpage.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">
                Import from a URL
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                Paste a public webpage URL. The extracted text will be
                displayed for review before it is added to Edukrate.
              </p>
            </div>

            <label
              htmlFor="notes-url"
              className="mb-2 block text-sm font-medium"
            >
              Webpage URL
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />

                <input
                  id="notes-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleImport();
                    }
                  }}
                  placeholder="https://example.com/notes"
                  className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={isImporting || !url.trim()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Import className="h-4 w-4" />
                    Import page
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-500">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{success}</p>
              </div>
            )}

            {importedNote && (
              <div className="mt-6 rounded-xl border border-[var(--border)] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-red-500" />
                  <h3 className="font-semibold">Imported preview</h3>
                </div>

                <h4 className="text-base font-semibold">
                  {importedNote.title || "Untitled note"}
                </h4>

                {importedNote.subject && (
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Subject: {importedNote.subject}
                  </p>
                )}

                <div className="mt-4 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[var(--muted)]/40 p-4 text-sm leading-6">
                  {importedNote.content || "No content was returned."}
                </div>

                {importedNote.sourceUrl && (
                  <a
                    href={importedNote.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block break-all text-sm text-red-500 hover:underline"
                  >
                    View source webpage
                  </a>
                )}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                <h2 className="font-semibold">
                  Review before publishing
                </h2>
              </div>

              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                Check imported content for accuracy, formatting,
                duplication, and permission to reuse before publishing.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="mb-3 font-semibold">Import workflow</h2>

              <ol className="space-y-3 text-sm text-[var(--muted-foreground)]">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xs font-semibold text-red-500">
                    1
                  </span>
                  Paste a webpage URL.
                </li>

                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xs font-semibold text-red-500">
                    2
                  </span>
                  Extract the page content.
                </li>

                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xs font-semibold text-red-500">
                    3
                  </span>
                  Review the extracted text.
                </li>

                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xs font-semibold text-red-500">
                    4
                  </span>
                  Approve it before adding it to the library.
                </li>
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
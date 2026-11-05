
"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  FileText,
  LayoutDashboard,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Users,
  X,
  XCircle,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase/firebase";
import type { Note } from "@/types/note";
import { updateCreatorStats } from "@/lib/updateCreatorStats";
import { createNotification } from "@/lib/createNotification";
import { updateUserAchievements } from "@/lib/updateUserAchievements";
import { awardReputation } from "@/lib/reputation";

type UserDoc = {
  role?: string;
  email?: string;
  name?: string;
};

type Report = {
  id: string;
  noteId?: string;
  noteTitle?: string;
  noteUploaderId?: string;
  reporterId?: string;
  reporterEmail?: string;
  reason?: string;
  details?: string;
  status?: "pending" | "resolved";
  createdAt?: unknown;
};

type AdminTab = "pending" | "approved" | "rejected" | "reported";
type ThumbnailResult = {
  id: string;
  status: "updated" | "failed" | "skipped";
  error?: string;
};

type ThumbnailBackfillResponse = {
  success?: boolean;
  batchSize?: number;
  checked?: number;
  updated?: number;
  nextCursor?: string;
  failed?: number;
  results?: ThumbnailResult[];
  hasMore?: boolean;
  error?: string;
};
export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [notes, setNotes] = useState<Note[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [fetching, setFetching] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>("pending");
  const [search, setSearch] = useState("");
  const [previewNote, setPreviewNote] = useState<Note | null>(null);

  const reviewSectionRef = useRef<HTMLDivElement | null>(null);

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [thumbnailRunning, setThumbnailRunning] = useState(false);
  const [thumbnailHasMore, setThumbnailHasMore] = useState(true);
  const [thumbnailChecked, setThumbnailChecked] = useState(0);
  const [thumbnailUpdated, setThumbnailUpdated] = useState(0);
  const [thumbnailFailed, setThumbnailFailed] = useState(0);
  const [thumbnailSkipped, setThumbnailSkipped] = useState(0);
  const [thumbnailResults, setThumbnailResults] = useState<
    ThumbnailResult[]
  >([]);

    const [aiClass, setAiClass] = useState("12");
    const [aiBoard, setAiBoard] = useState("Maharashtra State Board");
    const [aiSubject, setAiSubject] = useState("");
    const [aiTopic, setAiTopic] = useState("");
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiGeneratedNote, setAiGeneratedNote] = useState<{
      noteId: string;
      title: string;
      status: string;
    } | null>(null);

  // SAVE FUNCTION
  async function saveNoteEdits(
    noteId: string,
    values: {
      title: string;
      description: string;
      class: string;
      subject: string;
      topic: string;
      board: string;
      type: string;
      tags: string[];
      keywords: string[];
    }
  ) {
    setSavingEdit(true);

    try {
      await updateDoc(doc(db, "notes", noteId), {
        ...values,
        updatedAt: new Date(),
      });

      setNotes((currentNotes) =>
        currentNotes.map((note) =>
          note.id === noteId ? { ...note, ...values } : note
        )
      );

      setEditingNote(null);
      toast.success("Note details updated");
    } catch (error) {
      console.error("Failed to update note:", error);
      toast.error("Could not update note details");
    } finally {
      setSavingEdit(false);
    }
  }

  // ADMIN ACCESS
  useEffect(() => {
    async function checkAdmin() {
      if (!user) return;

      setChecking(true);

      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        const data = snapshot.exists()
          ? (snapshot.data() as UserDoc)
          : null;

        setIsAdmin(data?.role === "admin");
      } catch (error) {
        console.error("ADMIN CHECK ERROR:", error);
        setIsAdmin(false);
        toast.error("Failed to verify admin access.");
      } finally {
        setChecking(false);
      }
    }

    if (!loading && !user) {
      router.push("/signin");
      return;
    }

    if (user) {
      checkAdmin();
    }
  }, [user, loading, router]);

  // FETCH DATA
  async function fetchAdminData() {
    setFetching(true);

    try {
      const [notesSnapshot, reportsSnapshot] = await Promise.all([
        getDocs(collection(db, "notes")),
        getDocs(collection(db, "reports")),
      ]);

      const notesData: Note[] = notesSnapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<Note, "id">),
      }));

      const reportsData: Report[] = reportsSnapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<Report, "id">),
      }));

      setNotes(notesData);
      setReports(reportsData);
    } catch (error) {
      console.error("ADMIN DATA FETCH ERROR:", error);
      toast.error("Failed to load admin data.");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  // DASHBOARD STATISTICS
  const stats = useMemo(() => {
    return {
      total: notes.length,
      pending: notes.filter((note) => note.status === "pending").length,
      approved: notes.filter((note) => note.status === "approved").length,
      rejected: notes.filter((note) => note.status === "rejected").length,
      reports: reports.filter((report) => report.status !== "resolved").length,
      users: new Set(
        notes.map((note) => note.uploaderId).filter(Boolean)
      ).size,
    };
  }, [notes, reports]);

  const approvalRate =
    stats.total > 0
      ? Math.round((stats.approved / stats.total) * 100)
      : 0;

  const recentNotes = useMemo(() => {
    return [...notes]
      .sort(
        (a, b) =>
          getCreatedTime(b.createdAt) - getCreatedTime(a.createdAt)
      )
      .slice(0, 5);
  }, [notes]);

  const recentReports = useMemo(() => {
    return [...reports]
      .sort(
        (a, b) =>
          getCreatedTime(b.createdAt) - getCreatedTime(a.createdAt)
      )
      .slice(0, 4);
  }, [reports]);

  const topUploaders = useMemo(() => {
    const uploaderCounts: Record<
      string,
      { name: string; email: string; count: number }
    > = {};

    notes.forEach((note) => {
      const uploaderId =
        note.uploaderId || note.uploaderEmail || "unknown";

      if (!uploaderCounts[uploaderId]) {
        uploaderCounts[uploaderId] = {
          name: note.uploaderName || "Unknown User",
          email: note.uploaderEmail || "No email",
          count: 0,
        };
      }

      uploaderCounts[uploaderId].count += 1;
    });

    return Object.values(uploaderCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [notes]);

  // FILTERED MODERATION DATA
  const filteredNotes = useMemo(() => {
    const query = search.toLowerCase().trim();

    return notes
      .filter((note) => note.status === activeTab)
      .filter((note) => {
        if (!query) return true;

        const searchable = [
          note.title,
          note.subject,
          note.class,
          note.topic,
          note.uploaderEmail,
          note.uploaderName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .sort(
        (a, b) =>
          getCreatedTime(b.createdAt) - getCreatedTime(a.createdAt)
      );
  }, [notes, activeTab, search]);

  const filteredReports = useMemo(() => {
    const query = search.toLowerCase().trim();

    return reports
      .filter((report) => report.status !== "resolved")
      .filter((report) => {
        if (!query) return true;

        const searchable = [
          report.noteTitle,
          report.reason,
          report.details,
          report.reporterEmail,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      });
  }, [reports, search]);

  // MODERATION ACTIONS
  async function approveNote(noteId?: string) {
    if (!noteId) return;

    setActionLoadingId(noteId);

    const selectedNote = notes.find((note) => note.id === noteId);

    try {
      await updateDoc(doc(db, "notes", noteId), {
        status: "approved",
      });

      setNotes((previous) =>
        previous.map((note) =>
          note.id === noteId
            ? { ...note, status: "approved" }
            : note
        )
      );

      toast.success("Note approved successfully.");

      if (selectedNote?.uploaderId) {
        const uploaderId = selectedNote.uploaderId;

        const results = await Promise.allSettled([
          awardReputation({
            userId: uploaderId,
            reason: "note_approved",
            noteId,
            noteTitle: selectedNote.title,
          }),
          updateCreatorStats(uploaderId),
          updateUserAchievements(uploaderId),
          createNotification({
            userId: uploaderId,
            type: "approved",
            title: "Note approved",
            message: `Your note "${selectedNote.title || "Untitled Note"}" has been approved.`,
            link: `/notes/${noteId}`,
          }),
        ]);

        results.forEach((result, index) => {
          if (result.status === "rejected") {
            console.error(
              `APPROVAL SECONDARY TASK ${index + 1} FAILED:`,
              result.reason
            );
          }
        });
      }

      await fetchAdminData();
    } catch (error) {
      console.error("APPROVE NOTE ERROR:", error);
      toast.error("Failed to update note approval status.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function rejectNote(noteId?: string) {
    if (!noteId) return;

    setActionLoadingId(noteId);

    const selectedNote = notes.find((note) => note.id === noteId);

    try {
      await updateDoc(doc(db, "notes", noteId), {
        status: "rejected",
      });

      setNotes((previous) =>
        previous.map((note) =>
          note.id === noteId
            ? { ...note, status: "rejected" }
            : note
        )
      );

      toast.success("Note rejected.");

      if (selectedNote?.uploaderId) {
        const results = await Promise.allSettled([
          createNotification({
            userId: selectedNote.uploaderId,
            type: "rejected",
            title: "Note rejected",
            message: `Your note "${selectedNote.title || "Untitled Note"}" was rejected after review.`,
            link: "/my-notes",
          }),
          updateCreatorStats(selectedNote.uploaderId),
        ]);

        results.forEach((result, index) => {
          if (result.status === "rejected") {
            console.error(
              `REJECTION SECONDARY TASK ${index + 1} FAILED:`,
              result.reason
            );
          }
        });
      }

      await fetchAdminData();
    } catch (error) {
      console.error("REJECT NOTE ERROR:", error);
      toast.error("Failed to reject note.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function deleteNote(noteId?: string) {
    if (!noteId) return;

    const confirmed = window.confirm(
      "Delete this note permanently? This action cannot be undone."
    );

    if (!confirmed) return;

    setActionLoadingId(noteId);

    try {
      await deleteDoc(doc(db, "notes", noteId));

      setNotes((previous) =>
        previous.filter((note) => note.id !== noteId)
      );

      toast.success("Note deleted.");
    } catch (error) {
      console.error("DELETE NOTE ERROR:", error);
      toast.error("Failed to delete note.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function resolveReport(reportId?: string) {
    if (!reportId) return;

    setActionLoadingId(reportId);

    try {
      await updateDoc(doc(db, "reports", reportId), {
        status: "resolved",
      });

      setReports((previous) =>
        previous.map((report) =>
          report.id === reportId
            ? { ...report, status: "resolved" }
            : report
        )
      );

      toast.success("Report marked as resolved.");
    } catch (error) {
      console.error("RESOLVE REPORT ERROR:", error);
      toast.error("Failed to resolve report.");
    } finally {
      setActionLoadingId(null);
    }
  }

  function openModerationTab(tab: AdminTab) {
    setActiveTab(tab);

    setTimeout(() => {
      reviewSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }
  
  const [thumbnailCursor, setThumbnailCursor] = useState("");
    async function runThumbnailBackfill() {
    if (thumbnailRunning || !user) return;

    setThumbnailRunning(true);

    try {
      const token = await user.getIdToken();

      const response = await fetch(
        "/api/admin/notes-thumbnails-backfill",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            batchSize: 10,
            cursor: thumbnailCursor,
          }),
        }
      );

      const responseText = await response.text();

      let data: ThumbnailBackfillResponse;

      try {
        data = JSON.parse(responseText) as ThumbnailBackfillResponse;
      } catch {
        console.error("Thumbnail API returned non-JSON:", responseText);

        throw new Error(
          `API returned HTML or invalid JSON. HTTP ${response.status}. Check the API route and server logs.`
        );
      }
      console.log(
        "Thumbnail backfill API results:",
        data.results
      );
      if (!response.ok || !data.success) {
        throw new Error(
          (data as any).error || `Request failed with HTTP ${response.status}`
        );
      }
      
      setThumbnailCursor(data.nextCursor ?? "");

      if (!response.ok) {
        throw new Error(
          data.error || "Thumbnail backfill request failed."
        );
      }

      const results = data.results ?? [];

      setThumbnailChecked((current) => current + (data.checked ?? 0));
      setThumbnailUpdated((current) => current + (data.updated ?? 0));
      setThumbnailFailed((current) => current + (data.failed ?? 0));

      setThumbnailSkipped(
        (current) =>
          current +
          results.filter((item) => item.status === "skipped").length
      );

      setThumbnailResults((current) => [
        ...results,
        ...current,
      ]);

      setThumbnailHasMore(Boolean(data.hasMore));

      if ((data.updated ?? 0) > 0) {
        toast.success(
          `Generated ${data.updated} thumbnail${data.updated === 1 ? "" : "s"}.`
        );
      } else if ((data.checked ?? 0) === 0) {
        toast.success("No missing thumbnails found.");
      } else {
        toast.info("Batch processed. Check the results below.");
      }
    } catch (error) {
      console.error("THUMBNAIL BACKFILL ERROR:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Thumbnail backfill failed."
      );
    } finally {
      setThumbnailRunning(false);
    }
  }

  function resetThumbnailBackfill() {
    if (thumbnailRunning) return;

    setThumbnailHasMore(true);
    setThumbnailChecked(0);
    setThumbnailUpdated(0);
    setThumbnailFailed(0);
    setThumbnailSkipped(0);
    setThumbnailResults([]);
    setThumbnailCursor("");
  }
  async function generateAiNote() {
    if (!user || aiGenerating) return;

    if (!aiClass.trim() || !aiSubject.trim() || !aiTopic.trim()) {
      toast.error("Class, subject, and topic are required.");
      return;
    }

    setAiGenerating(true);
    setAiGeneratedNote(null);

    try {
      const token = await user.getIdToken();

      const response = await fetch("/api/admin/generate-note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class: aiClass.trim(),
          board: aiBoard.trim(),
          subject: aiSubject.trim(),
          topic: aiTopic.trim(),
        }),
      });

      const responseText = await response.text();

      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("API returned non-JSON response:", responseText);

        throw new Error(
          `API returned HTML or invalid JSON. Check the API route. Status: ${response.status}`
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "AI note generation failed.");
      }

      setAiGeneratedNote({
        noteId: data.noteId,
        title: data.title,
        status: data.status,
      });

      toast.success("AI note generated and saved for review.");

      await fetchAdminData();
    } catch (error) {
      console.error("AI NOTE GENERATION ERROR:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Could not generate the note."
      );
    } finally {
      setAiGenerating(false);
    }
  }

  // AUTH STATES
  if (loading || checking) {
    return <AdminLoading />;
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <section className="nw-panel w-full max-w-md p-8 text-center">
          <Shield className="mx-auto text-red-500" size={48} />

          <h1 className="mt-6 text-3xl font-black text-[var(--foreground)]">
            Access Denied
          </h1>

          <p className="mt-3 text-sm text-[var(--muted)]">
            You do not have admin permission for this page.
          </p>

          <button
            onClick={() => router.push("/")}
            className="btn-primary mt-7 w-full"
          >
            Go Home
          </button>
        </section>
      </main>
    );
  }

  // MAIN DASHBOARD
  return (
    <main className="w-full min-w-0 space-y-6 overflow-x-hidden px-1 py-5 pb-24 text-[var(--foreground)] sm:px-2 lg:px-3 md:space-y-8">

      {/* HEADER */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-xl sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-red-600/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-orange-500/10 blur-[100px]" />

        <div className="relative z-10 flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-300">
              <Shield size={14} />
              Administrator workspace
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
              Admin Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
              Monitor platform activity, review community uploads, manage
              reports and keep the Edukrate library organized.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-[var(--muted)]">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Admin access active
              </span>
              <span className="text-[var(--muted)]">/</span>
              <span>{stats.total.toLocaleString()} total notes</span>
              <span className="text-[var(--muted)]">/</span>
              <span>{stats.users.toLocaleString()} contributors</span>
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[390px]">
            <button
              type="button"
              onClick={() => router.push("/admin/users")}
              className="btn-primary h-12"
            >
              <Users size={17} />
              Manage Users
              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              onClick={fetchAdminData}
              disabled={fetching}
              className="btn-secondary h-12"
            >
              <RefreshCw
                size={16}
                className={fetching ? "animate-spin" : ""}
              />
              Refresh Data
            </button>
          </div>
        </div>
      </section>

      {/* STATISTICS */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionEyebrow>Platform overview</SectionEyebrow>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">
              At a glance
            </h2>
          </div>

          <span className="text-xs font-semibold text-[var(--muted)]">
            Live dashboard totals
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard label="Total Notes" value={stats.total} icon={<FileText size={20} />} tone="red" />
          <StatCard label="Pending Review" value={stats.pending} icon={<Clock3 size={20} />} tone="yellow" onClick={() => openModerationTab("pending")} />
          <StatCard label="Approved" value={stats.approved} icon={<CheckCircle2 size={20} />} tone="green" onClick={() => openModerationTab("approved")} />
          <StatCard label="Rejected" value={stats.rejected} icon={<XCircle size={20} />} tone="red" onClick={() => openModerationTab("rejected")} />
          <StatCard label="Open Reports" value={stats.reports} icon={<AlertTriangle size={20} />} tone="yellow" onClick={() => openModerationTab("reported")} />
          <StatCard label="Contributors" value={stats.users} icon={<Users size={20} />} tone="blue" />
        </div>
      </section>

      {/* ANALYTICS AND QUICK ACTIONS */}
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="nw-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SectionEyebrow>Moderation performance</SectionEyebrow>
              <h2 className="mt-1 text-xl font-black">Approval overview</h2>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
              <Activity size={20} />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-36 w-36 shrink-0 flex-col items-center justify-center rounded-full border-[10px] border-green-500/20">
              <span className="text-3xl font-black tabular-nums">
                {approvalRate}%
              </span>
              <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
                Approved
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <ProgressRow label="Approved" value={stats.approved} total={stats.total} color="bg-green-500" />
              <ProgressRow label="Pending" value={stats.pending} total={stats.total} color="bg-yellow-500" />
              <ProgressRow label="Rejected" value={stats.rejected} total={stats.total} color="bg-red-500" />
            </div>
          </div>

          <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--muted)]">
            Approval rate is calculated from all notes currently stored in
            the platform.
          </p>
        </div>

        <div className="nw-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SectionEyebrow>Shortcuts</SectionEyebrow>
              <h2 className="mt-1 text-xl font-black">Quick actions</h2>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <Sparkles size={20} />
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <QuickAction
              title="Review pending notes"
              subtitle={`${stats.pending} notes waiting for review`}
              icon={<Clock3 size={18} />}
              onClick={() => openModerationTab("pending")}
            />
            <QuickAction
              title="Handle reports"
              subtitle={`${stats.reports} unresolved reports`}
              icon={<AlertTriangle size={18} />}
              onClick={() => openModerationTab("reported")}
            />
            <QuickAction
              title="Manage platform users"
              subtitle="View and manage user accounts"
              icon={<Users size={18} />}
              onClick={() => router.push("/admin/users")}
            />
          </div>
        </div>
      </section>

      {/* AI NOTE GENERATOR */}
      <section className="nw-card overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <SectionEyebrow>AI content creation</SectionEyebrow>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              AI Note Generator
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Generate structured study notes and a PDF using AI.
              Generated notes are saved as pending and require admin approval.
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
            <Sparkles size={22} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-black text-[var(--muted)]">
              Class
            </label>
            <select
              value={aiClass}
              onChange={(event) => setAiClass(event.target.value)}
              className="nw-input h-12"
              disabled={aiGenerating}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={String(index + 1)}>
                  Class {index + 1}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-black text-[var(--muted)]">
              Board
            </label>
            <select
              value={aiBoard}
              onChange={(event) => setAiBoard(event.target.value)}
              className="nw-input h-12"
              disabled={aiGenerating}
            >
              <option value="Maharashtra State Board">
                Maharashtra State Board
              </option>
              <option value="CBSE">CBSE</option>
              <option value="ICSE">ICSE</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-black text-[var(--muted)]">
              Subject
            </label>
            <input
              value={aiSubject}
              onChange={(event) => setAiSubject(event.target.value)}
              placeholder="e.g. Physics"
              className="nw-input h-12"
              disabled={aiGenerating}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-black text-[var(--muted)]">
              Chapter / Topic
            </label>
            <input
              value={aiTopic}
              onChange={(event) => setAiTopic(event.target.value)}
              placeholder="e.g. Laws of Motion"
              className="nw-input h-12"
              disabled={aiGenerating}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={generateAiNote}
          disabled={
            aiGenerating ||
            !aiClass.trim() ||
            !aiSubject.trim() ||
            !aiTopic.trim()
          }
          className="btn-primary mt-5 h-12 w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {aiGenerating ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {aiGenerating ? "Generating PDF..." : "Generate AI Note"}
        </button>

        {aiGeneratedNote && (
          <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={20}
                className="mt-0.5 shrink-0 text-green-600"
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-green-700 dark:text-green-300">
                  Note generated successfully
                </p>

                <p className="mt-1 break-words text-sm font-semibold">
                  {aiGeneratedNote.title}
                </p>

                <p className="mt-2 text-xs text-[var(--muted)]">
                  Status: {aiGeneratedNote.status} · Note ID:{" "}
                  {aiGeneratedNote.noteId}
                </p>

                <button
                  type="button"
                  onClick={() => openModerationTab("pending")}
                  className="mt-3 inline-flex items-center gap-2 text-xs font-black text-red-600 hover:text-red-500"
                >
                  Review pending notes
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* THUMBNAIL BACKFILL */}
      <section className="nw-card overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <SectionEyebrow>Library maintenance</SectionEyebrow>

            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              PDF Thumbnail Generator
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Generate preview images for approved notes that are
              missing thumbnails. Each batch processes up to 10 PDFs
              and updates only the thumbnail URL.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--muted)]">
                Batch size: 10
              </span>

              <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--muted)]">
                Approved notes only
              </span>

              <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--muted)]">
                Missing thumbnails only
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <button
              type="button"
              onClick={runThumbnailBackfill}
              disabled={thumbnailRunning || !thumbnailHasMore}
              className="btn-primary h-12 w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {thumbnailRunning ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}

              {thumbnailRunning
                ? "Processing PDFs..."
                : thumbnailHasMore
                  ? "Generate Missing Thumbnails"
                  : "All Batches Processed"}
            </button>

            <button
              type="button"
              onClick={resetThumbnailBackfill}
              disabled={thumbnailRunning}
              className="btn-secondary h-12 w-full disabled:opacity-50 sm:w-auto"
            >
              Reset
            </button>
          </div>
        </div>

        {/* BACKFILL STATISTICS */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-xs font-bold text-[var(--muted)]">
              Checked
            </p>

            <p className="mt-2 text-2xl font-black tabular-nums">
              {thumbnailChecked.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-xs font-bold text-green-700 dark:text-green-300">
              Updated
            </p>

            <p className="mt-2 text-2xl font-black tabular-nums text-green-600">
              {thumbnailUpdated.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xs font-bold text-red-600">
              Failed
            </p>

            <p className="mt-2 text-2xl font-black tabular-nums text-red-600">
              {thumbnailFailed.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
            <p className="text-xs font-bold text-yellow-700 dark:text-yellow-300">
              Skipped
            </p>

            <p className="mt-2 text-2xl font-black tabular-nums text-yellow-700 dark:text-yellow-300">
              {thumbnailSkipped.toLocaleString()}
            </p>
          </div>
        </div>

        {/* BACKFILL STATUS */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
            {thumbnailRunning ? (
              <RefreshCw
                size={15}
                className="animate-spin text-red-500"
              />
            ) : thumbnailHasMore ? (
              <Clock3 size={15} className="text-yellow-600" />
            ) : (
              <CheckCircle2 size={15} className="text-green-600" />
            )}

            {thumbnailRunning
              ? "Processing the current batch..."
              : thumbnailHasMore
                ? "More batches may be available."
                : "No more matching notes were found."}
          </div>

          {!thumbnailHasMore && (
            <span className="text-xs font-black text-green-600">
              Processing complete
            </span>
          )}
        </div>

        {/* INDIVIDUAL RESULTS */}
        {thumbnailResults.length > 0 && (
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-black">
                Processing results
              </h3>

              <span className="text-xs font-semibold text-[var(--muted)]">
                {thumbnailResults.length} records
              </span>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto">
              {thumbnailResults.map((result, index) => (
                <div
                  key={`${result.id}-${index}`}
                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="break-all text-xs font-bold">
                      {result.id}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                        result.status === "updated"
                          ? "bg-green-500/10 text-green-600"
                          : result.status === "failed"
                            ? "bg-red-500/10 text-red-600"
                            : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
                      }`}
                    >
                      {result.status}
                    </span>
                  </div>

                  {result.error && (
                    <p className="mt-2 break-words text-xs leading-5 text-red-600">
                      {result.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* RECENT ACTIVITY */}
      <section className="grid gap-4 xl:grid-cols-2">
        <div className="nw-card min-w-0 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <SectionEyebrow>Latest uploads</SectionEyebrow>
              <h2 className="mt-1 text-xl font-black">Recent notes</h2>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <FileText size={19} />
            </div>
          </div>

          {recentNotes.length === 0 ? (
            <SmallEmpty text="No recent note activity found." />
          ) : (
            <div className="space-y-2">
              {recentNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                    <FileText size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">
                      {note.title || "Untitled Note"}
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--muted)]">
                      {note.subject || "Unknown subject"}
                    </p>
                  </div>

                  <StatusBadge status={note.status || "pending"} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="nw-card min-w-0 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <SectionEyebrow>Community flags</SectionEyebrow>
              <h2 className="mt-1 text-xl font-black">Recent reports</h2>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600">
              <Bell size={19} />
            </div>
          </div>

          {recentReports.length === 0 ? (
            <SmallEmpty text="No reports found." />
          ) : (
            <div className="space-y-2">
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-black">
                      {report.noteTitle || "Reported Note"}
                    </p>

                    <span className="shrink-0 rounded-full bg-yellow-500/10 px-2 py-1 text-[10px] font-black text-yellow-700 dark:text-yellow-300">
                      {report.status === "resolved" ? "Resolved" : "Open"}
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-bold text-yellow-700 dark:text-yellow-300">
                    {report.reason || "Reason not provided"}
                  </p>

                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                    {report.details || "No additional details."}
                  </p>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => openModerationTab("reported")}
            className="mt-4 inline-flex items-center gap-2 text-xs font-black text-red-600 transition hover:text-red-500"
          >
            View all reports
            <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* TOP CONTRIBUTORS */}
      <section className="nw-card p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <SectionEyebrow>Community activity</SectionEyebrow>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              Top contributors
            </h2>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
            <Users size={20} />
          </div>
        </div>

        {topUploaders.length === 0 ? (
          <SmallEmpty text="No contributors found." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {topUploaders.map((uploader, index) => (
              <div
                key={`${uploader.email}-${index}`}
                className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-red-600">
                    RANK #{index + 1}
                  </span>
                  {index === 0 && (
                    <Sparkles size={15} className="text-yellow-500" />
                  )}
                </div>

                <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-sm font-black text-red-600">
                  {getInitials(uploader.name)}
                </div>

                <h3 className="mt-3 truncate text-sm font-black">
                  {uploader.name}
                </h3>

                <p className="mt-1 truncate text-xs text-[var(--muted)]">
                  {uploader.email}
                </p>

                <div className="mt-4 flex items-end justify-between border-t border-[var(--border)] pt-3">
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    Total uploads
                  </span>
                  <span className="text-2xl font-black tabular-nums">
                    {uploader.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODERATION WORKSPACE */}
      <section
        ref={reviewSectionRef}
        className="scroll-mt-24 space-y-4"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <SectionEyebrow>Content management</SectionEyebrow>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">
              Moderation workspace
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Review uploads and manage community reports.
            </p>
          </div>

          <span className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-bold text-[var(--muted)] sm:self-auto">
            <LayoutDashboard size={14} />
            {activeTab === "reported"
              ? `${filteredReports.length} reports`
              : `${filteredNotes.length} notes`}
          </span>
        </div>

        <div className="nw-card p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <TabButton active={activeTab === "pending"} count={stats.pending} onClick={() => setActiveTab("pending")}>
                Pending
              </TabButton>
              <TabButton active={activeTab === "approved"} count={stats.approved} onClick={() => setActiveTab("approved")}>
                Approved
              </TabButton>
              <TabButton active={activeTab === "rejected"} count={stats.rejected} onClick={() => setActiveTab("rejected")}>
                Rejected
              </TabButton>
              <TabButton active={activeTab === "reported"} count={stats.reports} onClick={() => setActiveTab("reported")}>
                Reports
              </TabButton>
            </div>

            <div className="relative w-full xl:max-w-sm">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  activeTab === "reported"
                    ? "Search reports..."
                    : "Search notes, subjects, uploaders..."
                }
                className="nw-input h-11 pl-10 pr-10 text-sm font-medium"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-red-500/10 hover:text-red-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {fetching ? (
          <div className="nw-card p-10 text-center">
            <RefreshCw size={25} className="mx-auto animate-spin text-red-500" />
            <p className="mt-3 text-sm font-semibold text-[var(--muted)]">
              Loading moderation data...
            </p>
          </div>
        ) : activeTab === "reported" ? (
          <div className="space-y-3">
            {filteredReports.length === 0 ? (
              <EmptyState
                title="No pending reports"
                text="All reports are resolved or nothing matches your search."
              />
            ) : (
              filteredReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  busy={actionLoadingId === report.id}
                  onResolve={() => resolveReport(report.id)}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.length === 0 ? (
              <EmptyState
                title={`No ${activeTab} notes`}
                text="There are no notes in this category matching your search."
              />
            ) : (
              filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  busy={actionLoadingId === note.id}
                  onApprove={() => approveNote(note.id)}
                  onReject={() => rejectNote(note.id)}
                  onDelete={() => deleteNote(note.id)}
                  setPreviewNote={setPreviewNote}
                  onEdit={() => setEditingNote(note)}
                />
              ))
            )}
          </div>
        )}
      </section>

      {/* NOTE PREVIEW MODAL */}
      {previewNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setPreviewNote(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 text-[var(--foreground)] shadow-2xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                  Note preview
                </p>
                <h2
                  id="preview-title"
                  className="mt-2 text-2xl font-black sm:text-3xl"
                >
                  {previewNote.title || "Untitled Note"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setPreviewNote(null)}
                aria-label="Close preview"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <PreviewInfo label="Subject" value={previewNote.subject} />
              <PreviewInfo label="Class" value={previewNote.class} />
              <PreviewInfo label="Topic" value={previewNote.topic} />
              <PreviewInfo
                label="Uploader"
                value={previewNote.uploaderEmail || previewNote.uploaderName}
              />
            </div>

            <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
              <p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">
                Description
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--muted-strong)]">
                {previewNote.description || "No description provided."}
              </p>
            </div>

            {previewNote.pdfURL ? (
              <a
                href={previewNote.pdfURL}
                target="_blank"
                rel="noreferrer"
                className="btn-primary mt-5 w-full sm:w-auto"
              >
                <ExternalLink size={17} />
                Open PDF document
              </a>
            ) : (
              <p className="mt-5 text-sm text-yellow-700 dark:text-yellow-300">
                No PDF URL is available for this note.
              </p>
            )}
          </div>
        </div>
      )}
      {/* NOTE EDIT MODAL */}
      {editingNote && (
        <NoteEditModal
          note={editingNote}
          saving={savingEdit}
          onClose={() => setEditingNote(null)}
          onSave={saveNoteEdits}
        />
      )}
    </main>
  );
}

// REUSABLE UI COMPONENTS

type NoteEditModalProps = {
  note: Note;
  saving: boolean;
  onClose: () => void;
  onSave: (
    noteId: string,
    values: {
      title: string;
      description: string;
      class: string;
      subject: string;
      topic: string;
      board: string;
      type: string;
      tags: string[];
      keywords: string[];
    }
  ) => Promise<void>;
};

function NoteEditModal({
  note,
  saving,
  onClose,
  onSave,
}: NoteEditModalProps) {
  const [title, setTitle] = useState(note.title ?? "");
  const [description, setDescription] = useState(note.description ?? "");
  const [className, setClassName] = useState(note.class ?? "");
  const [subject, setSubject] = useState(note.subject ?? "");
  const [topic, setTopic] = useState(note.topic ?? "");
  const [board, setBoard] = useState(note.board ?? "");
  const [type, setType] = useState(note.type ?? "");
  const [tags, setTags] = useState((note.tags ?? []).join(", "));
  const [keywords, setKeywords] = useState(
    (note.keywords ?? []).join(", ")
  );

  function splitList(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSave(note.id!, {
      title: title.trim(),
      description: description.trim(),
      class: className.trim(),
      subject: subject.trim(),
      topic: topic.trim(),
      board: board.trim(),
      type: type.trim(),
      tags: splitList(tags),
      keywords: splitList(keywords),
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-2xl sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Edit note details</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Update the note metadata.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-3 py-2 text-sm hover:bg-[var(--muted)] disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Class</label>
              <input
                value={className}
                onChange={(event) => setClassName(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Subject</label>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Topic</label>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Board</label>
              <input
                value={board}
                onChange={(event) => setBoard(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <input
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Tags <span className="text-xs opacity-60">(comma-separated)</span>
            </label>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Keywords{" "}
              <span className="text-xs opacity-60">(comma-separated)</span>
            </label>
            <input
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">
      {children}
    </p>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "red" | "green" | "yellow" | "blue";
  onClick?: () => void;
}) {
  const tones = {
    red: "bg-red-500/10 text-red-600",
    green: "bg-green-500/10 text-green-600",
    yellow: "bg-yellow-500/10 text-yellow-700",
    blue: "bg-blue-500/10 text-blue-600",
  };

  const content = (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-[var(--muted)]">
          {label}
        </p>
        <p className="mt-3 text-3xl font-black tabular-nums sm:text-4xl">
          {value.toLocaleString()}
        </p>
        {onClick && (
          <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-red-600">
            View details <ArrowUpRight size={12} />
          </p>
        )}
      </div>

      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        {icon}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="nw-card p-4 text-left transition hover:-translate-y-0.5 hover:border-red-500/40 hover:shadow-lg sm:p-5"
      >
        {content}
      </button>
    );
  }

  return <div className="nw-card p-4 sm:p-5">{content}</div>;
}

function ProgressRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage =
    total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-bold">{label}</span>
        <span className="font-black tabular-nums text-[var(--muted)]">
          {value} · {percentage}%
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function QuickAction({
  title,
  subtitle,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-left transition hover:border-red-500/40 hover:bg-[var(--surface-hover)]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{title}</p>
        <p className="mt-1 truncate text-xs text-[var(--muted)]">
          {subtitle}
        </p>
      </div>

      <ArrowRight
        size={16}
        className="shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-red-600"
      />
    </button>
  );
}

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition ${
        active
          ? "bg-red-600 text-white shadow-lg shadow-red-600/15"
          : "border border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-red-500/40 hover:text-[var(--foreground)]"
      }`}
    >
      {children}
      <span
        className={`rounded-md px-1.5 py-0.5 text-[10px] ${
          active
            ? "bg-white/15 text-white"
            : "bg-[var(--card-soft)] text-[var(--muted)]"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function NoteCard({
  note,
  busy,
  onApprove,
  onReject,
  onDelete,
  onEdit,
  setPreviewNote,
}: {
  note: Note;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onEdit: () => void;
  setPreviewNote: (note: Note) => void;
}) {
  return (
    <article className="nw-card overflow-hidden transition hover:border-red-500/25">
      <div className="grid min-w-0 xl:grid-cols-[1fr_260px]">
        <div className="min-w-0 p-4 sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={note.status || "pending"} />

            {note.subject && (
              <span className="rounded-full bg-red-500/10 px-3 py-1.5 text-[10px] font-black text-red-600">
                {note.subject}
              </span>
            )}

            {note.type && (
              <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[10px] font-bold text-[var(--muted)]">
                {note.type}
              </span>
            )}
          </div>

          <h3 className="mt-4 break-words text-xl font-black leading-snug sm:text-2xl">
            {note.title || "Untitled Note"}
          </h3>

          <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">
            {note.description || "No description provided."}
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <InfoRow label="Class" value={note.class} />
            <InfoRow label="Subject" value={note.subject} />
            <InfoRow label="Topic" value={note.topic} />
            <InfoRow label="Uploader" value={note.uploaderEmail || note.uploaderName} />
          </div>
        </div>

        <div className="flex flex-col justify-center gap-2 border-t border-[var(--border)] bg-[var(--background)] p-4 xl:border-l xl:border-t-0">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">
            Moderation actions
          </p>

          <button
            type="button"
            onClick={() => setPreviewNote(note)}
            className="btn-secondary h-11"
          >
            <Eye size={16} />
            Preview details
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="btn-secondary h-11"
          >
            <Pencil size={16} />
            Edit note
          </button>

          {note.status !== "approved" && (
            <button
              type="button"
              disabled={busy}
              onClick={onApprove}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 text-xs font-black text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Approve note
            </button>
          )}

          {note.status !== "rejected" && (
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 text-xs font-black text-yellow-700 transition hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-yellow-300"
            >
              <XCircle size={15} />
              Reject note
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 text-xs font-black text-red-600 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={15} />
            Delete note
          </button>
        </div>
      </div>
    </article>
  );
}

function ReportCard({
  report,
  busy,
  onResolve,
}: {
  report: Report;
  busy: boolean;
  onResolve: () => void;
}) {
  return (
    <article className="rounded-2xl border border-yellow-500/20 bg-[var(--card)] p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-yellow-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-yellow-700 dark:text-yellow-300">
            <AlertTriangle size={13} />
            Pending report
          </div>

          <h3 className="mt-3 break-words text-xl font-black">
            {report.noteTitle || "Reported Note"}
          </h3>

          <p className="mt-2 text-sm font-bold text-yellow-700 dark:text-yellow-300">
            Reason: {report.reason || "Not provided"}
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            {report.details || "No additional details provided."}
          </p>

          <p className="mt-3 text-xs text-[var(--muted)]">
            Reported by: {report.reporterEmail || "Unknown reporter"}
          </p>
        </div>

        <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:w-64 lg:grid-cols-1">
          {report.noteId && (
            <a
              href={`/notes/${report.noteId}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary h-11"
            >
              <ExternalLink size={15} />
              View reported note
            </a>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={onResolve}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 text-xs font-black text-white transition hover:bg-green-500 disabled:opacity-50"
          >
            {busy ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
            Mark as resolved
          </button>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "approved"
      ? "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300"
      : status === "rejected"
        ? "border-red-500/20 bg-red-500/10 text-red-600"
        : "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${styles}`}>
      {status === "approved" ? (
        <CheckCircle2 size={12} />
      ) : status === "rejected" ? (
        <XCircle size={12} />
      ) : (
        <Clock3 size={12} />
      )}
      {status}
    </span>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
      <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-xs font-bold">
        {value || "Not set"}
      </span>
    </div>
  );
}

function PreviewInfo({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-bold text-[var(--foreground)]">
        {value || "Not set"}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <section className="nw-card px-5 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 text-green-600">
        <CheckCircle2 size={29} />
      </div>

      <h3 className="mt-4 text-xl font-black">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
        {text}
      </p>
    </section>
  );
}

function SmallEmpty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
      {text}
    </div>
  );
}

function AdminLoading() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <section className="nw-panel w-full max-w-md p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
          <Shield size={30} />
        </div>

        <h1 className="mt-5 text-2xl font-black">
          Checking Admin Access
        </h1>

        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Verifying your permission before opening the dashboard.
        </p>

        <RefreshCw
          size={18}
          className="mx-auto mt-5 animate-spin text-red-500"
        />
      </section>
    </main>
  );
}

// HELPERS
function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function getCreatedTime(value: unknown): number {
  if (!value) return 0;

  if (typeof value === "string") {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "object" && value !== null) {
    const timestamp = value as {
      toDate?: () => Date;
      seconds?: number;
    };

    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate().getTime();
    }

    if (typeof timestamp.seconds === "number") {
      return timestamp.seconds * 1000;
    }
  }

  return 0;
}

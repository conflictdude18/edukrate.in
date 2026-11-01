
"use client";

import AISummaryCard from "@/components/AISummaryCard";
import PDFViewer from "@/components/PDFViewer";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase/firebase";
import { sendNotification } from "@/lib/sendNotification";
import type { Note } from "@/types/note";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Download,
  FileText,
  Heart,
  Loader2,
  MessageCircle,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Comment = {
  id: string;
  noteId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
};

const cardClass =
  "rounded-3xl border border-[var(--border)] bg-[var(--card)]";

const mutedText = "text-[var(--muted)]";

const inputClass =
  "w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-red-500 focus:ring-2 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-50";

export default function NoteDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const isBookmarked = Boolean(bookmarkId);

  const [likeId, setLikeId] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const isLiked = Boolean(likeId);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  const trackedViewId = useRef<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!id) return;

    try {
      const commentsQuery = query(
        collection(db, "comments"),
        where("noteId", "==", id)
      );

      const snap = await getDocs(commentsQuery);

      const data: Comment[] = snap.docs
        .map((commentDoc) => ({
          id: commentDoc.id,
          ...(commentDoc.data() as Omit<Comment, "id">),
        }))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        );

      setComments(data);
    } catch (err) {
      console.error("COMMENTS FETCH ERROR:", err);
    }
  }, [id]);

  useEffect(() => {
    async function fetchNote() {
      if (!id) return;

      setLoading(true);
      setNote(null);

      try {
        const snap = await getDoc(doc(db, "notes", id));

        if (!snap.exists()) {
          setNote(null);
          return;
        }

        setNote({
          id: snap.id,
          ...(snap.data() as Omit<Note, "id">),
        });
      } catch (err) {
        console.error("NOTE FETCH ERROR:", err);
        toast.error("Could not load this note.");
      } finally {
        setLoading(false);
      }
    }

    fetchNote();
    fetchComments();
  }, [id, fetchComments]);

  useEffect(() => {
    async function increaseViews() {
      if (!id || trackedViewId.current === id) return;

      trackedViewId.current = id;

      try {
        await updateDoc(doc(db, "notes", id), {
          views: increment(1),
        });
      } catch (err) {
        console.error("VIEW UPDATE ERROR:", err);
      }
    }

    increaseViews();
  }, [id]);

  useEffect(() => {
    async function fetchUserActions() {
      if (!user || !id) {
        setLikeId(null);
        setBookmarkId(null);
        return;
      }

      try {
        const likesQuery = query(
          collection(db, "likes"),
          where("userId", "==", user.uid),
          where("noteId", "==", id)
        );

        const bookmarksQuery = query(
          collection(db, "bookmarks"),
          where("userId", "==", user.uid),
          where("noteId", "==", id)
        );

        const allLikesQuery = query(
          collection(db, "likes"),
          where("noteId", "==", id)
        );

        const [likesSnap, bookmarksSnap, allLikesSnap] =
          await Promise.all([
            getDocs(likesQuery),
            getDocs(bookmarksQuery),
            getDocs(allLikesQuery),
          ]);

        setLikeId(likesSnap.docs[0]?.id || null);
        setBookmarkId(bookmarksSnap.docs[0]?.id || null);
        setLikesCount(allLikesSnap.docs.length);
      } catch (err) {
        console.error("USER ACTIONS ERROR:", err);
      }
    }

    fetchUserActions();
  }, [user, id]);

  async function handleCommentSubmit() {
    if (!user) {
      router.push("/signin");
      return;
    }

    if (!note?.id) return;

    if (!commentText.trim()) {
      toast.error("Please write a comment.");
      return;
    }

    try {
      setCommenting(true);

      await addDoc(collection(db, "comments"), {
        noteId: note.id,
        userId: user.uid,
        userName: user.displayName || user.email || "User",
        userAvatar: user.photoURL || "",
        text: commentText.trim(),
        createdAt: new Date().toISOString(),
      });

      if (note.uploaderId && note.uploaderId !== user.uid) {
        await sendNotification({
          userId: note.uploaderId,
          title: "New Comment 💬",
          message: `${user.displayName || user.email || "Someone"} commented on your note "${note.title}".`,
          type: "comment",
          noteId: note.id,
        });
      }

      setCommentText("");
      toast.success("Comment added.");
      await fetchComments();
    } catch (err) {
      console.error("COMMENT ERROR:", err);
      toast.error("Failed to add comment.");
    } finally {
      setCommenting(false);
    }
  }

  async function deleteComment(commentId: string) {
    if (!user) return;

    const ok = confirm("Delete this comment?");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "comments", commentId));
      toast.success("Comment deleted.");
      await fetchComments();
    } catch (err) {
      console.error("DELETE COMMENT ERROR:", err);
      toast.error("Failed to delete comment.");
    }
  }

  async function handleLike() {
    if (!user) {
      router.push("/signin");
      return;
    }

    if (!note?.id) return;

    try {
      const noteRef = doc(db, "notes", note.id);

      if (likeId) {
        await deleteDoc(doc(db, "likes", likeId));

        await updateDoc(noteRef, {
          likes: increment(-1),
        });

        setLikeId(null);
        setLikesCount((prev) => Math.max(0, prev - 1));
      } else {
        const newLike = await addDoc(collection(db, "likes"), {
          userId: user.uid,
          noteId: note.id,
          noteTitle: note.title,
          createdAt: new Date().toISOString(),
        });

        await updateDoc(noteRef, {
          likes: increment(1),
        });

        if (note.uploaderId && note.uploaderId !== user.uid) {
          await sendNotification({
            userId: note.uploaderId,
            title: "New Like ❤️",
            message: `${user.displayName || user.email || "Someone"} liked your note "${note.title}".`,
            type: "like",
            noteId: note.id,
          });
        }

        setLikeId(newLike.id);
        setLikesCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error("LIKE ERROR:", err);
      toast.error("Like action failed.");
    }
  }

  async function handleBookmark() {
    if (!user) {
      router.push("/signin");
      return;
    }

    if (!note?.id) return;

    try {
      if (bookmarkId) {
        await deleteDoc(doc(db, "bookmarks", bookmarkId));
        setBookmarkId(null);
        toast.success("Removed from saved notes.");
      } else {
        const newBookmark = await addDoc(collection(db, "bookmarks"), {
          userId: user.uid,
          noteId: note.id,
          title: note.title,
          subject: note.subject,
          class: note.class,
          topic: note.topic,
          pdfURL: note.pdfURL,
          thumbnailUrl: note.thumbnailUrl || "",
          createdAt: new Date().toISOString(),
        });

        if (note.uploaderId && note.uploaderId !== user.uid) {
          await sendNotification({
            userId: note.uploaderId,
            title: "New Save 🔖",
            message: `${user.displayName || user.email || "Someone"} saved your note "${note.title}".`,
            type: "bookmark",
            noteId: note.id,
          });
        }

        setBookmarkId(newBookmark.id);
        toast.success("Saved note.");
      }
    } catch (err) {
      console.error("BOOKMARK ERROR:", err);
      toast.error("Bookmark failed.");
    }
  }

  async function handleDownload() {
    if (!note?.id) return;

    if (!user) {
      router.push("/signin");
      return;
    }

    try {
      await updateDoc(doc(db, "notes", note.id), {
        downloadsCount: increment(1),
      });

      window.open(note.pdfURL, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("DOWNLOAD ERROR:", err);
      toast.error("Download failed.");
    }
  }

  async function handleReportSubmit() {
    if (!user) {
      router.push("/signin");
      return;
    }

    if (!note?.id) return;

    if (!reportReason.trim()) {
      toast.error("Please select a report reason.");
      return;
    }

    try {
      setReporting(true);

      await addDoc(collection(db, "reports"), {
        noteId: note.id,
        noteTitle: note.title,
        noteUploaderId: note.uploaderId,
        reporterId: user.uid,
        reporterEmail: user.email || "",
        reason: reportReason,
        details: reportDetails.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      toast.success("Report submitted. Admin will review it.");
      setReportOpen(false);
      setReportReason("");
      setReportDetails("");
    } catch (err) {
      console.error("REPORT ERROR:", err);
      toast.error("Failed to submit report.");
    } finally {
      setReporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-[var(--foreground)]">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--card)]">
            <RefreshCw className="animate-spin text-red-500" size={28} />
          </div>
          <h1 className="mt-5 text-xl font-black">Loading note</h1>
          <p className={`mt-2 text-sm ${mutedText}`}>
            Opening PDF and note details...
          </p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 text-[var(--foreground)]">
        <div className={`${cardClass} w-full max-w-md p-8 text-center`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <FileText size={32} />
          </div>

          <h1 className="mt-5 text-2xl font-black">Note not found</h1>
          <p className={`mt-2 text-sm ${mutedText}`}>
            This note may have been removed or the link may be incorrect.
          </p>

          <button
            onClick={() => router.push("/browse")}
            className="mt-6 rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-500"
          >
            Back to Browse
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-w-0 pb-32 text-[var(--foreground)] lg:pb-10">
      <div className="mx-auto w-full max-w-[1600px]">
        <button
          onClick={() => router.push("/browse")}
          className="group inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          <ArrowLeft
            size={16}
            className="transition group-hover:-translate-x-1"
          />
          Back to Browse
        </button>

        <div className="mt-5 grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(340px,0.8fr)] xl:gap-6">
          {/* MAIN CONTENT */}
          <div className="min-w-0 space-y-5">
            {/* PDF VIEWER */}
            <section className={`${cardClass} min-w-0 overflow-hidden`}>
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                    <FileText size={19} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold">
                      PDF Preview
                    </h2>
                    <p className={`mt-0.5 text-xs ${mutedText}`}>
                      Preview the uploaded study material
                    </p>
                  </div>
                </div>

                <a
                  href={note.pdfURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-red-500/40"
                >
                  <FileText size={15} />
                  <span className="hidden sm:inline">Open PDF</span>
                </a>
              </div>

              <PDFViewer file={note.pdfURL} />
            </section>

            {/* DISCLAIMER */}
            <section className="rounded-3xl border border-yellow-500/20 bg-yellow-500/5 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl bg-yellow-500/10 p-2 text-yellow-500">
                  <AlertTriangle size={19} />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-yellow-600 dark:text-yellow-300">
                    Educational Content Disclaimer
                  </h2>

                  <p className="mt-2 text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                    Edukrate is a student-driven platform where students
                    share notes to help each other learn. Some uploaded files
                    may contain watermarks, logos, or references to schools,
                    coaching institutes, websites, or educational
                    organizations. Such materials are shared by users for
                    educational and non-commercial purposes only. Edukrate
                    does not claim ownership of third-party content,
                    trademarks, or branding. If you are the rightful owner of
                    any material and want it reviewed or removed, contact us
                    at{" "}
                    <a
                      href="mailto:legal@edukrate.co.in"
                      className="font-semibold text-yellow-600 underline-offset-4 hover:underline dark:text-yellow-300"
                    >
                      legal@edukrate.co.in
                    </a>
                    .
                  </p>
                </div>
              </div>
            </section>

            {/* COMMENTS */}
            <section className={`${cardClass} p-4 sm:p-6`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                    <MessageCircle size={20} />
                  </div>

                  <div>
                    <h2 className="text-lg font-black sm:text-xl">
                      Discussion
                    </h2>
                    <p className={`text-xs ${mutedText}`}>
                      {comments.length}{" "}
                      {comments.length === 1 ? "comment" : "comments"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    user
                      ? "Ask a question or share feedback..."
                      : "Sign in to join the discussion..."
                  }
                  rows={3}
                  disabled={!user}
                  className={inputClass}
                />

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleCommentSubmit}
                    disabled={commenting || !user}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {commenting && (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    {commenting ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {comments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-soft)] px-4 py-8 text-center">
                    <MessageCircle
                      size={25}
                      className="mx-auto text-[var(--muted)]"
                    />
                    <p className="mt-3 text-sm font-semibold">
                      No comments yet
                    </p>
                    <p className={`mt-1 text-xs ${mutedText}`}>
                      Start the discussion by posting the first comment.
                    </p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <article
                      key={comment.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/profile/${comment.userId}`}
                          className="flex min-w-0 items-center gap-3"
                        >
                          <UserAvatar
                            name={comment.userName}
                            src={comment.userAvatar || ""}
                            size="sm"
                          />

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {comment.userName}
                            </p>
                            <p className={`mt-0.5 text-xs ${mutedText}`}>
                              {formatDate(comment.createdAt)}
                            </p>
                          </div>
                        </Link>

                        {user?.uid === comment.userId && (
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-500 transition hover:bg-red-500/20"
                            aria-label="Delete comment"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--muted-strong)]">
                        {comment.text}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* DETAILS SIDEBAR */}
          <aside className="min-w-0 space-y-5 xl:sticky xl:top-6">
            {/* NOTE INFORMATION */}
            <section className={`${cardClass} p-5 sm:p-6`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs font-bold text-green-600 dark:text-green-400">
                  <CheckCircle2 size={13} />
                  Approved Material
                </span>
              </div>

              <h1 className="mt-4 break-words text-2xl font-black leading-tight sm:text-3xl">
                {note.title}
              </h1>

              <p className={`mt-3 text-sm leading-relaxed ${mutedText}`}>
                {note.description || "No description provided."}
              </p>

              <div className="mt-5">
                <AISummaryCard
                  text={`${note.title || ""}\n\n${note.description || ""}`}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <InfoBox
                  label="Subject"
                  value={note.subject || "N/A"}
                />
                <InfoBox
                  label="Class"
                  value={note.class || "N/A"}
                />
                <InfoBox
                  label="Topic"
                  value={note.topic || "N/A"}
                />
                <InfoBox
                  label="Downloads"
                  value={String(note.downloadsCount ?? 0)}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <InfoBox
                  label="Likes"
                  value={String(likesCount)}
                />
                <InfoBox
                  label="Views"
                  value={String(note.views ?? 0)}
                />
              </div>

              {note.tags?.length > 0 && (
                <div className="mt-5">
                  <p className={`mb-3 text-xs font-bold uppercase tracking-wider ${mutedText}`}>
                    Topics and Tags
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {note.tags.map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        className="max-w-full truncate rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-xs font-medium text-[var(--muted-strong)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* DESKTOP ACTIONS */}
              <div className="mt-6 hidden flex-col gap-3 lg:flex">
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-sm font-black text-white transition hover:bg-red-500"
                >
                  <Download size={18} />
                  {user ? "Download PDF" : "Login to Download"}
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleLike}
                    className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                      isLiked
                        ? "border-red-500/30 bg-red-500/10 text-red-500"
                        : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--foreground)] hover:border-red-500/30"
                    }`}
                  >
                    <Heart
                      size={17}
                      className={isLiked ? "fill-red-500" : ""}
                    />
                    {isLiked ? "Liked" : "Like"}
                  </button>

                  <button
                    onClick={handleBookmark}
                    className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                      isBookmarked
                        ? "border-red-500/30 bg-red-500/10 text-red-500"
                        : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--foreground)] hover:border-red-500/30"
                    }`}
                  >
                    <Bookmark
                      size={17}
                      className={isBookmarked ? "fill-current" : ""}
                    />
                    {isBookmarked ? "Saved" : "Save"}
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (!user) {
                      router.push("/signin");
                      return;
                    }

                    setReportOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-3 text-sm font-bold text-yellow-600 transition hover:bg-yellow-500/10 dark:text-yellow-400"
                >
                  <AlertTriangle size={17} />
                  Report Note
                </button>
              </div>
            </section>

            {/* UPLOADER */}
            <section className={`${cardClass} p-5 sm:p-6`}>
              <p className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
                Uploaded By
              </p>

              <div className="mt-4 flex items-center gap-3">
                <UserAvatar
                  name={note.uploaderName || "User"}
                  size="md"
                />

                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold">
                    {note.uploaderName || "Edukrate User"}
                  </h3>
                  <p className={`mt-1 text-xs ${mutedText}`}>
                    Edukrate Contributor
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (note.uploaderId) {
                    router.push(`/profile/${note.uploaderId}`);
                  }
                }}
                disabled={!note.uploaderId}
                className="mt-5 w-full rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-5 py-3 text-sm font-bold text-[var(--foreground)] transition hover:border-red-500/40 disabled:opacity-50"
              >
                View Profile
              </button>
            </section>

            {/* SAFETY INFO */}
            <section className="rounded-3xl border border-green-500/20 bg-green-500/5 p-5">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 size={18} />
                <p className="text-sm font-bold">Moderation Approved</p>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                This note was reviewed and approved before appearing on
                Edukrate.
              </p>
            </section>
          </aside>
        </div>
      </div>

      {/* MOBILE ACTION BAR */}
      <div className="fixed inset-x-0 bottom-[76px] z-40 border-t border-[var(--border)] bg-[var(--card)]/95 px-3 pb-3 pt-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-3xl gap-2">
          <button
            onClick={handleLike}
            className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${
              isLiked
                ? "border-red-500/30 bg-red-500/10 text-red-500"
                : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--foreground)]"
            }`}
            aria-label="Like note"
          >
            <Heart
              size={18}
              className={isLiked ? "fill-red-500" : ""}
            />
            <span>{likesCount}</span>
          </button>

          <button
            onClick={handleBookmark}
            className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${
              isBookmarked
                ? "border-red-500/30 bg-red-500/10 text-red-500"
                : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--foreground)]"
            }`}
            aria-label="Save note"
          >
            <Bookmark
              size={18}
              className={isBookmarked ? "fill-current" : ""}
            />
            <span className="hidden min-[380px]:inline">
              {isBookmarked ? "Saved" : "Save"}
            </span>
          </button>

          <button
            onClick={handleDownload}
            className="flex h-12 flex-[1.5] items-center justify-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-bold text-white transition hover:bg-red-500"
          >
            <Download size={18} />
            Download
          </button>
        </div>
      </div>

      {/* REPORT MODAL */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReportOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 text-[var(--foreground)] shadow-2xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black sm:text-2xl">
                  Report Note
                </h2>
                <p className={`mt-1 text-xs ${mutedText}`}>
                  Help us keep Edukrate useful and safe.
                </p>
              </div>

              <button
                onClick={() => setReportOpen(false)}
                className="rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-2 text-[var(--muted)] transition hover:text-[var(--foreground)]"
                aria-label="Close report modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="reportReason"
                  className="mb-2 block text-sm font-semibold"
                >
                  Reason
                </label>

                <select
                  id="reportReason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a reason</option>
                  <option value="Wrong or misleading content">
                    Wrong or misleading content
                  </option>
                  <option value="Spam or low quality">
                    Spam or low quality
                  </option>
                  <option value="Inappropriate content">
                    Inappropriate content
                  </option>
                  <option value="Copyright issue">
                    Copyright issue
                  </option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="reportDetails"
                  className="mb-2 block text-sm font-semibold"
                >
                  Additional details (optional)
                </label>

                <textarea
                  id="reportDetails"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={4}
                  placeholder="Explain the issue briefly..."
                  className={inputClass}
                />
              </div>

              <button
                onClick={handleReportSubmit}
                disabled={reporting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reporting && (
                  <Loader2 size={17} className="animate-spin" />
                )}
                {reporting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3.5">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
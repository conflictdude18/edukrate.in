
"use client";
import {
  query,
  where,
} from "firebase/firestore";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  ArrowDownWideNarrow,
  BookOpen,
  Check,
  Download,
  Eye,
  FileText,
  Heart,
  Layers,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { db } from "@/firebase/firebase";
import type { Note } from "@/types/note";
import { useAuth } from "@/contexts/AuthContext";
import NoteCardSkeleton from "@/components/NoteCardSkeleton";

type SortOption = "latest" | "downloads" | "likes" | "views";

export default function BrowseNotesPage() {
  const { user } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [boardFilter, setBoardFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [search, setSearch] = useState("");

  async function fetchNotes(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const approvedNotesQuery = query(
        collection(db, "notes"),
        where("status", "==", "approved")
      );

      const snap = await getDocs(approvedNotesQuery);

      const data: Note[] = snap.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<Note, "id">),
      }));

      setNotes(data);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load notes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get("subject");

    if (subject) {
      setSubjectFilter(subject.trim());
    }
  }, []);

  const subjects = useMemo(
    () => getUniqueValues(notes.map((note) => note.subject)),
    [notes]
  );

  const classes = useMemo(
    () =>
      getUniqueValues(
        notes.map((note) => normalizeClassName(note.class))
      ).sort((a, b) => Number(a) - Number(b)),
    [notes]
  );

  const boards = useMemo(
    () => getUniqueValues(notes.map((note) => note.board)),
    [notes]
  );

  const types = useMemo(
    () => getUniqueValues(notes.map((note) => note.type)),
    [notes]
  );

  const filteredNotes = useMemo(() => {
    const normalizedClass = normalizeText(classFilter);
    const normalizedSubject = normalizeText(subjectFilter);
    const normalizedBoard = normalizeText(boardFilter);
    const normalizedType = normalizeText(typeFilter);
    const normalizedSearch = normalizeText(search);

    const result = notes.filter((note) => {
      const noteClass = normalizeText(normalizeClassName(note.class));
      const noteSubject = normalizeText(note.subject);
      const noteBoard = normalizeText(note.board);
      const noteType = normalizeText(note.type);

      const searchableText = [
        note.title,
        note.subject,
        note.class,
        note.board,
        note.topic,
        note.type,
        note.description,
        ...(Array.isArray(note.tags) ? note.tags : []),
        ...(Array.isArray(note.keywords) ? note.keywords : []),
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedClass || noteClass === normalizedClass) &&
        (!normalizedSubject || noteSubject === normalizedSubject) &&
        (!normalizedBoard || noteBoard === normalizedBoard) &&
        (!normalizedType || noteType === normalizedType) &&
        (!normalizedSearch || searchableText.includes(normalizedSearch))
      );
    });

    return result.sort((a, b) => {
      if (sortBy === "downloads") return getDownloads(b) - getDownloads(a);
      if (sortBy === "likes") return getNumber(b.likes) - getNumber(a.likes);
      if (sortBy === "views") return getNumber(b.views) - getNumber(a.views);

      return getCreatedTime(b.createdAt) - getCreatedTime(a.createdAt);
    });
  }, [
    notes,
    classFilter,
    subjectFilter,
    boardFilter,
    typeFilter,
    sortBy,
    search,
  ]);

  const hasFilters = Boolean(
    search || classFilter || subjectFilter || boardFilter || typeFilter
  );

  function clearFilters() {
    setSearch("");
    setClassFilter("");
    setSubjectFilter("");
    setBoardFilter("");
    setTypeFilter("");
    setSortBy("latest");
    setFiltersOpen(false);

    const url = new URL(window.location.href);
    url.searchParams.delete("subject");

    window.history.replaceState(
      {},
      "",
      url.pathname + url.search + url.hash
    );
  }

  function selectSubject(subject: string) {
    setSubjectFilter(subject);

    const url = new URL(window.location.href);

    if (subject) {
      url.searchParams.set("subject", subject);
    } else {
      url.searchParams.delete("subject");
    }

    window.history.replaceState(
      {},
      "",
      url.pathname + url.search + url.hash
    );
  }

  return (
    <main className="w-full min-w-0 space-y-6 pb-24 text-[var(--foreground)]">

      {/* Page heading */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-red-600/[0.06] blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-red-500">
              <BookOpen size={15} />
              Edukrate Library
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Browse Notes
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
              Explore community-shared notes, revision material and
              study resources. Find what you need and keep learning.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[390px]">
            <OverviewStat
              icon={<FileText size={17} />}
              value={notes.length}
              label="Notes"
            />
            <OverviewStat
              icon={<Layers size={17} />}
              value={subjects.length}
              label="Subjects"
            />
            <OverviewStat
              icon={<BookOpen size={17} />}
              value={classes.length}
              label="Classes"
            />
          </div>
        </div>
      </section>

      {/* Search and filters */}
      <section className="sticky top-2 z-20 rounded-2xl border border-[var(--border)] bg-[var(--background)]/95 p-3 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-4">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notes, chapters, subjects..."
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-11 pr-11 text-sm font-semibold text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-red-500/50"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-red-500/10 hover:text-red-500"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((previous) => !previous)}
            aria-expanded={filtersOpen}
            className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-bold text-[var(--foreground)] transition hover:border-red-500/40 md:hidden"
          >
            <SlidersHorizontal size={17} />
            <span>Filters</span>
          </button>

          <button
            type="button"
            onClick={() => fetchNotes(true)}
            disabled={refreshing}
            aria-label="Refresh notes"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] transition hover:border-red-500/40 hover:text-red-500 disabled:opacity-50 sm:w-auto sm:px-4"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            <span className="ml-2 hidden text-xs font-bold sm:inline">
              Refresh
            </span>
          </button>
        </div>

        <div className={`${filtersOpen ? "block" : "hidden"} mt-4 md:block`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <FilterSelect
              label="Class"
              value={classFilter}
              onChange={setClassFilter}
              options={classes}
              placeholder="All Classes"
              formatOption={(value) =>
                /^\d+$/.test(value) ? `Class ${value}` : value
              }
            />

            <FilterSelect
              label="Subject"
              value={subjectFilter}
              onChange={selectSubject}
              options={subjects}
              placeholder="All Subjects"
            />

            <FilterSelect
              label="Board"
              value={boardFilter}
              onChange={setBoardFilter}
              options={boards}
              placeholder="All Boards"
            />

            <FilterSelect
              label="Type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={types}
              placeholder="All Types"
            />

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                <ArrowDownWideNarrow size={13} />
                Sort by
              </label>

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as SortOption)
                }
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-bold text-[var(--foreground)] outline-none focus:border-red-500/50"
              >
                <option value="latest">Latest added</option>
                <option value="downloads">Most downloaded</option>
                <option value="likes">Most liked</option>
                <option value="views">Most viewed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subject shortcuts */}
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">
            <Sparkles size={13} />
            Explore subjects
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <Chip
              label="All subjects"
              active={!subjectFilter}
              onClick={() => selectSubject("")}
            />

            {subjects.slice(0, 15).map((subject) => (
              <Chip
                key={subject}
                label={subject}
                active={
                  normalizeText(subjectFilter) === normalizeText(subject)
                }
                onClick={() => selectSubject(subject)}
              />
            ))}
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
            <p className="text-xs text-[var(--muted)]">
              Showing results with your selected filters.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-xs font-black text-red-500 transition hover:text-red-400"
            >
              <X size={14} />
              Clear all filters
            </button>
          </div>
        )}
      </section>

      {/* Results heading */}
      <section>
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-500">
              <Sparkles size={14} />
              Community collection
            </div>

            <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              Available Notes
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              {loading
                ? "Finding study resources..."
                : `${filteredNotes.length} notes matching your search`}
            </p>
          </div>

          {!loading && (
            <div className="flex items-center gap-2 self-start rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-bold text-[var(--muted)] sm:self-auto">
              <FileText size={14} />
              {filteredNotes.length} / {notes.length} results
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <NoteCardSkeleton key={index} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredNotes.length === 0 && (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] px-5 py-16 text-center sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500">
              <FileText size={30} />
            </div>

            <h2 className="mt-5 text-2xl font-black">
              No notes found
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
              We couldn't find notes matching your current search.
              Try another keyword or adjust your filters.
            </p>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-500"
              >
                <X size={16} />
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Notes grid */}
        {!loading && filteredNotes.length > 0 && (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                href={user ? `/notes/${note.id}` : "/signin"}
                isLoggedIn={Boolean(user)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

/* -------------------- Components -------------------- */

function OverviewStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--background)]/70 p-3 sm:p-4">
      <div className="flex items-center gap-2 text-red-500">
        {icon}
        <span className="truncate text-[10px] font-bold uppercase tracking-wide text-[var(--muted)] sm:text-xs">
          {label}
        </span>
      </div>

      <p className="mt-2 text-xl font-black tabular-nums sm:text-2xl">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function NoteCard({
  note,
  href,
  isLoggedIn,
}: {
  note: Note;
  href: string;
  isLoggedIn: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] transition duration-200 hover:-translate-y-1 hover:border-red-500/40 hover:shadow-xl hover:shadow-black/10"
    >
    {/* Thumbnail */}
    <div className="relative h-48 overflow-hidden bg-[var(--card-soft)] sm:h-52 lg:h-56">
      {note.thumbnailUrl ? (
        <img
          src={note.thumbnailUrl}
          alt={note.title || "Note thumbnail"}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(event) => {
            console.error("Thumbnail failed to load:", note.thumbnailUrl);
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <FileText size={42} className="text-[var(--muted)]" />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/65 to-transparent" />

      <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
          {formatClassLabel(note.class)}
        </span>

        {note.type && (
          <span className="rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
            {note.type}
          </span>
        )}
      </div>

      <div className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
        {note.board || "Community"}
      </div>
    </div>

      {/* Card content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2">
          <span className="inline-flex max-w-full items-center rounded-md bg-red-500/10 px-2.5 py-1 text-[10px] font-black text-red-500">
            <span className="truncate">{note.subject || "General"}</span>
          </span>
        </div>

        <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-black leading-snug transition group-hover:text-red-500">
          {note.title || "Untitled Note"}
        </h3>

        <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-[var(--muted)]">
          {note.description || note.topic || "No description added."}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
          <div className="flex min-w-0 items-center gap-3 text-xs font-semibold text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <Download size={13} />
              {getDownloads(note)}
            </span>

            <span className="flex items-center gap-1">
              <Heart size={13} />
              {getNumber(note.likes)}
            </span>

            <span className="flex items-center gap-1">
              <Eye size={13} />
              {getNumber(note.views)}
            </span>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-3 py-2 text-[10px] font-black text-[var(--background)] transition group-hover:bg-red-600 group-hover:text-white">
            {isLoggedIn ? "View note" : "Login"}
            <ArrowRightIcon />
          </span>
        </div>
      </div>
    </Link>
  );
}

function ArrowRightIcon() {
  return <span aria-hidden="true">→</span>;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  formatOption,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  formatOption?: (value: string) => string;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">
        <SlidersHorizontal size={13} />
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-bold text-[var(--foreground)] outline-none transition focus:border-red-500/50"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption ? formatOption(option) : option}
          </option>
        ))}
      </select>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-red-600 px-4 py-2 text-xs font-black text-white"
          : "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-xs font-bold text-[var(--muted)] transition hover:border-red-500/40 hover:text-[var(--foreground)]"
      }
    >
      {active && <Check size={12} />}
      {label}
    </button>
  );
}

/* -------------------- Helpers -------------------- */

function getUniqueValues(values: Array<string | undefined>) {
  const map = new Map<string, string>();

  values.forEach((value) => {
    if (!value?.trim()) return;

    const cleaned = value.trim();
    const normalized = cleaned.toLowerCase();

    if (!map.has(normalized)) {
      map.set(normalized, cleaned);
    }
  });

  return Array.from(map.values());
}

function normalizeText(value?: string) {
  return (value || "").toLowerCase().trim();
}

function normalizeClassName(value?: string) {
  const match = value?.match(/\d+/);
  return match ? match[0] : normalizeText(value);
}

function formatClassLabel(value?: string) {
  const normalized = normalizeClassName(value);

  if (!normalized) return "Class not set";
  if (/^\d+$/.test(normalized)) return `Class ${normalized}`;

  return value || "Class not set";
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getDownloads(note: Note) {
  return getNumber(note.downloads) || getNumber(note.downloadsCount);
}

function getCreatedTime(value: unknown) {
  if (!value) return 0;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().getTime();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    return value.seconds * 1000;
  }

  if (typeof value === "string") {
    return new Date(value).getTime() || 0;
  }

  return 0;
}


"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import VideoCard from "@/components/videos/VideoCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import EdukratePlayer from "@/components/videos/EdukratePlayer";
import {
  getVideosPage,
  searchVideosByTokens,
  type VideosPage,
} from "@/lib/videos";

import type { Video } from "@/types/video";

import {
  Search,
  SlidersHorizontal,
  Sparkles,
  Video as VideoIcon,
  RefreshCw,
  X,
  PlayCircle,
} from "lucide-react";

const PAGE_SIZE = 20;

const CLASSES = ["All", "9", "10", "11", "12", "JEE", "NEET"];

const SUBJECTS = [
  "All",
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
];

type YouTubeSearchResult = {
  videoId: string;
  title: string;
  description: string;
  channelName: string;
  thumbnailUrl: string;
  publishedAt: string;
  watchUrl?: string;
};

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [lastDocument, setLastDocument] =
    useState<VideosPage["lastDocument"]>(null);

  const [hasMore, setHasMore] = useState(true);

  const loadingRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [youtubeResults, setYoutubeResults] = useState<
    YouTubeSearchResult[]
  >([]);

  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [localSearchResults, setLocalSearchResults] = useState<Video[]>([]);
  const [searchError, setSearchError] = useState("");

  const [selectedYoutubeVideo, setSelectedYoutubeVideo] =
    useState<YouTubeSearchResult | null>(null);

  // Fetch the next batch of videos.
  const loadMoreVideos = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    loadingRef.current = true;

    const isInitialLoad = lastDocument === null;

    if (isInitialLoad) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await getVideosPage(
        lastDocument,
        PAGE_SIZE
      );

      setVideos((previous) => {
        const existingIds = new Set(
          previous.map((video) => video.id)
        );

        const newVideos = result.videos.filter(
          (video) => !existingIds.has(video.id)
        );

        return [...previous, ...newVideos];
      });

      setLastDocument(result.lastDocument);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Failed to load videos:", error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastDocument, hasMore]);

  // Initial video fetch.
  useEffect(() => {
    void loadMoreVideos();

    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatically load more when the user approaches the bottom.
  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || !hasMore || loading || search.trim()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreVideos();
        }
      },
      {
        rootMargin: "400px",
      }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [hasMore, loading, loadMoreVideos, search]);

// Search indexed Firestore videos and YouTube in parallel.
useEffect(() => {
  const queryText = search.trim();

  if (!queryText) {
    setLocalSearchResults([]);
    setYoutubeResults([]);
    setSearchLoading(false);
    setYoutubeLoading(false);
    setSearchError("");
    return;
  }

  const tokens = [
    ...new Set(
      queryText
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 2)
    ),
  ].slice(0, 30);

  if (tokens.length === 0) {
    setLocalSearchResults([]);
    setYoutubeResults([]);
    return;
  }

  let active = true;

  const timeout = setTimeout(async () => {
    setSearchLoading(true);
    setYoutubeLoading(queryText.length >= 3);
    setSearchError("");

    const localPromise = searchVideosByTokens(tokens);

    const youtubePromise =
      queryText.length >= 3
        ? fetch(
            `/api/videos/search?q=${encodeURIComponent(queryText)}`
          ).then(async (response) => {
            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || "YouTube search failed");
            }

            return data.results || [];
          })
        : Promise.resolve([]);

    const [localResult, youtubeResult] =
      await Promise.allSettled([
        localPromise,
        youtubePromise,
      ]);

    if (active) {
      if (localResult.status === "fulfilled") {
        setLocalSearchResults(localResult.value);
      } else {
        console.error("Firestore search failed:", localResult.reason);
        setLocalSearchResults([]);
        setSearchError("Could not search Edukrate videos.");
      }

      if (youtubeResult.status === "fulfilled") {
        setYoutubeResults(youtubeResult.value);
      } else {
        console.error("YouTube search failed:", youtubeResult.reason);
        setYoutubeResults([]);
        setSearchError((previous) =>
          previous
            ? `${previous} YouTube search also failed.`
            : "Could not search YouTube right now."
        );
      }
    }

    if (active) {
      setSearchLoading(false);
      setYoutubeLoading(false);
    }
  }, 450);

  return () => {
    active = false;
    clearTimeout(timeout);
  };
}, [search]);

// Apply class and subject filters to the active result set.
const filteredVideos = useMemo(() => {
  const sourceVideos = search.trim()
    ? localSearchResults
    : videos;

  const normalize = (value: unknown) =>
    String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const classAliases: Record<string, string[]> = {
    "9": ["9", "class9", "9th", "ix", "classix"],
    "10": ["10", "class10", "10th", "x", "classx"],
    "11": ["11", "class11", "11th", "xi", "classxi"],
    "12": ["12", "class12", "12th", "xii", "classxii"],
  };

  const matchesClass = (video: Video) => {
    if (selectedClass === "All") return true;

    const classValue = normalize(video.classLevel);
    const examValue = normalize(video.exam);

    if (
      selectedClass === "JEE" ||
      selectedClass === "NEET"
    ) {
      const selected = normalize(selectedClass);

      return (
        examValue.includes(selected) ||
        classValue.includes(selected)
      );
    }

    const aliases = classAliases[selectedClass] ?? [
      normalize(selectedClass),
    ];

    return aliases.some(
      (alias) =>
        classValue === alias ||
        classValue.includes(alias) ||
        examValue === alias ||
        examValue.includes(alias)
    );
  };

  const matchesSubject = (video: Video) => {
    if (selectedSubject === "All") return true;

    const subjectValue = normalize(video.subject);
    const selected = normalize(selectedSubject);

    return (
      subjectValue === selected ||
      subjectValue.includes(selected)
    );
  };

  return sourceVideos.filter(
    (video) =>
      matchesClass(video) &&
      matchesSubject(video)
  );
}, [
  videos,
  localSearchResults,
  search,
  selectedClass,
  selectedSubject,
]);

  function resetFilters() {
    setSearch("");
    setSelectedClass("All");
    setSelectedSubject("All");
    setYoutubeResults([]);
    setSearchError("");
    setFiltersOpen(false);
  }

  const hasFilters =
    Boolean(search.trim()) ||
    selectedClass !== "All" ||
    selectedSubject !== "All";

  const filterButton = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-2.5 text-xs font-bold transition ${
      active
        ? "border-red-500 bg-red-600 text-white shadow-lg shadow-red-950/20"
        : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted)] hover:border-red-500/40 hover:text-[var(--foreground)]"
    }`;

  // Initial loading screen.
  if (loading && videos.length === 0) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 pb-24 text-[var(--foreground)] md:space-y-7 md:pb-10">

      {/* Page header */}
      <header className="flex flex-col justify-between gap-5 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-red-500">
            <VideoIcon size={15} />
            Edukrate / Learning
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Video Library
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            Find lessons, revise important concepts, and prepare
            for your exams with curated educational videos.
          </p>
        </div>
      </header>

      {/* Search and filters */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />

            <input
              id="video-search"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search lessons, chapters, topics, teachers..."
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card-soft)] pl-11 pr-11 text-sm font-medium text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--border)] hover:text-[var(--foreground)]"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setFiltersOpen((previous) => !previous)
            }
            aria-expanded={filtersOpen}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-5 text-sm font-bold text-[var(--foreground)] transition hover:border-red-500/40 md:hidden"
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="hidden h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-bold text-[var(--muted)] transition hover:border-red-500/40 hover:text-[var(--foreground)] sm:flex"
            >
              <RefreshCw size={15} />
              Reset
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div
          className={`${
            filtersOpen ? "block" : "hidden"
          } mt-5 border-t border-[var(--border)] pt-5 md:block`}
        >
          <div className="mb-3 flex items-center gap-2">
            <SlidersHorizontal
              size={15}
              className="text-red-500"
            />
            <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
              Class / Exam
            </h2>
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
            {CLASSES.map((item) => {
              const label =
                item === "All"
                  ? "All"
                  : item === "JEE" || item === "NEET"
                    ? item
                    : `Class ${item}`;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSelectedClass(item)}
                  aria-pressed={selectedClass === item}
                  className={filterButton(
                    selectedClass === item
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <label
                htmlFor="video-subject"
                className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]"
              >
                Subject
              </label>

              <select
                id="video-subject"
                value={selectedSubject}
                onChange={(event) =>
                  setSelectedSubject(event.target.value)
                }
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none transition focus:border-red-500/60 sm:w-52"
              >
                {SUBJECTS.map((subject) => (
                  <option
                    key={subject}
                    value={subject}
                    className="bg-[var(--card)] text-[var(--foreground)]"
                  >
                    {subject === "All"
                      ? "All subjects"
                      : subject}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <Sparkles
                size={14}
                className="text-red-500"
              />
              Discover lessons for your studies
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-400 sm:hidden"
              >
                <X size={14} />
                Clear all filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Lesson library */}
      <section className="min-w-0">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-500">
              <PlayCircle size={14} />
              Explore
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              {search.trim()
                ? "Search results"
                : "Explore lessons"}
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              {filteredVideos.length.toLocaleString()} matching{" "}
              {filteredVideos.length === 1
                ? "lesson"
                : "lessons"}
              {hasMore ? " loaded so far" : " available"}
            </p>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="hidden items-center gap-2 text-xs font-bold text-[var(--muted)] transition hover:text-red-500 sm:flex"
            >
              <X size={14} />
              Clear filters
            </button>
          )}
        </div>

        {filteredVideos.length > 0 ? (
          <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
              />
            ))}
          </div>
        ) : youtubeLoading ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-16 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
              <RefreshCw
                size={22}
                className="animate-spin text-red-500"
              />
            </div>

            <h3 className="text-lg font-black">
              Searching for more lessons
            </h3>

            <p className="mt-2 text-sm text-[var(--muted)]">
              Looking for matching educational videos on YouTube...
            </p>
          </div>
        ) : youtubeResults.length > 0 ? (
          <>
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
              <PlayCircle
                size={18}
                className="text-red-500"
              />
              <p className="text-xs font-semibold text-[var(--muted-strong)]">
                Showing additional results from YouTube
              </p>
            </div>

            <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {youtubeResults.map((video) => (
                <button
                  key={video.videoId}
                  type="button"
                  onClick={() =>
                    setSelectedYoutubeVideo(video)
                  }
                  className="group min-w-0 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] text-left transition duration-200 hover:-translate-y-1 hover:border-red-500/40"
                >
                  <div className="relative aspect-video overflow-hidden bg-[var(--card-soft)]">
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white opacity-90 shadow-xl transition group-hover:scale-110">
                        <PlayCircle size={25} />
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-black/75 px-2.5 py-1.5 text-[10px] font-bold text-white backdrop-blur">
                      <PlayCircle
                        size={12}
                        className="text-red-400"
                      />
                      YouTube
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="line-clamp-2 text-sm font-black leading-6 text-[var(--foreground)] transition group-hover:text-red-500 sm:text-base">
                      {video.title}
                    </h3>

                    <p className="mt-2 line-clamp-1 text-xs text-[var(--muted)]">
                      {video.channelName}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
                      <span className="text-xs font-bold text-red-500">
                        Watch lesson
                      </span>
                      <PlayCircle
                        size={17}
                        className="text-[var(--muted)] transition group-hover:text-red-500"
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-16 text-center sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/[0.07] text-red-500">
              <VideoIcon size={29} />
            </div>

            <h3 className="mt-5 text-xl font-black">
              No matching lessons found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              Try different keywords or change your class and subject
              filters to discover more lessons.
            </p>

            {searchError && (
              <p className="mt-3 text-sm text-red-500">
                {searchError}
              </p>
            )}

            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-500"
            >
              <RefreshCw size={15} />
              Reset search and filters
            </button>
          </div>
        )}

        {/* Infinite scroll trigger */}
        {hasMore && (
          <div
            ref={loadMoreRef}
            className="flex min-h-24 items-center justify-center py-8"
          >
            {loadingMore && <LoadingSpinner />}
          </div>
        )}

        {/* End of library */}
        {!hasMore && videos.length > 0 && (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            You've reached the end of the video library.
          </p>
        )}

        {/* Retry if a page failed to load */}
        {!hasMore && videos.length === 0 && !loading && (
          <button
            type="button"
            onClick={() => {
              setHasMore(true);
              setLastDocument(null);
            }}
            className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white"
          >
            Retry loading videos
          </button>
        )}
      </section>


        {/* Embedded YouTube player */}
        {selectedYoutubeVideo && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-2 backdrop-blur-md sm:p-5"
            onClick={() => setSelectedYoutubeVideo(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={selectedYoutubeVideo.title}
              className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-500">
                    Edukrate / Now Playing
                  </p>

                  <h2 className="mt-1 line-clamp-1 text-sm font-bold text-[var(--foreground)] sm:text-base">
                    {selectedYoutubeVideo.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedYoutubeVideo(null)}
                  aria-label="Close video player"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--card-soft)] hover:text-[var(--foreground)]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="grid min-w-0 grid-cols-1 gap-5 p-3 sm:gap-6 sm:p-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(260px,0.8fr)]">

                  {/* Main video details */}
                  <div className="min-w-0 space-y-5">

                    {/* Player */}
                    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-black shadow-sm">
                      <EdukratePlayer
                        videoId={selectedYoutubeVideo.videoId}
                        title={selectedYoutubeVideo.title}
                        autoplay
                      />
                    </section>

                    {/* Video information */}
                    <section className="space-y-3">
                      <h1 className="text-lg font-black leading-snug text-[var(--foreground)] sm:text-2xl">
                        {selectedYoutubeVideo.title}
                      </h1>

                      <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                        <PlayCircle size={16} className="text-red-500" />

                        <span className="font-semibold">
                          {selectedYoutubeVideo.channelName || "YouTube creator"}
                        </span>

                        {selectedYoutubeVideo.publishedAt && (
                          <>
                            <span>•</span>
                            <span>
                              {new Date(
                                selectedYoutubeVideo.publishedAt
                              ).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-500">
                          YouTube
                        </span>

                        <span className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-strong)]">
                          Additional search result
                        </span>
                      </div>
                    </section>

                    {/* Description */}
                    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 sm:p-5">
                      <h2 className="text-base font-black text-[var(--foreground)]">
                        Description
                      </h2>

                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--muted-strong)]">
                        {selectedYoutubeVideo.description?.trim() ||
                          "No description is available for this video."}
                      </p>

                      <a
                        href={
                          selectedYoutubeVideo.watchUrl ||
                          `https://www.youtube.com/watch?v=${selectedYoutubeVideo.videoId}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-red-500 transition hover:text-red-400"
                      >
                        Watch on YouTube
                        <PlayCircle size={14} />
                      </a>
                    </section>
                  </div>

                  {/* Recommendations */}
                  <aside className="min-w-0 space-y-4">
                    <div>
                      <h2 className="text-lg font-black text-[var(--foreground)]">
                        More videos
                      </h2>

                      <p className="mt-1 text-xs text-[var(--muted)]">
                        More results from your search
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      {youtubeResults
                        .filter(
                          (video) =>
                            video.videoId !== selectedYoutubeVideo.videoId
                        )
                        .slice(0, 8)
                        .map((video) => (
                          <button
                            key={video.videoId}
                            type="button"
                            onClick={() => setSelectedYoutubeVideo(video)}
                            className="group flex min-w-0 gap-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 text-left transition hover:border-red-500/50 hover:bg-[var(--card-soft)]"
                          >
                            <div className="relative aspect-video w-[42%] shrink-0 overflow-hidden rounded-lg bg-black">
                              <img
                                src={video.thumbnailUrl}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col justify-center">
                              <h3 className="line-clamp-2 text-xs font-bold leading-5 text-[var(--foreground)] transition group-hover:text-red-500">
                                {video.title}
                              </h3>

                              <p className="mt-1 line-clamp-1 text-[11px] text-[var(--muted)]">
                                {video.channelName}
                              </p>
                            </div>
                          </button>
                        ))}
                    </div>

                    {youtubeResults.length <= 1 && (
                      <p className="rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-4 text-xs text-[var(--muted)]">
                        No additional search results are available.
                      </p>
                    )}
                  </aside>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

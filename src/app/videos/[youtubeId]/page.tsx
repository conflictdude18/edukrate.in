
import Link from "next/link";
import { ArrowLeft, PlayCircle } from "lucide-react";

import { adminDb } from "@/lib/firebase-admin";
import EdukratePlayer from "@/components/videos/EdukratePlayer";

type Props = {
  params: Promise<{
    youtubeId: string;
  }>;
};

type VideoDetails = {
  id?: string;
  youtubeId?: string;
  title?: string;
  description?: string;
  channelName?: string;
  thumbnailUrl?: string;
  approved?: boolean;
  subject?: string | null;
  exam?: string | null;
  classLevel?: string | number | null;
};

export default async function VideoPlayerPage({ params }: Props) {
  const { youtubeId } = await params;

  if (!/^[a-zA-Z0-9_-]{11}$/.test(youtubeId)) {
    return (
      <main className="min-h-screen w-full p-5 text-[var(--foreground)] sm:p-8">
        <h1 className="text-xl font-bold">Invalid video ID</h1>

        <p className="mt-2 text-[var(--muted)]">
          This link does not contain a valid YouTube video ID.
        </p>

        <Link
          href="/videos"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-red-600 transition hover:opacity-75"
        >
          <ArrowLeft size={16} />
          Back to Video Library
        </Link>
      </main>
    );
  }

  let video: VideoDetails | null = null;
  let currentDocumentId = "";

  // Fetch video details from Firestore.
  try {
    const directDoc = await adminDb
      .collection("videos")
      .doc(youtubeId)
      .get();

    if (directDoc.exists) {
      video = directDoc.data() as VideoDetails;
      currentDocumentId = directDoc.id;
    } else {
      const matchingDocs = await adminDb
        .collection("videos")
        .where("youtubeId", "==", youtubeId)
        .limit(1)
        .get();

      if (!matchingDocs.empty) {
        const doc = matchingDocs.docs[0];

        video = doc.data() as VideoDetails;
        currentDocumentId = doc.id;
      }
    }
  } catch (error) {
    console.error("VIDEO DETAILS LOAD ERROR:", error);
  }

  const title = video?.title || "Study Video";

  const description =
    video?.description?.trim() ||
    "No description is available for this video.";

  const channelName =
    video?.channelName || "YouTube creator";

  // Recommended videos.
  let suggestions: Array<{
    id: string;
    youtubeId: string;
    title: string;
    channelName: string;
    thumbnailUrl: string;
    score: number;
  }> = [];

  try {
    const snapshot = await adminDb
      .collection("videos")
      .where("approved", "==", true)
      .limit(40)
      .get();

    const currentTerms = new Set(
      `${title} ${video?.subject || ""} ${video?.exam || ""}`
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 3)
    );

    suggestions = snapshot.docs
      .filter((doc) => doc.id !== currentDocumentId)
      .map((doc) => {
        const data = doc.data() as VideoDetails;

        const suggestionId = data.youtubeId || doc.id;

        const suggestionTerms = new Set(
          `${data.title || ""} ${data.subject || ""} ${data.exam || ""}`
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((word) => word.length > 3)
        );

        let score = 0;

        for (const term of currentTerms) {
          if (suggestionTerms.has(term)) {
            score++;
          }
        }

        if (
          video?.subject &&
          data.subject?.toLowerCase() === video.subject.toLowerCase()
        ) {
          score += 4;
        }

        if (
          video?.exam &&
          data.exam?.toLowerCase() === video.exam.toLowerCase()
        ) {
          score += 3;
        }

        return {
          id: doc.id,
          youtubeId: suggestionId,
          title: data.title || "Untitled video",
          channelName: data.channelName || "",
          thumbnailUrl:
            data.thumbnailUrl ||
            `https://i.ytimg.com/vi/${suggestionId}/hqdefault.jpg`,
          score,
        };
      })
      .filter((item) =>
        /^[a-zA-Z0-9_-]{11}$/.test(item.youtubeId)
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  } catch (error) {
    console.error("VIDEO SUGGESTIONS LOAD ERROR:", error);
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-6 pb-10 text-[var(--foreground)] sm:space-y-7">

      {/* Back navigation */}
      <Link
        href="/videos"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-red-600"
      >
        <ArrowLeft size={17} />
        Back to Video Library
      </Link>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.8fr)] xl:gap-7">

        {/* Main video section */}
        <div className="min-w-0 space-y-5 sm:space-y-6">

          {/* Shared Edukrate player */}
          <section className="w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-black shadow-sm">
            <EdukratePlayer
              videoId={youtubeId}
              title={title}
            />
          </section>

          {/* Video information */}
          <section className="space-y-3">
            <h1 className="text-xl font-bold leading-snug text-[var(--foreground)] sm:text-2xl lg:text-3xl">
              {title}
            </h1>

            <p className="text-sm font-medium text-[var(--muted)]">
              {channelName}
            </p>

            {/* Video metadata */}
            <div className="flex flex-wrap gap-2">
              {video?.subject && (
                <span className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-strong)]">
                  {video.subject}
                </span>
              )}

              {video?.exam && (
                <span className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-strong)]">
                  {video.exam}
                </span>
              )}

              {video?.classLevel && (
                <span className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-strong)]">
                  Class {video.classLevel}
                </span>
              )}
            </div>
          </section>

          {/* Description */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-bold text-[var(--foreground)]">
              Description
            </h2>

            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--muted-strong)]">
              {description}
            </p>
          </section>
        </div>

        {/* Recommendations */}
        <aside className="min-w-0 space-y-4">

          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">
                Recommended videos
              </h2>

              <p className="mt-1 text-xs text-[var(--muted)]">
                More videos to continue learning
              </p>
            </div>

            <PlayCircle
              size={21}
              className="shrink-0 text-[var(--muted)]"
            />
          </div>

          {suggestions.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">

              {suggestions.map((item) => (
                <Link
                  key={item.id}
                  href={`/videos/${item.youtubeId}`}
                  className="group flex min-w-0 gap-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5 shadow-sm transition hover:border-red-500/50 hover:bg-[var(--card-soft)]"
                >
                  <div className="relative aspect-video w-[42%] shrink-0 overflow-hidden rounded-lg bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-[var(--foreground)] transition group-hover:text-red-600">
                      {item.title}
                    </h3>

                    <p className="mt-2 line-clamp-1 text-xs text-[var(--muted)]">
                      {item.channelName || "YouTube creator"}
                    </p>
                  </div>
                </Link>
              ))}

            </div>
          ) : (
            <p className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
              No recommendations are available yet.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}

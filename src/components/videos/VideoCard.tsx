
"use client";

import Image from "next/image";
import Link from "next/link";
import { Video } from "@/types/video";

type Props = {
  video: Video;
};

export default function VideoCard({ video }: Props) {
  const youtubeId = video.youtubeId || video.id;

  const thumbnailUrl =
    video.thumbnailUrl &&
    !video.thumbnailUrl.includes("maxresdefault.jpg")
      ? video.thumbnailUrl
      : `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

  return (
    <Link
      href={`/videos/${video.youtubeId || video.id}`}
      aria-label={`Watch ${video.title}`}
      className="group block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] transition-colors hover:border-red-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-[var(--card-soft)]">
        <Image
          src={thumbnailUrl}
          alt={video.title}
          fill
          sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Theme-aware thumbnail gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent dark:from-black/70" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform group-hover:scale-110">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="ml-1 h-6 w-6"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>

        {video.classLevel && (
          <div className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
            Class {video.classLevel}
          </div>
        )}
      </div>

      {/* Video details */}
      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-[var(--foreground)] transition-colors group-hover:text-red-500 md:text-base">
          {video.title}
        </h3>

        <p className="mt-2 text-xs text-[var(--muted)]">
          {video.channelName}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {video.subject && (
            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-500">
              {video.subject}
            </span>
          )}

          {video.exam && (
            <span className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-2 py-1 text-xs text-[var(--muted-strong)]">
              {video.exam}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

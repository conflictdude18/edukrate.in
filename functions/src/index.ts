
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

initializeApp();

const db = getFirestore();
const youtubeApiKey = defineSecret("YOUTUBE_API_KEY");

const DAILY_TARGET = 200;
const MAX_RESULTS_PER_QUERY = 50;

type VideoCategory = {
  query: string;
  classLevel: string;
  exam?: string;
};

type YouTubeSearchItem = {
  id?: {
    videoId?: string;
  };
};

type YouTubeVideoItem = {
  id: string;
  snippet: {
    title: string;
    description?: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails?: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
  contentDetails?: {
    duration?: string;
  };
  status?: {
    privacyStatus?: string;
    embeddable?: boolean;
  };
  statistics?: {
    viewCount?: string;
  };
};

const categories: VideoCategory[] = [
  {
    query: "India school educational lessons class 1 2 3 4 5",
    classLevel: "Classes 1–5",
  },
  {
    query: "India school educational lessons class 6 7 8",
    classLevel: "Classes 6–8",
  },
  {
    query: "India school educational lessons class 9 10",
    classLevel: "Classes 9–10",
  },
  {
    query: "India school educational lessons class 11 12",
    classLevel: "Classes 11–12",
  },
  {
    query: "India JEE preparation educational lecture",
    classLevel: "Class 11–12",
    exam: "JEE",
  },
  {
    query: "India NEET preparation educational lecture",
    classLevel: "Class 11–12",
    exam: "NEET",
  },
];

function getThumbnail(item: YouTubeVideoItem): string {
  return (
    item.snippet.thumbnails?.high?.url ??
    item.snippet.thumbnails?.medium?.url ??
    item.snippet.thumbnails?.default?.url ??
    `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`
  );
}

async function searchYouTube(
  query: string,
  apiKey: string,
): Promise<string[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");

  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(MAX_RESULTS_PER_QUERY));
  url.searchParams.set("regionCode", "IN");
  url.searchParams.set("order", "date");
  url.searchParams.set("q", query);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    const errorBody = await response.text();

    logger.error("YouTube search API error", {
      status: response.status,
      details: errorBody,
    });

    throw new Error(
      `YouTube search failed (${response.status}): ${errorBody}`,
    );
  }

  const data = (await response.json()) as {
    items?: YouTubeSearchItem[];
  };

  return (data.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id));
}

async function getVideoDetails(
  ids: string[],
  apiKey: string,
): Promise<YouTubeVideoItem[]> {
  if (ids.length === 0) return [];

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");

  url.searchParams.set("part", "snippet,contentDetails,status,statistics");
  url.searchParams.set("id", ids.join(","));
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    const errorBody = await response.text();

    logger.error("YouTube video details API error", {
      status: response.status,
      details: errorBody,
    });

    throw new Error(
      `YouTube video details failed (${response.status}): ${errorBody}`,
    );
  }

  const data = (await response.json()) as {
    items?: YouTubeVideoItem[];
  };

  return data.items ?? [];
}

export const importEducationalVideos = onSchedule(
  {
    schedule: "0 4 * * *",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
    maxInstances: 1,
    secrets: [youtubeApiKey],
  },
  async () => {
    const apiKey = youtubeApiKey.value();

    if (!apiKey) {
      throw new Error("YOUTUBE_API_KEY secret is empty");
    }

    logger.info("Starting daily educational video import");

    const foundIds = new Set<string>();
    const categoryById = new Map<string, VideoCategory>();

    for (const category of categories) {
      const ids = await searchYouTube(category.query, apiKey);

      for (const id of ids) {
        if (!foundIds.has(id)) {
          foundIds.add(id);
          categoryById.set(id, category);
        }
      }

      if (foundIds.size >= DAILY_TARGET) {
        break;
      }
    }

    const candidateIds = [...foundIds].slice(0, DAILY_TARGET);

    if (candidateIds.length === 0) {
      logger.info("No YouTube video candidates found");
      return;
    }

    const videoDetails: YouTubeVideoItem[] = [];

    for (let i = 0; i < candidateIds.length; i += 50) {
      const batch = candidateIds.slice(i, i + 50);
      const details = await getVideoDetails(batch, apiKey);
      videoDetails.push(...details);
    }

    let imported = 0;
    let skipped = 0;

    for (const video of videoDetails) {
      const category = categoryById.get(video.id);

      if (!category) {
        skipped++;
        continue;
      }

      if (
        video.status?.privacyStatus !== "public" ||
        video.status?.embeddable === false
      ) {
        skipped++;
        continue;
      }

      const docRef = db.collection("videos").doc(video.id);
      const existing = await docRef.get();

      if (existing.exists) {
        skipped++;
        continue;
      }

      const now = new Date().toISOString();

      await docRef.set({
        youtubeId: video.id,
        title: video.snippet.title,
        description: video.snippet.description ?? "",
        thumbnailUrl: getThumbnail(video),
        channelName: video.snippet.channelTitle,

        classLevel: category.classLevel,
        exam: category.exam ?? "",
        subject: "",
        chapter: "",
        language: "",

        publishedAt: video.snippet.publishedAt,
        createdAt: now,
        importedAt: now,

        approved: true,
        featured: false,
        classified: false,

        views: Number(video.statistics?.viewCount ?? 0),
        savedCount: 0,
      });

      imported++;
    }

    logger.info("Daily educational video import completed", {
      candidates: candidateIds.length,
      imported,
      skipped,
    });
  },
);

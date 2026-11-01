
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { searchEducationalVideos } from "@/lib/youtube";
import { classifyVideo } from "@/lib/channel-classifier";

export const runtime = "nodejs";

// Cache successful searches for one hour.
// Next.js stores cached results on the server, not in Firestore.
const getCachedSearchResults = unstable_cache(
  async (searchQuery: string) => {
    const videos = await searchEducationalVideos(searchQuery, 10);

    return videos
      .filter((video) =>
        classifyVideo(video.title, video.description)
      )
      .map((video) => ({
        ...video,
        watchUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
      }));
  },
  ["edukrate-youtube-search-v1"],
  {
    revalidate: 3600,
  }
);

export async function GET(request: NextRequest) {
  const rawQuery = (
    request.nextUrl.searchParams.get("q") || ""
  ).trim();

  if (rawQuery.length < 3) {
    return NextResponse.json(
      {
        success: false,
        error: "Enter at least 3 characters.",
      },
      { status: 400 }
    );
  }

  if (rawQuery.length > 200) {
    return NextResponse.json(
      {
        success: false,
        error: "Search query is too long.",
      },
      { status: 400 }
    );
  }

  // Normalize case and repeated spaces so equivalent searches
  // are more likely to reuse the same cache entry.
  const searchQuery = rawQuery
    .toLowerCase()
    .replace(/\s+/g, " ");

  try {
    const results = await getCachedSearchResults(searchQuery);

    return NextResponse.json({
      success: true,
      results,
      cachedForSeconds: 3600,
    });
  } catch (error) {
    console.error("ON-DEMAND YOUTUBE SEARCH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "YouTube search is temporarily unavailable.",
      },
      { status: 500 }
    );
  }
}

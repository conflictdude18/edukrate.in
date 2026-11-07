import { google } from "googleapis";

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

/**
 * Get latest videos from a channel using its uploads playlist.
 *
 * This is intentionally NOT using search.list().
 * playlistItems.list() uses much less YouTube API quota.
 */
export async function getLatestChannelVideos(
  channelId: string,
  maxResults = 15
) {
  const uploadsPlaylistId = channelId.startsWith("UC")
    ? `UU${channelId.slice(2)}`
    : null;

  if (!uploadsPlaylistId) {
    throw new Error(
      `Invalid YouTube channel ID: ${channelId}`
    );
  }

  const response =
    await youtube.playlistItems.list({
      part: ["snippet", "contentDetails"],
      playlistId: uploadsPlaylistId,
      maxResults,
    });

  return (
    response.data.items
      ?.map((item) => {
        const videoId =
          item.contentDetails?.videoId ||
          item.snippet?.resourceId?.videoId;

        if (!videoId) {
          return null;
        }

        return {
          videoId,

          title:
            item.snippet?.title || "",

          description:
            item.snippet?.description || "",

          thumbnail:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,

          publishedAt:
            item.contentDetails?.videoPublishedAt ||
            item.snippet?.publishedAt ||
            new Date().toISOString(),
        };
      })
      .filter(
        (
          video
        ): video is {
          videoId: string;
          title: string;
          description: string;
          thumbnail: string;
          publishedAt: string;
        } => video !== null
      ) || []
  );
}

/**
 * Search educational YouTube channels.
 *
 * This is only used by the channel discovery system.
 */
export async function searchEducationalChannels(
  query: string
) {
  const response =
    await youtube.search.list({
      part: ["snippet"],
      type: ["channel"],
      maxResults: 25,
      q: query,
    });

  return response.data.items || [];
}

/**
 * Get channel information.
 */
export async function getChannelDetails(
  channelId: string
) {
  const response =
    await youtube.channels.list({
      part: ["snippet", "statistics"],
      id: [channelId],
    });

  return response.data.items?.[0];
}

export async function searchEducationalVideos(
  searchQuery: string,
  maxResults = 10
) {
  const response = await youtube.search.list({
    part: ["snippet"],
    type: ["video"],
    q: searchQuery,
    maxResults: Math.min(Math.max(maxResults, 1), 10),
    safeSearch: "moderate",
    videoEmbeddable: "true",
    order: "relevance",
  });

  return (response.data.items || [])
    .map((item) => {
      const videoId = item.id?.videoId;

      if (!videoId) return null;

      return {
        videoId,
        title: item.snippet?.title || "",
        description: item.snippet?.description || "",
        channelName: item.snippet?.channelTitle || "",
        thumbnailUrl:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        publishedAt: item.snippet?.publishedAt || "",
      };
    })
    .filter((video) => video !== null);
}
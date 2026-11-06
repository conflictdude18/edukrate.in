
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getLatestChannelVideos } from "@/lib/youtube";
import { classifyVideo } from "@/lib/video-classifier";

function buildSearchTokens(video: {
  title?: string;
  description?: string;
  channelName?: string;
  classLevel?: string;
  subject?: string;
  chapter?: string;
  exam?: string;
  language?: string;
}): string[] {
  const text = [
    video.title,
    video.description,
    video.channelName,
    video.classLevel,
    video.subject,
    video.chapter,
    video.exam,
    video.language,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const stopWords = new Set([
    "the", "and", "for", "with", "this", "that",
    "from", "are", "was", "you", "your", "how",
    "what", "why", "when", "where", "a", "an",
    "of", "in", "on", "to", "is", "by", "at",
  ]);

  return [
    ...new Set(
      text
        .normalize("NFKD")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter(
          (word) =>
            word.length >= 2 &&
            !stopWords.has(word)
        )
    ),
  ].slice(0, 200);
}

export async function GET() {
  try {
    console.log("========== VIDEO SYNC START ==========");

    const channelsSnapshot =
      await adminDb.collection("video_channels").get();

    console.log("CHANNEL COUNT:", channelsSnapshot.docs.length);

    if (channelsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "No channels found.",
        channelCount: 0,
      });
    }

    let importedCount = 0;

    for (const channelDoc of channelsSnapshot.docs) {
      const channel = channelDoc.data();

      console.log("CHANNEL:", channel.name || "Unknown");
      console.log("CHANNEL ID:", channel.channelId);
      console.log("ACTIVE:", channel.active);

      if (!channel.active) {
        console.log("SKIPPED (inactive)");
        continue;
      }

      const videos = await getLatestChannelVideos(
        channel.channelId
      );

      console.log("VIDEOS FOUND:", videos.length);

      for (const video of videos) {
        const youtubeId = video.videoId;

        if (!youtubeId) continue;

        const title = video.title || "";
        const description = video.description || "";
        const channelName =
          video.channelName || channel.name || "";

        const isStudy = classifyVideo(
          title,
          description
        );

        if (!isStudy) {
          console.log("REJECTED BY CLASSIFIER:", title);
          continue;
        }

        console.log("ACCEPTED BY CLASSIFIER:", title);

        const existing = await adminDb
          .collection("videos")
          .where("youtubeId", "==", youtubeId)
          .limit(1)
          .get();

        if (!existing.empty) {
          console.log("ALREADY EXISTS:", youtubeId);
          continue;
        }

        const videoData = {
          youtubeId,
          title,
          description,
          thumbnailUrl: video.thumbnail || "",
          channelName,
          publishedAt: video.publishedAt || null,
          approved: true,
          featured: false,
          classified: false,
          views: 0,
          savedCount: 0,
          createdAt: new Date().toISOString(),

          searchTokens: buildSearchTokens({
            title,
            description,
            channelName,
          }),
        };

        await adminDb
          .collection("videos")
          .add(videoData);

        importedCount++;

        console.log("IMPORTED:", title);
      }
    }

    console.log("TOTAL IMPORTED:", importedCount);
    console.log("========== VIDEO SYNC END ==========");

    return NextResponse.json({
      success: true,
      importedCount,
    });
  } catch (error) {
    console.error("VIDEO SYNC ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}

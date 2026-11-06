
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getLatestChannelVideos } from "@/lib/youtube";
import { classifyVideo } from "@/lib/channel-classifier";

type VideoChannel = {
  id: string;
  channelId: string;
  title: string;
  approved: boolean;
  active: boolean;
};

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
    console.log("=================================");
    console.log("STARTING VIDEO SYNC");
    console.log("=================================");

    const channelsSnapshot = await adminDb
      .collection("video_channels")
      .get();

    const eligibleChannels = channelsSnapshot.docs.filter(
      (doc) => {
        const data = doc.data();

        if (data.source === "auto-discovery") {
          return data.active !== false;
        }

        return (
          data.approved === true &&
          data.active === true
        );
      }
    );

    console.log(
      `ELIGIBLE CHANNELS: ${eligibleChannels.length}`
    );

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    if (eligibleChannels.length === 0) {
      console.log("NO APPROVED + ACTIVE CHANNELS FOUND");

      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: 0,
        failed: 0,
        channels: 0,
      });
    }

    const channels: VideoChannel[] =
      eligibleChannels.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          channelId: String(data.channelId || ""),
          title: String(data.title || "Unknown Channel"),
          approved: data.approved === true,
          active: data.active !== false,
        };
      });

    for (const channel of channels) {
      try {
        console.log(
          `SYNCING CHANNEL: ${channel.title} (${channel.channelId})`
        );

        if (!channel.channelId) {
          console.error(
            `CHANNEL HAS NO CHANNEL ID: ${channel.title}`
          );

          failed++;
          continue;
        }

        const videos = await getLatestChannelVideos(
          channel.channelId,
          15
        );

        console.log(
          `FOUND ${videos.length} VIDEOS FROM ${channel.title}`
        );

        for (const video of videos) {
          try {
            const videoRef = adminDb
              .collection("videos")
              .doc(video.videoId);

            const existingById = await videoRef.get();

            const existingByYoutubeId = existingById.exists
              ? null
              : await adminDb
                  .collection("videos")
                  .where("youtubeId", "==", video.videoId)
                  .limit(1)
                  .get();

            if (
              existingById.exists ||
              (existingByYoutubeId && !existingByYoutubeId.empty)
            ) {
              skipped++;
              continue;
            }

            const educational = await classifyVideo(
              video.title,
              video.description
            );

            if (!educational) {
              skipped++;
              continue;
            }

            const title = video.title || "";
            const description = video.description || "";
            const channelName = channel.title;

            await videoRef.set({
              id: video.videoId,
              youtubeId: video.videoId,
              title,
              description,
              thumbnailUrl: video.thumbnail || "",
              channelName,
              channelId: channel.channelId,

              classLevel: null,
              subject: null,
              chapter: null,
              exam: null,
              language: null,

              approved: true,
              featured: false,
              classified: true,
              educational: true,

              views: 0,
              savedCount: 0,

              publishedAt: new Date(video.publishedAt),
              createdAt: new Date(),

              searchTokens: buildSearchTokens({
                title,
                description,
                channelName,
              }),
            });

            imported++;
          } catch (videoError) {
            failed++;

            console.error(
              `VIDEO FAILED: ${video.title}`,
              videoError
            );
          }
        }

        await adminDb
          .collection("video_channels")
          .doc(channel.id)
          .update({
            lastSyncedAt: new Date(),
          });

        console.log(
          `FINISHED CHANNEL: ${channel.title}`
        );
      } catch (channelError) {
        failed++;

        console.error(
          `CHANNEL FAILED: ${channel.title}`,
          channelError
        );
      }
    }

    console.log("=================================");
    console.log("VIDEO SYNC COMPLETE");
    console.log(`IMPORTED: ${imported}`);
    console.log(`SKIPPED: ${skipped}`);
    console.log(`FAILED: ${failed}`);
    console.log(`CHANNELS: ${channels.length}`);
    console.log("=================================");

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      failed,
      channels: channels.length,
    });
  } catch (error) {
    console.error("VIDEO SYNC FATAL ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        imported: 0,
        skipped: 0,
        failed: 1,
        channels: 0,
      },
      { status: 500 }
    );
  }
}

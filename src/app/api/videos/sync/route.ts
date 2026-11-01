import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getLatestChannelVideos } from "@/lib/youtube";
import { classifyVideo } from "@/lib/video-classifier";

export async function GET() {
  try {
    console.log("========== VIDEO SYNC START ==========");

    const channelsSnapshot =
      await adminDb.collection("video_channels").get();

    console.log(
      "CHANNEL COUNT:",
      channelsSnapshot.docs.length
    );

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

      console.log(
        "CHANNEL:",
        channel.name || "Unknown"
      );

      console.log(
        "CHANNEL ID:",
        channel.channelId
      );

      console.log(
        "ACTIVE:",
        channel.active
      );

      if (!channel.active) {
        console.log("SKIPPED (inactive)");
        continue;
      }

      const videos = await getLatestChannelVideos(
        channel.channelId
      );

      console.log(
        "VIDEOS FOUND:",
        videos.length
      );

      for (const video of videos) {
        const youtubeId =
          video.id?.videoId;

        if (!youtubeId) continue;

        const isStudy = classifyVideo(
          video.snippet?.title || "",
          video.snippet?.description || ""
        );

        if (!isStudy) {
          console.log(
            "REJECTED BY CLASSIFIER:",
            video.snippet?.title
          );

          continue;
        }

        console.log(
          "ACCEPTED BY CLASSIFIER:",
          video.snippet?.title
        );

        const existing =
          await adminDb
            .collection("videos")
            .where("youtubeId", "==", youtubeId)
            .limit(1)
            .get();

        if (!existing.empty) {
          console.log(
            "ALREADY EXISTS:",
            youtubeId
          );
          continue;
        }

        await adminDb
          .collection("videos")
          .add({
            youtubeId,

            title:
              video.snippet?.title || "",

            description:
              video.snippet?.description || "",

            thumbnailUrl:
              video.snippet?.thumbnails?.high?.url || "",

            channelName:
              video.snippet?.channelTitle || "",

            publishedAt:
              video.snippet?.publishedAt || null,

            approved: true,

            featured: false,

            classified: false,

            views: 0,

            savedCount: 0,

            createdAt:
              new Date().toISOString(),
          });

        importedCount++;

        console.log(
          "IMPORTED:",
          video.snippet?.title
        );
      }
    }

    console.log(
      "TOTAL IMPORTED:",
      importedCount
    );

    console.log("========== VIDEO SYNC END ==========");

    return NextResponse.json({
      success: true,
      importedCount,
    });
  } catch (error) {
    console.error(
      "VIDEO SYNC ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}
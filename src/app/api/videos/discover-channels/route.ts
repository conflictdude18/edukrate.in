import { NextResponse } from "next/server";

import {
  searchEducationalChannels,
  getChannelDetails,
} from "@/lib/youtube";

import {
  classifyChannel,
} from "@/lib/channel-classifier";

import { adminDb } from "@/lib/firebase-admin";

const SEARCH_TERMS = [
  "jee physics",
  "jee chemistry",
  "jee maths",

  "neet biology",
  "neet chemistry",
  "neet physics",

  "class 9 science",
  "class 10 science",

  "class 11 physics",
  "class 12 physics",

  "class 11 chemistry",
  "class 12 chemistry",

  "class 11 maths",
  "class 12 maths",

  "cbse board exam",

  "ncert solutions",

  "jee preparation",
  "neet preparation",

  "physics teacher",
  "chemistry teacher",
  "biology teacher",
  "maths teacher"
];

export async function GET() {
  let approved = 0;

  for (const term of SEARCH_TERMS) {
    const channels =
      await searchEducationalChannels(term);

    for (const item of channels) {
      const channelId = item.id?.channelId;

      if (!channelId) {
        continue;
      }

      const existing =
        await adminDb
          .collection("video_channels")
          .doc(channelId)
          .get();

      if (existing.exists) {
        continue;
      }

      const details =
        await getChannelDetails(channelId);

      if (!details) {
        continue;
      }

      const title =
        details.snippet?.title || "";

      const description =
        details.snippet?.description || "";

      const subscribers = Number(
        details.statistics?.subscriberCount || 0
      );

      const videoCount = Number(
        details.statistics?.videoCount || 0
      );

      // Skip small or inactive channels
      if (subscribers < 1000) {
        continue;
      }

      if (videoCount < 20) {
        continue;
      }

      const approvedChannel = classifyChannel(
        title,
        description
      );

      if (!approvedChannel) {
        continue;
      }

      await adminDb
        .collection("video_channels")
        .doc(channelId)
        .set({
          channelId,

          title,

          description,

          thumbnail:
            details.snippet?.thumbnails?.high?.url || "",

          subscriberCount: Number(
            details.statistics?.subscriberCount || 0
          ),
          
          videoCount: Number(
            details.statistics?.videoCount || 0
          ),

          verified: true,

          approved: true,
          active: true,

          source:
            "auto-discovery",

          createdAt:
            new Date(),

          lastSyncedAt:
            null,
        });

      approved++;
    }
  }

  return NextResponse.json({
    success: true,
    approved,
  });
}
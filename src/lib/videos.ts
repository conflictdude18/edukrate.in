
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  limit,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { db } from "@/firebase/firebase";
import { Video } from "@/types/video";

const VIDEOS_COLLECTION = collection(db, "videos");

export type VideosPage = {
  videos: Video[];
  lastDocument: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
};

// Fetch one page of approved videos.
export async function getVideosPage(
  lastDocument: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize = 20
): Promise<VideosPage> {
  try {
    const constraints = [
      where("approved", "==", true),
      orderBy("publishedAt", "desc"),
      ...(lastDocument ? [startAfter(lastDocument)] : []),
      limit(pageSize),
    ];

    const q = query(VIDEOS_COLLECTION, ...constraints);
    const snapshot = await getDocs(q);

    const videos: Video[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Video, "id">),
    }));

    return {
      videos,
      lastDocument:
        snapshot.docs.length > 0
          ? snapshot.docs[snapshot.docs.length - 1]
          : lastDocument,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (error) {
    console.error("GET VIDEOS PAGE ERROR:", error);
    throw error;
  }
}

// Retained for compatibility with any other existing pages.
export async function getVideos(): Promise<Video[]> {
  try {
    const q = query(
      VIDEOS_COLLECTION,
      where("approved", "==", true),
      orderBy("publishedAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Video, "id">),
    }));
  } catch (error) {
    console.error("GET VIDEOS ERROR:", error);
    throw error;
  }
}

export async function getFeaturedVideos(): Promise<Video[]> {
  try {
    const q = query(
      VIDEOS_COLLECTION,
      where("approved", "==", true),
      where("featured", "==", true),
      orderBy("publishedAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Video, "id">),
    }));
  } catch (error) {
    console.error("GET FEATURED VIDEOS ERROR:", error);
    throw error;
  }
}

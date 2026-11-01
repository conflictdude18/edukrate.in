
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/firebase";
import { Video } from "@/types/video";

export async function getVideos(): Promise<Video[]> {
  
  try {
    const q = query(
      collection(db, "videos"),
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
      collection(db, "videos"),
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
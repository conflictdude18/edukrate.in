import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/firebase";
import { getCreatorLevel } from "@/lib/creatorLevels";
import { getCreatorBadges } from "@/lib/creatorBadges";
import { calculateProfileCompletion } from "@/lib/profileCompletion";

function getNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(date: Date, today: Date) {
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return isSameDay(date, yesterday);
}

export async function updateCreatorStats(userId: string) {
  if (!userId) return;

  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};

  const notesQuery = query(
    collection(db, "notes"),
    where("uploaderId", "==", userId)
  );

  const notesSnap = await getDocs(notesQuery);

  let uploads = 0;
  let approvedUploads = 0;
  let totalDownloads = 0;
  let totalLikes = 0;
  let totalViews = 0;

  const uploadDates: Date[] = [];

  notesSnap.forEach((noteDoc) => {
    const note = noteDoc.data();

    uploads += 1;

    if (note.status === "approved" || note.moderationStatus === "approved") {
      approvedUploads += 1;
    }

    totalDownloads += getNumber(note.downloadsCount || note.downloads);
    totalLikes += getNumber(note.likesCount || note.likes);
    totalViews += getNumber(note.viewsCount || note.views);

    const createdAt = note.createdAt?.toDate?.();

    if (createdAt instanceof Date) {
      uploadDates.push(createdAt);
    }
  });

  const uniqueUploadDays = Array.from(
    new Set(uploadDates.map((date) => date.toDateString()))
  ).map((date) => new Date(date));

  uniqueUploadDays.sort((a, b) => b.getTime() - a.getTime());

  let uploadStreak = 0;
  const today = new Date();

  if (uniqueUploadDays.length > 0) {
    const latestUploadDay = uniqueUploadDays[0];

    if (isSameDay(latestUploadDay, today) || isYesterday(latestUploadDay, today)) {
      uploadStreak = 1;

      for (let i = 1; i < uniqueUploadDays.length; i++) {
        const previousExpectedDay = new Date(uniqueUploadDays[i - 1]);
        previousExpectedDay.setDate(previousExpectedDay.getDate() - 1);

        if (isSameDay(uniqueUploadDays[i], previousExpectedDay)) {
          uploadStreak += 1;
        } else {
          break;
        }
      }
    }
  }

  const creatorStatsRef = doc(db, "creatorStats", userId);
  const oldStatsSnap = await getDoc(creatorStatsRef);
  const oldStats = oldStatsSnap.exists() ? oldStatsSnap.data() : {};

  const bestUploadStreak = Math.max(
    uploadStreak,
    getNumber(oldStats.bestUploadStreak)
  );

  const profileCompletion = calculateProfileCompletion({
    displayName: userData.displayName || userData.name || "",
    photoURL: userData.avatarUrl || userData.photoURL || "",
    bio: userData.bio || "",
    class: userData.class || userData.className || "",
    school: userData.school || "",
    city: userData.city || "",
  });

  const badges = getCreatorBadges({
    uploads,
    approvedUploads,
    totalLikes,
    uploadStreak,
    profileCompletion,
  });

  const creatorLevel = getCreatorLevel(approvedUploads);
  const verifiedCreator =
    (creatorLevel?.level || 0) >= 5 &&
    Number(userData.reputation || 0) >= 1000;

  await setDoc(
    creatorStatsRef,
    {
      userId,
      displayName:
        userData.displayName ||
        userData.name ||
        oldStats.displayName ||
        "Edukrate Creator",
      photoURL:
        userData.avatarUrl ||
        userData.photoURL ||
        userData.avatarURL ||
        oldStats.photoURL ||
        "",
      uploads,
      approvedUploads,
      totalDownloads,
      totalLikes,
      totalViews,
      uploadStreak,
      bestUploadStreak,
      profileCompletion,
      badges,
      creatorLevel,
      verifiedCreator,
      reputation: Number(userData.reputation || 0),
      monthlyReputation: Number(userData.monthlyReputation || 0),
      weeklyReputation: Number(userData.weeklyReputation || 0),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: "noteswallah-84dc5",
  });
}

const db = getFirestore();

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

async function backfillVideoSearchTokens() {
  const pageSize = 400;
  let lastDocument: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let totalUpdated = 0;

  console.log("Starting video search-token backfill...");

  while (true) {
    let query = db.collection("videos")
      .orderBy("__name__")
      .limit(pageSize);

    if (lastDocument) {
      query = query.startAfter(lastDocument);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      const searchTokens = buildSearchTokens({
        title: data.title,
        description: data.description,
        channelName: data.channelName,
        classLevel: data.classLevel,
        subject: data.subject,
        chapter: data.chapter,
        exam: data.exam,
        language: data.language,
      });

      batch.update(doc.ref, { searchTokens });
    }

    await batch.commit();

    totalUpdated += snapshot.size;
    lastDocument = snapshot.docs[snapshot.docs.length - 1];

    console.log(`Updated ${totalUpdated} videos...`);

    if (snapshot.size < pageSize) {
      break;
    }
  }

  console.log(`Backfill complete. Updated ${totalUpdated} videos.`);
}

backfillVideoSearchTokens().catch((error) => {
  console.error("Backfill failed:", error);
  process.exitCode = 1;
});

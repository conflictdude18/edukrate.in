const admin = require("firebase-admin");

admin.initializeApp({
  projectId: "noteswallah-84dc5",
});

const db = admin.firestore();
const PAGE_SIZE = 400;

async function approveExistingVideos() {
  let lastDoc = null;
  let totalUpdated = 0;

  while (true) {
    let query = db
      .collection("videos")
      .where("approved", "==", false)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(PAGE_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();

    if (snapshot.empty) break;

    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { approved: true });
    });

    await batch.commit();

    totalUpdated += snapshot.size;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];

    console.log(`Approved ${totalUpdated} videos so far...`);
  }

  console.log(`Finished. Total approved: ${totalUpdated}`);
}

approveExistingVideos().catch((error) => {
  console.error(error);
  process.exit(1);
});
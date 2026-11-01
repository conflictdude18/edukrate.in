import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "process.env.AIzaSyB1rA7XEtvC97hsos0fCz6NcNAiZITY1Vc",
  authDomain: "noteswallah-84dc5.firebaseapp.com",
  projectId: "noteswallah-84dc5",
  storageBucket: "noteswallah-84dc5.firebasestorage.app",
  messagingSenderId: "821680721378",
  appId: "1:821680721378:web:57bd2192eb838433537dbb",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
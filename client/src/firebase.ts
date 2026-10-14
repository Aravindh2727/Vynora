import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCoXoHqgBQnrCpIFNWlXITd0PZhHkDJ2DM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "lifehub-ai-94271.firebaseapp.com",
  databaseURL: "https://lifehub-ai-94271-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "lifehub-ai-94271",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "lifehub-ai-94271.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "946678647084",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:946678647084:web:9b9d69abfdd1cb40af4489",
  measurementId: "G-KWHN7TRP41"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

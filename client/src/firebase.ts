import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCHi40Lux-hEfPV2vdhQNAgyyCjJv7ppxU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "vynora-41dde.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "vynora-41dde",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "vynora-41dde.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "301735951420",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:301735951420:web:62c1ceb73966e80253d739",
  measurementId: "G-TW4SN6WKKT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

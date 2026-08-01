import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCoXoHqgBQnrCpIFNWlXITd0PZhHkDJ2DM",
  authDomain: "lifehub-ai-94271.firebaseapp.com",
  databaseURL: "https://lifehub-ai-94271-default-rtdb.firebaseio.com",
  projectId: "lifehub-ai-94271",
  storageBucket: "lifehub-ai-94271.firebasestorage.app",
  messagingSenderId: "946678647084",
  appId: "1:946678647084:web:9b9d69abfdd1cb40af4489",
  measurementId: "G-KWHN7TRP41"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

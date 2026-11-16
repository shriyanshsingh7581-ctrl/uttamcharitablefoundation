import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
} from "firebase/auth";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  push,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  equalTo,
  serverTimestamp,
} from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "placeholder-firebase-api-key",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "placeholder.firebaseapp.com",
  databaseURL: import.meta.env?.VITE_FIREBASE_DATABASE_URL || "https://placeholder-default-rtdb.firebaseio.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "placeholder",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "placeholder.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:000000000000:web:000000000000",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || "",
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export const db = getDatabase(app);
export const rtdb = db;

export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  firebaseUpdateProfile,
  ref,
  set,
  get,
  update,
  push,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  equalTo,
  serverTimestamp,
};

export default {
  app,
  auth,
  db,
  rtdb,
  googleProvider,
};

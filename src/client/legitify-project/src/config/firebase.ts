import { initializeApp } from "firebase/app";
import { FIREBASE_CONFIG } from "../config";

// Initialize Firebase
const firebaseApp = initializeApp({
  apiKey: FIREBASE_CONFIG.apiKey,
  projectId: FIREBASE_CONFIG.projectId,
  authDomain: `${FIREBASE_CONFIG.projectId}.firebaseapp.com`,
  storageBucket: `${FIREBASE_CONFIG.projectId}.appspot.com`,
});

export default firebaseApp;

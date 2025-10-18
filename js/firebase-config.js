// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2jf5v9p8kVXP3weiPvHm8piHDbP6XaRw",
  authDomain: "mautours-60318.firebaseapp.com",
  projectId: "mautours-60318",
  storageBucket: "mautours-60318.firebasestorage.app",
  messagingSenderId: "1009871171111",
  appId: "1:1009871171111:web:d4369386c1a958aa18a802",
  measurementId: "G-882H9VPLJT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

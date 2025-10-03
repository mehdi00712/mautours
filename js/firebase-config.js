// Import the Firebase SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
// Optional: Auth if you want to restrict admin access later
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2jf5v9p8kVXP3weiPvHm8piHDbP6XaRw",
  authDomain: "mautours-60318.firebaseapp.com",
  projectId: "mautours-60318",
  storageBucket: "mautours-60318.appspot.com",   // fixed from firebasestorage.app → appspot.com
  messagingSenderId: "1009871171111",
  appId: "1:1009871171111:web:d4369386c1a958aa18a802",
  measurementId: "G-882H9VPLJT"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Firestore DB
export const db = getFirestore(app);

// Auth (optional)
export const auth = getAuth(app);

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyC2jf5v9p8kVXP3weiPvHm8piHDbP6XaRw",
  authDomain: "mautours-60318.firebaseapp.com",
  projectId: "mautours-60318",
  storageBucket: "mautours-60318.firebasestorage.app",
  messagingSenderId: "1009871171111",
  appId: "1:1009871171111:web:d4369386c1a958aa18a802",
  measurementId: "G-882H9VPLJT",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM elements
const emailInput = document.getElementById("authEmail");
const passwordInput = document.getElementById("authPassword");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");

loginBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Login successful ✅");
    window.location.href = "admin.html";
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

signupBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Account created successfully ✅");
  } catch (err) {
    alert("Signup failed: " + err.message);
  }
});

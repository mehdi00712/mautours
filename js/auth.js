// js/auth.js
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const adminUID = "d6IRCgOfwhZrKyRIoP6siAM8EOf2";

const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");

// ===== Popup Elements =====
const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popupTitle");
const popupMessage = document.getElementById("popupMessage");
const popupBtn = document.getElementById("popupBtn");

function showPopup(title, message, redirect = null) {
  popupTitle.textContent = title;
  popupMessage.textContent = message;
  popup.classList.add("show");

  popupBtn.onclick = () => {
    popup.classList.remove("show");
    if (redirect) window.location.href = redirect;
  };
}

// ===== Login Function =====
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user.uid === adminUID) {
        showPopup("Login Successful 🎉", "Welcome back, Admin!", "admin.html");
      } else {
        showPopup("Login Successful 🎉", "Welcome to Mautours!", "index.html");
      }
    } catch (error) {
      showPopup("Login Failed ❌", error.message);
    }
  });
}

// ===== Logout Function =====
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    showPopup("Logged Out", "You have been logged out successfully.", "index.html");
  });
}

// ===== Auth Monitor =====
onAuthStateChanged(auth, (user) => {
  console.log("Auth state:", user ? `Logged in as ${user.email}` : "Logged out");
});

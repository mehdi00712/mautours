// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const adminUID = "d6IRCgOfwhZrKyRIoP6siAM8EOf2";

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutBtn = document.getElementById("logoutBtn");

// ===== Login Form =====
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      loginMessage.textContent = "✅ Login successful. Redirecting...";
      loginMessage.style.color = "green";

      setTimeout(() => {
        if (user.uid === adminUID) {
          window.location.href = "admin.html";
        } else {
          window.location.href = "index.html";
        }
      }, 1000);
    } catch (error) {
      loginMessage.textContent = "❌ " + error.message;
      loginMessage.style.color = "red";
    }
  });
}

// ===== Logout Button =====
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    alert("You have been logged out.");
    window.location.href = "index.html";
  });
}

// ===== Auto-state check =====
onAuthStateChanged(auth, (user) => {
  console.log("Auth state changed:", user ? user.email : "No user");
});

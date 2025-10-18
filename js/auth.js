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
const message = document.getElementById("loginMessage");

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        message.textContent = "Login successful! Redirecting...";
        message.style.color = "green";

        if (user.uid === adminUID) {
          setTimeout(() => (window.location.href = "admin.html"), 800);
        } else {
          setTimeout(() => (window.location.href = "index.html"), 800);
        }
      })
      .catch((error) => {
        message.textContent = "Login failed: " + error.message;
        message.style.color = "red";
      });
  });
}

// Logout handler
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
      window.location.href = "index.html";
    });
  });
}

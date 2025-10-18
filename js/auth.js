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
const logoutSection = document.getElementById("logoutSection");
const userEmailDisplay = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;

        if (user.uid === adminUID) {
          alert("Welcome Admin! Redirecting to Dashboard...");
          window.location.href = "admin.html";
        } else {
          alert("Login successful! Redirecting...");
          window.location.href = "index.html";
        }
      })
      .catch((error) => {
        alert("Login failed: " + error.message);
      });
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth)
      .then(() => {
        alert("Logged out successfully!");
        window.location.href = "index.html";
      })
      .catch((error) => {
        console.error("Logout error:", error);
      });
  });
}

// Show/hide logout section dynamically
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (logoutSection) {
      logoutSection.style.display = "block";
      userEmailDisplay.textContent = user.email;
    }
  } else {
    if (logoutSection) logoutSection.style.display = "none";
  }
});

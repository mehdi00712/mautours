// ===== Firebase Auth Handling =====
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { app } from "./firebase-config.js";

const auth = getAuth(app);

// ===== LOGIN PAGE =====
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login successful!");
      window.location.href = "index.html";
    } catch (error) {
      alert("Login failed. Please check your credentials.");
      console.error(error);
    }
  });
}

// ===== LOGOUT =====
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      alert("You have been logged out.");
      window.location.href = "login.html";
    } catch (error) {
      console.error("Logout error:", error);
    }
  });
}

// ===== ADMIN PROTECTION =====
const ADMIN_UID = "d6IRCgOfwhZrKyRIoP6siAM8EOf2";
const adminPage = window.location.pathname.includes("admin.html");

onAuthStateChanged(auth, (user) => {
  if (adminPage) {
    if (!user) {
      alert("Access denied. Please log in as admin.");
      window.location.href = "login.html";
    } else if (user.uid !== ADMIN_UID) {
      alert("Unauthorized. Only admin can access this page.");
      window.location.href = "index.html";
    }
  }
});

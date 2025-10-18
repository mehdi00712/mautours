import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

const form = document.getElementById("loginForm");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      alert("Login successful!");
      if (email === "mbhoyroo246@gmail.com") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "index.html";
      }
    } catch (err) {
      console.error(err);
      alert("Invalid credentials. Please try again.");
    }
  });
}

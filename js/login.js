import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const adminUIDs = [
  "d6IRCgOfwhZrKyRIoP6siAM8EOf2",
  "OeS88yW5sjSPxSk9kUlVjPeoZeY2"
];

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

const params = new URLSearchParams(window.location.search);
const redirect = params.get("redirect");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  loginMessage.textContent = "Logging in...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);

    if (adminUIDs.includes(result.user.uid)) {
      window.location.replace("admin.html");
      return;
    }

    window.location.href = redirect || "my-bookings.html";
  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.style.color = "red";
  }
});

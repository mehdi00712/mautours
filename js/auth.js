import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

const form = document.getElementById("loginForm");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      // Try sign in
      const user = await signInWithEmailAndPassword(auth, email, password);
      alert("Welcome back!");
      redirectUser(email);
    } catch (err) {
      // If user doesn’t exist → auto-register
      try {
        const newUser = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        alert("Account created successfully!");
        redirectUser(email);
      } catch (error) {
        alert("Login failed. Please check your details.");
      }
    }
  });
}

function redirectUser(email) {
  if (email === "mbhoyroo246@gmail.com") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "index.html";
  }
}

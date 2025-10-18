import { app } from "./firebase-config.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const auth = getAuth(app);

const emailInput = document.getElementById("authEmail");
const passwordInput = document.getElementById("authPassword");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");

loginBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    alert("Login successful ✅");
    window.location.href = "admin.html";
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

signupBtn.addEventListener("click", async () => {
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    alert("Account created successfully ✅");
  } catch (err) {
    alert("Signup failed: " + err.message);
  }
});

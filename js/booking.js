// booking.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const db = getFirestore(app);

// Fill in excursion and price from URL
const urlParams = new URLSearchParams(window.location.search);
const excursion = urlParams.get("excursion") || "";
const price = urlParams.get("price") || "0";

document.getElementById("excursion").value = excursion;
document.getElementById("price").value = price;

// Handle booking form
document.getElementById("bookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const date = document.getElementById("date").value;
  const people = document.getElementById("people").value;

  try {
    // Save booking to Firestore
    await addDoc(collection(db, "bookings"), {
      name,
      email,
      phone,
      excursion,
      price,
      date,
      people,
      status: "pending",
      createdAt: new Date()
    });

    // Redirect to ABSA payment gateway
    const merchantID = "bbm_coraplexltd_1232735_mur";
    const redirectUrl = encodeURIComponent("https://mehdi00712.github.io/mautours/success.html");
    const absaUrl = `https://secureacceptance.cybersource.com/pay?merchant=${merchantID}&amount=${price}&reference=${encodeURIComponent(excursion)}&return_url=${redirectUrl}`;

    window.location.href = absaUrl;
  } catch (error) {
    console.error("Error saving booking:", error);
    alert("There was a problem saving your booking. Please try again.");
  }
});

// Mautours Booking System
// =======================

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Show checkout form when a package is selected
window.selectPackage = function (name, price) {
  const section = document.getElementById("checkoutSection");
  document.getElementById("excursion").value = name;
  document.getElementById("total").value = price;
  section.classList.remove("hidden");

  // Smooth scroll to checkout
  window.scrollTo({
    top: section.offsetTop - 50,
    behavior: "smooth",
  });
};

// Handle form submission
const form = document.getElementById("bookingForm");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const excursion = document.getElementById("excursion").value.trim();
    const date = document.getElementById("date").value;
    const people = document.getElementById("people").value;
    const total = document.getElementById("total").value;

    if (!name || !email || !phone || !excursion || !date || !people) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      // Save booking in Firestore
      await addDoc(collection(db, "bookings"), {
        name,
        email,
        phone,
        excursion,
        date,
        people,
        total,
        payment_status: "pending",
        created_at: serverTimestamp(),
      });

      // Redirect to ABSA Hosted Payment Page
      const merchantID = "bbm_coraplexltd_1232735_mur";
      const reference = encodeURIComponent(excursion);
      const returnUrl = encodeURIComponent(
        "https://mehdi00712.github.io/mautours/success.html"
      );

      // Example Hosted Payment URL (update to real one if provided)
      const absaUrl = `https://www.hostedpayments.com/pay?merchant=${merchantID}&amount=${total}&reference=${reference}&return_url=${returnUrl}`;

      window.location.href = absaUrl;
    } catch (error) {
      console.error("Booking failed:", error);
      alert("Something went wrong while saving your booking.");
    }
  });
}

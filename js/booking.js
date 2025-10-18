import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Select package
window.selectPackage = function (name, price) {
  const section = document.getElementById("checkoutSection");
  document.getElementById("excursion").value = name;
  document.getElementById("total").value = price;
  section.classList.remove("hidden");
  section.scrollIntoView({ behavior: "smooth" });
};

// Booking submission
const form = document.getElementById("bookingForm");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const excursion = document.getElementById("excursion").value;
    const date = document.getElementById("date").value;
    const people = document.getElementById("people").value;
    const total = document.getElementById("total").value;

    if (!name || !email || !phone || !date || !people) {
      alert("Please fill all fields.");
      return;
    }

    try {
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

      // ABSA Hosted Payment Redirect
      const merchantID = "bbm_coraplexltd_1232735_mur";
      const returnUrl = encodeURIComponent(
        "https://mehdi00712.github.io/mautours/success.html"
      );
      const absaUrl = `https://www.hostedpayments.com/pay?merchant=${merchantID}&amount=${total}&reference=${encodeURIComponent(
        excursion
      )}&return_url=${returnUrl}`;

      window.location.href = absaUrl;
    } catch (err) {
      console.error(err);
      alert("Error saving booking. Please try again later.");
    }
  });
}

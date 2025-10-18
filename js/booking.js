import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

window.bookNow = async function (excursion, price) {
  const name = prompt("Enter your full name:");
  const email = prompt("Enter your email:");
  const phone = prompt("Enter your phone number:");
  const date = prompt("Enter your travel date (YYYY-MM-DD):");
  const people = prompt("Number of people:");

  if (!name || !email || !phone || !date || !people) {
    alert("Please fill all fields before booking.");
    return;
  }

  const total = price * parseInt(people);

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

    // Redirect to ABSA Hosted Payments
    const merchantID = "bbm_coraplexltd_1232735_mur";
    const returnUrl = encodeURIComponent(
      "https://mehdi00712.github.io/mautours/success.html"
    );
    const absaUrl = `https://www.hostedpayments.com/pay?merchant=${merchantID}&amount=${total}&reference=${encodeURIComponent(
      excursion
    )}&return_url=${returnUrl}`;

    window.location.href = absaUrl;
  } catch (err) {
    console.error("Booking Error:", err);
    alert("Something went wrong. Please try again later.");
  }
};

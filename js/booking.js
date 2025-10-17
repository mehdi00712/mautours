import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const form = document.getElementById("bookingForm");
const excursionInput = document.getElementById("excursion");

// Autofill excursion name from URL (e.g. ?excursion=Ile+aux+Cerfs)
const urlParams = new URLSearchParams(window.location.search);
const excursionName = urlParams.get("excursion");
if (excursionName) excursionInput.value = decodeURIComponent(excursionName);

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const excursion = document.getElementById("excursion").value;
  const date = document.getElementById("date").value;
  const people = document.getElementById("people").value;

  try {
    // Save booking in Firestore
    await addDoc(collection(db, "bookings"), {
      name,
      email,
      phone,
      excursion,
      date,
      people,
      payment_status: "pending",
      created_at: serverTimestamp(),
    });

    // Redirect to ABSA Hosted Payment Page
    const redirectUrl = encodeURIComponent(window.location.origin + "/success.html");
    const merchantID = "bbm_coraplexltd_1232735_mur";

    // Example ABSA URL (replace if your live URL differs)
    const absaUrl = `https://www.hostedpayments.com/pay?merchant=${merchantID}&amount=1000&reference=${encodeURIComponent(
      excursion
    )}&return_url=${redirectUrl}`;

    window.location.href = absaUrl;
  } catch (error) {
    alert("Error while booking. Please try again.");
    console.error(error);
  }
});

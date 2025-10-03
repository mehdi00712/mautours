// js/booking.js
// IMPORTANT: replace with your deployed Cloud Function URL:
const CREATE_ABSA_SESSION_URL =
  "https://us-central1-mautours-60318.cloudfunctions.net/createAbsaPaymentSession";

const SUCCESS_URL = location.origin + "/payment-success.html";
const CANCEL_URL  = location.origin + "/payment-cancel.html";

import { db } from "./firebase-config.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Wire all .book-form forms
document.addEventListener("submit", async (e)=>{
  const form = e.target.closest(".book-form");
  if (!form) return;
  e.preventDefault();

  const status = form.querySelector(".status");
  const tourId = form.dataset.tour;
  const title  = form.dataset.title;
  const price  = Number(form.dataset.price || 0);
  const date   = form.date.value;
  const pax    = Number(form.pax.value || 1);

  if (!date || pax < 1 || !price) {
    status.textContent = "Please select a date and passengers.";
    return;
  }

  status.textContent = "Creating booking…";

  try {
    // 1) Save booking
    const ref = await addDoc(collection(db, "bookings"), {
      tourId, title, date, pax, price, currency: "MUR",
      status: "pending_payment",
      createdAt: serverTimestamp()
    });

    // 2) Create gateway session
    const res = await fetch(CREATE_ABSA_SESSION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: ref.id,
        // If your gateway expects minor units, the function will multiply (see AMOUNT_MODE)
        amount: price * pax,
        currency: "MUR",
        successUrl: `${SUCCESS_URL}?bookingId=${encodeURIComponent(ref.id)}`,
        cancelUrl:  `${CANCEL_URL}?bookingId=${encodeURIComponent(ref.id)}`
      })
    });

    if (!res.ok) {
      const txt = await res.text().catch(()=> "");
      console.error("Function error:", res.status, txt);
      status.textContent = `Payment error (${res.status}). Please contact us.`;
      return;
    }

    const data = await res.json().catch(()=> ({}));
    if (!data || !data.paymentUrl) {
      console.error("No paymentUrl in response:", data);
      status.textContent = "Payment session error. Please contact us.";
      return;
    }

    // 3) Redirect to ABSA
    window.location.href = data.paymentUrl;

  } catch (err) {
    console.error(err);
    status.textContent = "Unexpected error. Please try again.";
  }
});

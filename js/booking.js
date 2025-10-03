// js/booking.js
import { db } from "./firebase-config.js";
import {
  collection, addDoc, serverTimestamp, doc, onSnapshot, updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Set your Cloud Function endpoint here:
const CREATE_ABSA_SESSION_URL = "https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/createAbsaPaymentSession";
// After ABSA returns, you’ll redirect to success/cancel pages below:
const SUCCESS_URL = location.origin + "/payment-success.html";
const CANCEL_URL  = location.origin + "/payment-cancel.html";

// Wire all booking forms
document.addEventListener("submit", async (e)=>{
  const form = e.target.closest(".book-form");
  if(!form) return;
  e.preventDefault();

  const status = form.querySelector(".status");
  const tourId = form.dataset.tour;
  const title  = form.dataset.title;
  const price  = parseInt(form.dataset.price,10);
  const date   = form.date.value;
  const pax    = parseInt(form.pax.value,10);

  if(!date || pax<1){ status.textContent="Please select a date and passengers."; return; }

  status.textContent = "Creating booking…";

  try{
    // 1) Create booking doc
    const ref = await addDoc(collection(db, "bookings"), {
      tourId, title, date, pax, price,
      currency: "MUR",
      status: "pending_payment",
      createdAt: serverTimestamp()
    });

    // 2) Ask server to create ABSA payment session
    const res = await fetch(CREATE_ABSA_SESSION_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        bookingId: ref.id,
        amount: price * pax, // adjust if child pricing etc.
        currency: "MUR",
        successUrl: `${SUCCESS_URL}?bookingId=${encodeURIComponent(ref.id)}`,
        cancelUrl:  `${CANCEL_URL}?bookingId=${encodeURIComponent(ref.id)}`
      })
    });

    if(!res.ok){
      status.textContent = "Could not start payment. Please try again or contact us.";
      return;
    }
    const { paymentUrl } = await res.json();
    if(!paymentUrl){
      status.textContent = "Payment session error. Please contact us on WhatsApp.";
      return;
    }

    // 3) Redirect to ABSA hosted checkout
    window.location.href = paymentUrl;

  }catch(err){
    console.error(err);
    status.textContent = "Unexpected error. Please try again.";
  }
});

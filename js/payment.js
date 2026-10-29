// js/payment.js
// Payment portal – Absa payment gateway (Fiserv IPG Checkouts).
// The browser asks the Cloud Function "createAbsaPayment" to check the booking and
// create a signed payment, then sends the customer to the bank's hosted payment page.
// Card details are entered only on that page.

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js";
import { getWhatsappNumber } from "./booking-store.js";
import { watchPayment } from "./pay-watch.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const functions = getFunctions(app, "us-central1");
const createAbsaPayment = httpsCallable(functions, "createAbsaPayment");

const params = new URLSearchParams(location.search);
const statusBox = document.getElementById("payStatus");
const form = document.getElementById("payForm");
const payBtn = document.getElementById("payBtn");

const refInput = document.getElementById("payRef");
if (params.get("ref") && refInput) refInput.value = params.get("ref").toUpperCase();

function setStatus(kind, html) {
  statusBox.className = `pay-status ${kind}`;
  statusBox.innerHTML = html;
  statusBox.style.display = "block";
}

setStatus(
  "ready",
  `<strong>Secure online payment</strong><br>Enter your booking reference and email. You will be taken to Absa's secure payment page to pay by card.`
);

if (params.get("status") === "cancel") {
  setStatus("soon", `<strong>Payment cancelled.</strong><br>No money was taken. You can try again below whenever you are ready.`);
}

async function whatsappHelp(ref = "") {
  const number = await getWhatsappNumber(db);
  const text = `Hello Mautour Holidays, I need help paying for my booking${ref ? ` ${ref}` : ""}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

document.querySelector("[data-wa-help]")?.addEventListener("click", async (e) => {
  e.preventDefault();
  window.open(await whatsappHelp(refInput?.value.trim().toUpperCase()), "_blank", "noopener");
});


const FRIENDLY = {
  "not-found": "We could not find this booking reference. Please check it, or contact us on WhatsApp.",
  "permission-denied": "The email does not match this booking. Please use the email you booked with.",
  "failed-precondition": null, // use server message
  "invalid-argument": null
};

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const bookingRef = refInput.value.trim().toUpperCase();
  const email = document.getElementById("payEmail").value.trim();
  const amount = Number(document.getElementById("payAmount").value || 0);
  const terms = document.getElementById("payTerms").checked;

  if (!bookingRef || !email || !terms) {
    setStatus("soon", "Please enter your booking reference and email, and accept the cancellation policy and payment terms.");
    return;
  }

  payBtn.disabled = true;
  const original = payBtn.textContent;
  payBtn.textContent = "Connecting to secure payment…";

  try {
    const result = await createAbsaPayment({ bookingRef, email, amount });
    const { redirectUrl, mode } = result.data || {};
    if (!redirectUrl || !/^https:\/\//.test(redirectUrl)) throw new Error("No payment data returned");

    if (mode === "link") {
      payBtn.style.display = "none";
      statusBox.className = "pay-status ready";
      watchPayment({ functions, box: statusBox, url: redirectUrl, bookingRef, email });
      return;
    }

    setStatus("ready", `<strong>Redirecting to Absa secure payment…</strong><br>Reference ${bookingRef}`);
    window.location.href = redirectUrl;
  } catch (error) {
    console.error("Payment error:", error);
    const code = String(error.code || "").replace("functions/", "");
    const known = code in FRIENDLY ? FRIENDLY[code] || error.message : null;
    const help = await whatsappHelp(bookingRef);

    setStatus(
      "soon",
      known
        ? `<strong>${known}</strong>`
        : `<strong>Online card payment is temporarily unavailable.</strong><br>Please <a href="${help}" target="_blank" rel="noopener">message us on WhatsApp</a> and we will send you the payment instructions for booking ${bookingRef}.`
    );
    payBtn.disabled = false;
    payBtn.textContent = original;
  }
});

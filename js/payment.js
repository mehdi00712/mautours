// js/payment.js
// Payment portal page. Uses the payment link saved in Admin → Settings
// (siteContent/settings.paymentLink) or, if the customer came from a package
// that has its own link, that package's link. Until a link exists, customers
// are asked to arrange payment on WhatsApp.

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEFAULT_WHATSAPP = "23052542792";

const params = new URLSearchParams(window.location.search);
const packageId = params.get("id") || "";

const statusBox = document.getElementById("payStatus");
const form = document.getElementById("payForm");
const packageInput = document.getElementById("payPackage");
const payBtn = document.getElementById("payBtn");

let paymentLink = "";
let whatsappNumber = DEFAULT_WHATSAPP;

function isSafeHttpsUrl(value) {
  try {
    return new URL(String(value || "").trim()).protocol === "https:";
  } catch {
    return false;
  }
}

function value(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function whatsappUrl(text) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
}

function showSoon() {
  statusBox.className = "pay-status soon";
  statusBox.innerHTML = `
    <strong>Online card payment is coming soon.</strong><br>
    Fill in the form and press the button: we will send you the payment instructions on WhatsApp.
  `;
  payBtn.textContent = "Request Payment Instructions on WhatsApp";
}

function showReady() {
  statusBox.className = "pay-status ready";
  statusBox.innerHTML = `
    <strong>Secure online payment is available.</strong><br>
    After filling in the form you will be taken to our bank's secure payment page.
  `;
  payBtn.textContent = "Proceed to Secure Payment";
}

async function init() {
  let packageLink = "";

  try {
    const settingsSnap = await getDoc(doc(db, "siteContent", "settings"));
    if (settingsSnap.exists()) {
      const s = settingsSnap.data();
      paymentLink = s.paymentLink || "";
      if (s.whatsappNumber) whatsappNumber = String(s.whatsappNumber).replace(/\D/g, "") || DEFAULT_WHATSAPP;
    }

    if (packageId) {
      const tripSnap = await getDoc(doc(db, "trips", packageId));
      if (tripSnap.exists()) {
        const trip = tripSnap.data();
        if (packageInput && !packageInput.value) packageInput.value = trip.title || "";
        packageLink = trip.paymentLink || "";
      }
    }
  } catch (error) {
    console.error("Payment page load error:", error);
  }

  if (isSafeHttpsUrl(packageLink)) paymentLink = packageLink.trim();
  else if (!isSafeHttpsUrl(paymentLink)) paymentLink = "";

  if (paymentLink) showReady();
  else showSoon();
}

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = value("payName");
    const email = value("payEmail");
    const pkg = value("payPackage");
    const amount = Number(value("payAmount") || 0);
    const terms = document.getElementById("payTerms")?.checked;

    if (!name || !email || !pkg || amount <= 0 || !terms) {
      statusBox.className = "pay-status soon";
      statusBox.textContent = "Please fill in every field and accept the cancellation policy and payment terms.";
      return;
    }

    const summary =
`Hello Mautour Holidays, I would like to pay for my booking.
Name: ${name}
Email: ${email}
Package: ${pkg}
Confirmed amount: € ${amount.toFixed(2)}
I accept the cancellation policy and payment terms.`;

    if (paymentLink) {
      window.location.href = paymentLink;
    } else {
      window.open(whatsappUrl(summary + "\nPlease send me the payment instructions."), "_blank", "noopener,noreferrer");
    }
  });
}

init();

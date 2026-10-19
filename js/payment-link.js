// js/payment-link.js
// Shows a "Pay Online" button in the booking note when a payment link is set.
// The link comes from the package (trips/{id}.paymentLink) or, if empty,
// from the admin Settings (siteContent/settings.paymentLink).
// When no link is set, the original WhatsApp-only note is kept.

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let cachedSettingsLink = null;

function isSafeHttpsUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

async function getSettingsPaymentLink(db) {
  if (cachedSettingsLink !== null) return cachedSettingsLink;

  try {
    const snap = await getDoc(doc(db, "siteContent", "settings"));
    cachedSettingsLink = snap.exists() ? snap.data().paymentLink || "" : "";
  } catch (error) {
    console.error("Payment link settings error:", error);
    cachedSettingsLink = "";
  }

  return cachedSettingsLink;
}

function injectPaymentStyles() {
  if (document.getElementById("paymentLinkStyles")) return;

  const style = document.createElement("style");
  style.id = "paymentLinkStyles";
  style.textContent = `
    .pay-online-btn {
      display: inline-block;
      margin-top: 12px;
      padding: 12px 22px;
      border-radius: 999px;
      background: var(--gold, #c9a227);
      color: #fff;
      font-weight: 800;
      text-decoration: none;
    }
    .pay-online-btn:hover { opacity: 0.9; }
  `;
  document.head.appendChild(style);
}

export async function applyPaymentLink(db, packageLink = "") {
  const notes = document.querySelectorAll(".whatsapp-booking-note");
  if (!notes.length) return;

  // Remember the original note so it can be restored for packages without a link.
  notes.forEach((note) => {
    if (!note.dataset.originalHtml) note.dataset.originalHtml = note.innerHTML;
  });

  let link = isSafeHttpsUrl(packageLink) ? packageLink.trim() : "";

  if (!link) {
    const settingsLink = await getSettingsPaymentLink(db);
    link = isSafeHttpsUrl(settingsLink) ? settingsLink.trim() : "";
  }

  notes.forEach((note) => {
    if (!link) {
      note.innerHTML = note.dataset.originalHtml;
      return;
    }

    injectPaymentStyles();

    note.innerHTML = `
      <strong>Secure online payment available.</strong>
      <span>
        Send your request on WhatsApp first so we can confirm availability and the final price,
        then pay securely online using the button below.
      </span>
      <a class="pay-online-btn" target="_blank" rel="noopener noreferrer"></a>
    `;

    const btn = note.querySelector(".pay-online-btn");
    btn.href = link;
    btn.textContent = "Pay Online";
  });
}

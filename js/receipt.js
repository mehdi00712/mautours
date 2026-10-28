// js/receipt.js – shows the verified payment receipt after Absa / CyberSource.

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js";
import { clearCart, getCart } from "./cart.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const getPaymentStatus = httpsCallable(getFunctions(app, "us-central1"), "getPaymentStatus");

const p = new URLSearchParams(location.search);
const status = (p.get("status") || "").toLowerCase();
const ref = (p.get("ref") || "").toUpperCase();
const receipt = (p.get("receipt") || "").toUpperCase();

const $ = (id) => document.getElementById(id);

const ICONS = {
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  bad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
};

function show({ eyebrow, title, text, icon, ok }) {
  $("rcEyebrow").textContent = eyebrow;
  $("rcTitle").textContent = title;
  $("rcText").textContent = text;
  if (icon) $("rcIcon").innerHTML = icon;
  $("rcCard").classList.toggle("rc-ok", !!ok);
  $("rcCard").classList.toggle("rc-bad", !ok);
}

async function init() {
  const retry = $("rcRetry");
  retry.href = `payment.html${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;

  if (status === "accept" && ref && receipt) {
    try {
      const { data } = await getPaymentStatus({ bookingRef: ref, receipt });
      show({
        eyebrow: "Payment received",
        title: "Thank you – your payment is confirmed",
        text: "Here is your receipt. A copy is kept with your booking. We will contact you on WhatsApp with your final arrangements.",
        icon: ICONS.ok,
        ok: true
      });
      $("rcReceipt").textContent = data.receiptNumber;
      $("rcRef").textContent = data.bookingRef;
      $("rcName").textContent = data.name || "–";
      $("rcItem").textContent = data.item || "–";
      $("rcDate").textContent = data.date || "–";
      $("rcAmount").textContent = `${data.currency} ${Number(data.amount || 0).toFixed(2)}`;
      $("rcTxn").textContent = data.transactionId || "–";
      $("rcPaidAt").textContent = data.paidAt ? new Date(data.paidAt).toLocaleString("en-GB", { timeZone: "Indian/Mauritius" }) + " (Mauritius time)" : "–";
      $("rcList").style.display = "grid";
      if (getCart().length && data.item && getCart().every((i) => data.item.includes(i.title.split(" – ")[0]))) {
        clearCart();
      }
      $("rcPrint").style.display = "inline-flex";
      return;
    } catch (error) {
      console.error("Receipt error:", error);
      show({
        eyebrow: "Payment received",
        title: "Your payment was accepted",
        text: `Receipt number ${receipt} for booking ${ref}. We could not load the full receipt right now – please keep this page or contact us.`,
        icon: ICONS.ok,
        ok: true
      });
      return;
    }
  }

  if (status === "cancel") {
    show({ eyebrow: "Payment cancelled", title: "No payment was taken", text: "You cancelled the payment. You can try again whenever you are ready.", icon: ICONS.bad });
  } else if (status === "review") {
    show({ eyebrow: "Payment under review", title: "Your payment is being reviewed", text: "The bank is reviewing this payment. We will contact you as soon as it is confirmed.", icon: ICONS.bad });
  } else if (status === "decline") {
    show({ eyebrow: "Payment declined", title: "Your payment was not approved", text: "Your card was declined by the bank. Please try another card or contact your bank.", icon: ICONS.bad });
  } else {
    show({ eyebrow: "Payment", title: "We could not confirm this payment", text: "Something went wrong. If money was taken from your card, please contact us with your booking reference.", icon: ICONS.bad });
  }
  retry.style.display = "inline-flex";
}

$("rcPrint").addEventListener("click", () => window.print());
init();

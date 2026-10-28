// js/my-bookings.js – customer account: bookings, payment status, receipts.

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const list = document.getElementById("bookingsList");

const esc = (v) =>
  String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const money = (n, c = "EUR") => `${c === "EUR" ? "€" : c} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function statusChip(b) {
  if (b.paymentStatus === "Paid") return `<span class="chip ok">Paid</span>`;
  if (b.bookingStatus === "Rejected") return `<span class="chip bad">Not available</span>`;
  if (/failed/i.test(b.paymentStatus || "")) return `<span class="chip bad">Payment failed</span>`;
  if (b.bookingStatus === "Confirmed") return `<span class="chip ok">Confirmed</span>`;
  return `<span class="chip">Awaiting confirmation</span>`;
}

function card(b) {
  const amount = Number(b.paidAmount || b.confirmedAmount || b.totalPrice || 0);
  const items = Array.isArray(b.items) && b.items.length
    ? `<ul class="cart-lines">${b.items
        .map((i) => `<li><span>${esc(i.title)} · ${esc(i.date)}${i.time ? ` ${esc(i.time)}` : ""}</span><strong>${money(i.total)}</strong></li>`)
        .join("")}</ul>`
    : `<p>${esc(b.package || b.vehicleName || "Booking")}${b.date ? ` · ${esc(b.date)}` : ""}${b.people ? ` · ${esc(b.people)} people` : ""}</p>`;

  const canPay = b.paymentStatus !== "Paid" && b.bookingStatus !== "Rejected" && Number(b.confirmedAmount || 0) > 0;
  const receipt =
    b.paymentStatus === "Paid" && b.receiptNumber
      ? `<a class="v2-mini-btn ghost" href="success.html?status=accept&ref=${encodeURIComponent(b.bookingRef || b.id)}&receipt=${encodeURIComponent(b.receiptNumber)}">View receipt ${esc(b.receiptNumber)}</a>`
      : "";

  return `
    <article class="acct-card">
      <div class="acct-card-top">
        <div>
          <span class="v2-eyebrow">${esc(b.bookingRef || b.id)}</span>
          <h3>${esc(b.package || "Booking")}</h3>
        </div>
        ${statusChip(b)}
      </div>
      ${items}
      <div class="acct-card-foot">
        <div class="veh-from">${amount ? `${b.paymentStatus === "Paid" ? "Paid" : "Total"} <strong>${money(b.paidAmount || amount, b.paidCurrency || "EUR")}</strong>` : "<strong>Price to be confirmed</strong>"}</div>
        <div class="acct-btns">
          ${receipt}
          ${canPay ? `<a class="v2-mini-btn" href="payment.html?ref=${encodeURIComponent(b.bookingRef || b.id)}">Pay ${money(b.confirmedAmount)}</a>` : ""}
        </div>
      </div>
      ${b.bookingStatus === "Rejected" && b.rejectionReason ? `<div class="cart-warning">${esc(b.rejectionReason)}</div>` : ""}
    </article>`;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "login.html?redirect=my-bookings.html";
    return;
  }

  document.getElementById("acctWho").textContent = `Signed in as ${user.email}`;

  try {
    const snap = await getDocs(query(collection(db, "bookings"), where("userId", "==", user.uid)));
    const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    bookings.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

    list.innerHTML = bookings.length
      ? bookings.map(card).join("")
      : `<div class="cart-empty"><h3>No bookings yet</h3><p>When you book a package or a vehicle while signed in, it appears here.</p>
           <div class="v2-center-actions"><a class="btn" href="booking.html">Browse Packages</a><a class="btn-outline" href="vehicles.html">See Vehicles</a></div></div>`;
  } catch (error) {
    console.error("My bookings error:", error);
    list.innerHTML = `<div class="veh-empty">Your bookings could not be loaded. Please refresh the page.</div>`;
  }
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  location.href = "index.html";
});

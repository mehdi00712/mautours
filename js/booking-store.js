// js/booking-store.js
// Saves every booking request to Firestore (collection "bookings") with a
// booking reference and the traveller details the Tourism Authority requires
// (Letter of Intent, point 8): full name, address, NIC/passport, age, gender,
// contact number, date, currency.

import {
  doc,
  setDoc,
  getDoc as _getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getApps } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

export const WHATSAPP_DEFAULT = "23059066404";

export function makeBookingRef() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const rnd = new Uint32Array(5);
  crypto.getRandomValues(rnd);
  rnd.forEach((n) => (code += alphabet[n % alphabet.length]));
  return `MT${yy}${mm}${dd}-${code}`;
}

/* ---------- Traveller (record) fields ---------- */

const FIELD_STYLE_ID = "travellerFieldStyles";

function injectStyles() {
  if (document.getElementById(FIELD_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = FIELD_STYLE_ID;
  style.textContent = `
    .traveller-box {
      margin: 16px 0;
      padding: 16px;
      border: 1px solid var(--line, #e5e7eb);
      border-radius: 16px;
      background: #fbfaf6;
    }
    .traveller-box h4 { margin: 0 0 4px; color: var(--darkblue, #071827); font-size: 1rem; }
    .traveller-box p { margin: 0 0 12px; font-size: 0.82rem; line-height: 1.5; }
    .traveller-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .traveller-grid .full { grid-column: 1 / -1; }
    .traveller-grid label { display: block; font-size: 0.78rem; font-weight: 700; color: var(--darkblue, #071827); margin-bottom: 4px; }
    .traveller-grid input, .traveller-grid select {
      width: 100%;
      padding: 11px 12px;
      border: 1px solid var(--line, #e5e7eb);
      border-radius: 12px;
      font: inherit;
      font-size: 0.92rem;
      background: #fff;
      margin: 0;
    }
    @media (max-width: 520px) { .traveller-grid { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}

export function travellerFieldsHtml(prefix = "tr") {
  return `
    <div class="traveller-box" data-traveller-prefix="${prefix}">
      <h4>Lead traveller details</h4>
      <p>Required by the Tourism Authority of Mauritius for every booking. Kept private and only used for your booking.</p>
      <div class="traveller-grid">
        <div class="full">
          <label for="${prefix}Address">Home address</label>
          <input id="${prefix}Address" type="text" autocomplete="street-address" required placeholder="Street, city, country">
        </div>
        <div>
          <label for="${prefix}Nationality">Nationality</label>
          <input id="${prefix}Nationality" type="text" autocomplete="country-name" required placeholder="e.g. Emirati">
        </div>
        <div>
          <label for="${prefix}IdType">ID type</label>
          <select id="${prefix}IdType" required>
            <option value="Passport">Passport</option>
            <option value="NIC">Mauritian NIC</option>
          </select>
        </div>
        <div>
          <label for="${prefix}IdNumber">Passport / NIC number</label>
          <input id="${prefix}IdNumber" type="text" required autocomplete="off">
        </div>
        <div>
          <label for="${prefix}Age">Age</label>
          <input id="${prefix}Age" type="number" min="1" max="120" required>
        </div>
        <div>
          <label for="${prefix}Gender">Gender</label>
          <select id="${prefix}Gender" required>
            <option value="">Select</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>
      </div>
    </div>
  `;
}

export function insertTravellerFields(beforeElement, prefix = "tr") {
  if (!beforeElement || document.querySelector(`[data-traveller-prefix="${prefix}"]`)) return;
  injectStyles();
  beforeElement.insertAdjacentHTML("beforebegin", travellerFieldsHtml(prefix));
}

export function readTravellerFields(prefix = "tr") {
  const v = (id) => document.getElementById(prefix + id)?.value.trim() || "";
  return {
    address: v("Address"),
    nationality: v("Nationality"),
    idType: v("IdType"),
    idNumber: v("IdNumber"),
    age: Number(v("Age") || 0),
    gender: v("Gender")
  };
}

export function travellerFieldsComplete(t) {
  return Boolean(t.address && t.nationality && t.idType && t.idNumber && t.age > 0 && t.gender);
}

/* ---------- Save ---------- */

export async function saveBooking(db, data) {
  const bookingRef = makeBookingRef();

  let userId = "";
  try {
    userId = getAuth(getApps()[0]).currentUser?.uid || "";
  } catch {
    userId = "";
  }

  const payload = {
    bookingRef,
    ...(userId ? { userId } : {}),
    source: "website",
    currency: "EUR",
    bookingStatus: "Pending",
    paymentStatus: "Unpaid",
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, "bookings", bookingRef), payload);
  return bookingRef;
}

/* ---------- Confirmation dialog ---------- */

export function showBookingConfirmation({ bookingRef, whatsappUrl, title = "Booking request received" }) {
  let box = document.getElementById("bookingConfirmBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "bookingConfirmBox";
    box.style.cssText =
      "position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;background:rgba(7,24,39,.6);padding:16px;";
    document.body.appendChild(box);
  }

  box.innerHTML = `
    <div style="background:#fff;border-radius:22px;max-width:460px;width:100%;padding:28px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.25)">
      <div style="font-size:.78rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#c9a227;margin-bottom:8px">${title}</div>
      <h3 style="font-family:'Playfair Display',Georgia,serif;color:#071827;font-size:1.5rem;margin-bottom:6px">Your reference</h3>
      <div style="font-size:1.6rem;font-weight:900;letter-spacing:.06em;color:#071827;margin-bottom:14px">${bookingRef}</div>
      <p style="font-size:.93rem;line-height:1.6;margin-bottom:18px">
        We have saved your request. WhatsApp has opened so you can send it to our team –
        we will confirm availability and the final price. Once confirmed, pay securely online with this reference.
      </p>
      <div style="display:flex;flex-direction:column;gap:10px">
        <a class="btn" href="${whatsappUrl}" target="_blank" rel="noopener">Open WhatsApp again</a>
        <a class="btn-outline" href="payment.html?ref=${encodeURIComponent(bookingRef)}">Go to payment page</a>
        <button type="button" class="btn-outline" id="bookingConfirmClose" style="border-color:#e5e7eb">Close</button>
      </div>
    </div>
  `;

  box.style.display = "flex";
  box.querySelector("#bookingConfirmClose").onclick = () => (box.style.display = "none");
}

/* ---------- WhatsApp number from Admin → Settings ---------- */


let _waCache = null;
export async function getWhatsappNumber(db) {
  if (_waCache) return _waCache;
  try {
    const snap = await _getDoc(doc(db, "siteContent", "settings"));
    const n = snap.exists() ? String(snap.data().whatsappNumber || "").replace(/\D/g, "") : "";
    _waCache = n || WHATSAPP_DEFAULT;
  } catch {
    _waCache = WHATSAPP_DEFAULT;
  }
  return _waCache;
}

// Open a tab immediately (so pop-up blockers allow it), then point it at WhatsApp
// once the booking has been saved.
export function openPendingTab() {
  try {
    return window.open("about:blank", "_blank");
  } catch {
    return null;
  }
}

export function sendTabTo(tab, url) {
  if (tab && !tab.closed) {
    tab.location.href = url;
  } else {
    window.open(url, "_blank", "noopener");
  }
}

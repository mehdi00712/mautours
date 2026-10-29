// js/cart-page.js – cart & checkout.
// Totals are calculated with the same calculator the server uses (pricing.js),
// using the current prices from the database. The server recalculates at checkout,
// so the customer always pays exactly the total shown here.

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js";
import { onCartChange, removeFromCart, updateCartItem } from "./cart.js";
import { pricePackageItem, priceVehicleItem, roundMoney } from "./pricing.js";
import { packageImage, placeholderImage } from "./price-format.js";
import {
  insertTravellerFields,
  readTravellerFields,
  travellerFieldsComplete,
  saveBooking,
  getWhatsappNumber
} from "./booking-store.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const createCartCheckout = httpsCallable(getFunctions(app, "us-central1"), "createCartCheckout");

const $ = (id) => document.getElementById(id);
const listEl = $("cartList");
const summaryEl = $("cartSummary");
const checkoutEl = $("checkoutBox");

let cartItems = [];
let priced = []; // [{item, result, doc}]
let user = null;
let renderToken = 0;
const docCache = new Map();

function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const money = (n) => `€ ${roundMoney(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

async function getDocCached(col, id) {
  const key = `${col}/${id}`;
  if (!docCache.has(key)) {
    docCache.set(
      key,
      getDoc(doc(db, col, id)).then((s) => (s.exists() ? { id: s.id, ...s.data() } : null))
    );
  }
  return docCache.get(key);
}

async function priceItem(item) {
  try {
    return await priceItemInner(item);
  } catch (error) {
    console.error("Price load error:", error);
    docCache.clear();
    return { item, doc: null, result: { ok: false, error: "We could not load the current price. Please refresh the page." } };
  }
}

async function priceItemInner(item) {
  if (item.type === "vehicle") {
    const v = await getDocCached("vehicles", item.refId);
    return { item, doc: v, result: priceVehicleItem(item, v) };
  }
  const trip = await getDocCached("trips", item.refId);
  const vehicle = item.vehicleId ? await getDocCached("vehicles", item.vehicleId) : null;
  return { item, doc: trip, result: pricePackageItem(item, trip, vehicle) };
}

function itemDetails(item) {
  const bits = [];
  if (item.date) bits.push(`${item.date}${item.time ? ` at ${item.time}` : ""}`);
  if (item.type === "package") bits.push(`${item.people} ${item.people > 1 ? "people" : "person"}`);
  if (item.type === "vehicle") {
    if (item.passengers) bits.push(`${item.passengers} passenger${item.passengers > 1 ? "s" : ""}`);
    if (item.pickup) bits.push(`Pick-up: ${item.pickup}`);
    if (item.dropoff) bits.push(`To: ${item.dropoff}`);
    if (item.flight) bits.push(`Flight ${item.flight}`);
  }
  if (item.vehicleName) bits.push(`Vehicle: ${item.vehicleName}`);
  return bits.map(esc).join(" · ");
}

function renderList() {
  if (!cartItems.length) {
    listEl.innerHTML = `
      <div class="cart-empty">
        <h3>Your cart is empty</h3>
        <p>Add a package or a vehicle, then come back here to pay securely online.</p>
        <div class="v2-center-actions">
          <a class="btn" href="booking.html">Browse Packages</a>
          <a class="btn-outline" href="vehicles.html">See Vehicles</a>
        </div>
      </div>`;
    summaryEl.style.display = "none";
    checkoutEl.style.display = "none";
    return;
  }

  summaryEl.style.display = "";
  listEl.innerHTML = priced
    .map(({ item, doc: d, result }) => {
      const img =
        item.type === "vehicle"
          ? d?.imageUrl || placeholderImage(item.title, "Chauffeur vehicle")
          : d
          ? packageImage(d)
          : placeholderImage(item.title, "Package");

      const lines = result.ok
        ? `<ul class="cart-lines">${result.lines
            .map((l) => `<li><span>${esc(l.label)}</span><strong>${money(l.amount)}</strong></li>`)
            .join("")}</ul>`
        : `<div class="cart-warning">${esc(result.error)} <a href="#" data-wa-item="${esc(item.title)}">Ask on WhatsApp</a></div>`;

      const peopleCtrl =
        item.type === "package"
          ? `<div class="cart-qty">
               <button type="button" data-qty="-1" data-id="${item.id}" aria-label="Fewer people">−</button>
               <span>${item.people}</span>
               <button type="button" data-qty="1" data-id="${item.id}" aria-label="More people">+</button>
               <small>people</small>
             </div>`
          : "";

      return `
        <article class="cart-item${result.ok ? "" : " has-error"}">
          <img src="${esc(img)}" alt="">
          <div class="cart-item-body">
            <div class="cart-item-top">
              <div>
                <span class="v2-eyebrow">${item.type === "vehicle" ? "Vehicle" : "Package"}</span>
                <h3>${esc(item.title)}</h3>
                <p>${itemDetails(item)}</p>
              </div>
              <div class="cart-item-total">${result.ok ? money(result.total) : "–"}</div>
            </div>
            ${lines}
            <div class="cart-item-actions">
              ${peopleCtrl}
              <button type="button" class="cart-remove" data-remove="${item.id}">Remove</button>
            </div>
          </div>
        </article>`;
    })
    .join("");

  const ok = priced.filter((p) => p.result.ok);
  const total = roundMoney(ok.reduce((s, p) => s + p.result.total, 0));
  const blocked = priced.length !== ok.length;

  summaryEl.innerHTML = `
    <h3>Order summary</h3>
    <ul class="cart-lines">
      ${ok.map((p) => `<li><span>${esc(p.item.title)}</span><strong>${money(p.result.total)}</strong></li>`).join("")}
    </ul>
    <div class="cart-total"><span>Total to pay</span><strong id="cartTotal">${money(total)}</strong></div>
    <p class="v2-note">All prices in euros, taxes included. This is the exact amount charged.</p>
    ${blocked ? `<div class="cart-warning">Remove the items marked "price on request" (or ask us about them on WhatsApp) to check out.</div>` : ""}
  `;

  renderCheckout(total, blocked);
  bindListEvents();
}

function renderCheckout(total, blocked) {
  checkoutEl.style.display = "";
  if (!user) {
    const back = encodeURIComponent("cart.html");
    checkoutEl.innerHTML = `
      <h3>Checkout</h3>
      <p>Please sign in or create a free account to pay. Your cart is kept.</p>
      <div class="v2-center-actions" style="justify-content:flex-start;margin-top:1rem">
        <a class="btn" href="login.html?redirect=${back}">Sign in</a>
        <a class="btn-outline" href="register.html?redirect=${back}">Create account</a>
      </div>`;
    return;
  }

  if (checkoutEl.dataset.ready === "1") {
    $("payTotalLabel").textContent = money(total);
    $("checkoutBtn").disabled = blocked || total <= 0;
    return;
  }

  checkoutEl.dataset.ready = "1";
  checkoutEl.innerHTML = `
    <h3>Checkout</h3>
    <p class="cart-signed">Signed in as <strong>${esc(user.email)}</strong></p>
    <form id="checkoutForm" novalidate>
      <label for="coName">Full name</label>
      <input id="coName" type="text" required autocomplete="name" value="${esc(user.displayName || "")}">
      <label for="coPhone">WhatsApp / phone</label>
      <input id="coPhone" type="tel" required autocomplete="tel">
      <div id="coTravellerAnchor"></div>
      <label class="pay-check">
        <input id="coTerms" type="checkbox" required>
        <span>I accept the <a href="travel-info.html#cancellation" target="_blank">cancellation policy</a> and
        <a href="travel-info.html#payment" target="_blank">payment terms</a>.</span>
      </label>
      <div id="coMessage" class="vd-message" style="display:none"></div>
      <button id="checkoutBtn" type="submit" class="btn full-width-btn">Pay <span id="payTotalLabel">${money(total)}</span> securely</button>
      <p class="vd-small">You will enter your card on Absa's secure payment page. We never see your card details.</p>
    </form>`;

  insertTravellerFields($("coTravellerAnchor"), "co");
  $("checkoutBtn").disabled = blocked || total <= 0;

  getDoc(doc(db, "users", user.uid))
    .then((s) => {
      if (s.exists()) {
        const u = s.data();
        if (u.phone && !$("coPhone").value) $("coPhone").value = u.phone;
        if (u.name && !$("coName").value) $("coName").value = u.name;
      }
    })
    .catch(() => {});

  $("checkoutForm").addEventListener("submit", onCheckout);
}

function showCoMessage(html) {
  const m = $("coMessage");
  m.innerHTML = html;
  m.style.display = "block";
  m.scrollIntoView({ behavior: "smooth", block: "center" });
}


function payloadItems() {
  return cartItems.map((i) => ({
    type: i.type,
    refId: i.refId,
    date: i.date || "",
    time: i.time || "",
    people: i.people || 0,
    activities: i.activities || [],
    vehicleId: i.vehicleId || "",
    service: i.service || "",
    pickup: i.pickup || "",
    dropoff: i.dropoff || "",
    passengers: i.passengers || 0,
    bags: i.bags || 0,
    flight: i.flight || "",
    notes: i.notes || ""
  }));
}

async function onCheckout(e) {
  e.preventDefault();
  const name = $("coName").value.trim();
  const phone = $("coPhone").value.trim();
  const traveller = readTravellerFields("co");

  if (!name || !phone) return showCoMessage("<strong>Please enter your name and phone number.</strong>");
  if (!travellerFieldsComplete(traveller))
    return showCoMessage("<strong>Please complete the lead traveller details</strong> – they are required by the Tourism Authority of Mauritius.");
  if (!$("coTerms").checked) return showCoMessage("<strong>Please accept the cancellation policy and payment terms.</strong>");

  const shownTotal = roundMoney(priced.filter((p) => p.result.ok).reduce((s, p) => s + p.result.total, 0));
  const btn = $("checkoutBtn");
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = "Connecting to secure payment…";

  try {
    const { data } = await createCartCheckout({
      items: payloadItems(),
      contact: { name, phone },
      traveller,
      expectedTotal: shownTotal
    });

    if (!data?.redirectUrl || !/^https:\/\//.test(data.redirectUrl)) {
      throw Object.assign(new Error("No payment data"), { code: "unavailable" });
    }

    showCoMessage(`<strong>Redirecting to Absa secure payment…</strong><br>Booking reference ${esc(data.bookingRef)} · ${money(data.total)}`);
    window.location.href = data.redirectUrl;
  } catch (error) {
    console.error("Checkout error:", error);
    const code = String(error.code || "").replace("functions/", "");

    if (["invalid-argument", "failed-precondition", "unauthenticated"].includes(code)) {
      showCoMessage(`<strong>${esc(error.message)}</strong>`);
      if (code === "failed-precondition") {
        docCache.clear();
        refresh();
      }
    } else {
      // Online payment not active yet: save the order and continue on WhatsApp.
      try {
        const bookingRef = await saveBooking(db, {
          type: "cart",
          package: cartItems.map((i) => i.title).join(" + "),
          name,
          email: user.email,
          phone,
          ...traveller,
          date: cartItems.map((i) => i.date).filter(Boolean).sort()[0] || "",
          people: Math.max(0, ...cartItems.map((i) => i.people || i.passengers || 0)),
          items: priced.map((p) => ({ ...payloadItems().find((x) => x.refId === p.item.refId), title: p.item.title, total: p.result.ok ? p.result.total : 0 })),
          estimatedFrom: shownTotal,
          userId: user.uid
        });
        const number = await getWhatsappNumber(db);
        const msg = `Hello Mautour Holidays,\n\nBooking reference: *${bookingRef}*\n\n${priced
          .map((p) => `• ${p.item.title} – ${p.result.ok ? money(p.result.total) : "price on request"}`)
          .join("\n")}\n\nTotal: ${money(shownTotal)}\nName: ${name}\nEmail: ${user.email}\nPhone: ${phone}\n\nPlease send me the payment instructions.`;
        const wa = `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
        showCoMessage(
          `<strong>Online card payment is not active yet.</strong><br>Your order is saved with reference <strong>${esc(bookingRef)}</strong>. ` +
            `<a href="${wa}" target="_blank" rel="noopener">Send it to us on WhatsApp</a> and we will send the payment instructions.`
        );
      } catch (saveError) {
        console.error(saveError);
        showCoMessage("<strong>Something went wrong.</strong> Please try again or contact us on WhatsApp.");
      }
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

function bindListEvents() {
  listEl.querySelectorAll("[data-remove]").forEach((b) =>
    b.addEventListener("click", () => removeFromCart(b.dataset.remove))
  );
  listEl.querySelectorAll("[data-qty]").forEach((b) =>
    b.addEventListener("click", () => {
      const item = cartItems.find((i) => i.id === b.dataset.id);
      if (!item) return;
      const people = Math.min(50, Math.max(1, Number(item.people || 1) + Number(b.dataset.qty)));
      if (people !== item.people) updateCartItem(item.id, { people });
    })
  );
  listEl.querySelectorAll("[data-wa-item]").forEach((a) =>
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      const number = await getWhatsappNumber(db);
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(`Hello Mautour Holidays, I would like a price for: ${a.dataset.waItem}`)}`, "_blank", "noopener");
    })
  );
}

async function refresh() {
  const token = ++renderToken;
  priced = await Promise.all(cartItems.map(priceItem));
  if (token !== renderToken) return;
  renderList();
}

onAuthStateChanged(auth, (u) => {
  user = u;
  checkoutEl.dataset.ready = "";
  refresh();
});

onCartChange((items) => {
  cartItems = items;
  refresh();
});

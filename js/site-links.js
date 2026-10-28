// js/site-links.js
// Points every WhatsApp link on the page at the number saved in
// Admin → Settings, keeping each link's pre-filled message.

import { firebaseConfig } from "./firebase-config.js";
import { onCartChange, getCurrentUser } from "./cart.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateWhatsappLinks() {
  try {
    const snap = await getDoc(doc(db, "siteContent", "settings"));
    if (!snap.exists()) return;

    const number = String(snap.data().whatsappNumber || "").replace(/\D/g, "");
    if (!number) return;

    document.querySelectorAll('a[href^="https://wa.me/"]').forEach((a) => {
      const url = new URL(a.href);
      a.href = `https://wa.me/${number}${url.search}`;
    });
  } catch (error) {
    console.error("WhatsApp link settings error:", error);
  }
}

updateWhatsappLinks();

/* ---------- Header: cart + account icons ---------- */


const CART_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';
const USER_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

function setupHeaderIcons() {
  const nav = document.getElementById("nav");
  if (!nav || nav.querySelector(".nav-icon")) return;

  const cta = nav.querySelector(".nav-cta");

  const account = document.createElement("a");
  account.href = "login.html";
  account.className = "nav-icon nav-account";
  account.innerHTML = `${USER_ICON}<span class="nav-icon-label">Sign in</span>`;
  account.setAttribute("aria-label", "Sign in");

  const cart = document.createElement("a");
  cart.href = "cart.html";
  cart.className = "nav-icon nav-cart";
  cart.innerHTML = `${CART_ICON}<span class="nav-icon-label">Cart</span><b class="nav-cart-count" hidden>0</b>`;
  cart.setAttribute("aria-label", "Cart");
  if (/cart\.html$/.test(location.pathname)) cart.classList.add("active");

  nav.insertBefore(account, cta || null);
  nav.insertBefore(cart, cta || null);

  onCartChange((items) => {
    const badge = cart.querySelector(".nav-cart-count");
    badge.textContent = String(items.length);
    badge.hidden = items.length === 0;
  });

  getCurrentUser();
  onAuthStateChanged(getAuth(app), (user) => {
    const label = account.querySelector(".nav-icon-label");
    if (user) {
      account.href = "my-bookings.html";
      label.textContent = "My account";
      account.setAttribute("aria-label", "My account");
    } else {
      account.href = `login.html?redirect=${encodeURIComponent((location.pathname.split("/").pop() || "index.html") + location.search)}`;
      label.textContent = "Sign in";
    }
  });
}

setupHeaderIcons();

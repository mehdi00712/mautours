// js/cart.js – shopping cart.
// Guests: kept in this browser. Signed-in customers: also saved to Firestore
// (carts/{uid}) so the cart follows them to other devices.

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const KEY = "mt_cart_v1";
const MAX_ITEMS = 20;

let items = readLocal();
let currentUser = null;
let started = false;
const listeners = new Set();

function app() {
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

function readLocal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable – cart still works for this page view */
  }
}

async function writeRemote() {
  if (!currentUser) return;
  try {
    await setDoc(doc(getFirestore(app()), "carts", currentUser.uid), {
      items,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.warn("Cart sync failed:", error.message);
  }
}

function emit() {
  writeLocal();
  listeners.forEach((fn) => {
    try {
      fn(items.slice());
    } catch (e) {
      console.error(e);
    }
  });
}

function newId() {
  const a = new Uint32Array(2);
  crypto.getRandomValues(a);
  return `i${a[0].toString(36)}${a[1].toString(36)}`;
}

function start() {
  if (started) return;
  started = true;

  onAuthStateChanged(getAuth(app()), async (user) => {
    currentUser = user;
    if (!user) {
      emit();
      return;
    }

    try {
      const snap = await getDoc(doc(getFirestore(app()), "carts", user.uid));
      const remote = snap.exists() && Array.isArray(snap.data().items) ? snap.data().items : [];
      const ids = new Set(remote.map((i) => i.id));
      items = [...remote, ...items.filter((i) => !ids.has(i.id))].slice(0, MAX_ITEMS);
      emit();
      await writeRemote();
    } catch (error) {
      console.warn("Cart load failed:", error.message);
      emit();
    }
  });
}

/* ---------------- public API ---------------- */

export function getCart() {
  return items.slice();
}

export function cartCount() {
  return items.length;
}

export function onCartChange(fn) {
  listeners.add(fn);
  start();
  fn(items.slice());
  return () => listeners.delete(fn);
}

export function getCurrentUser() {
  start();
  return currentUser;
}

export async function addToCart(item) {
  start();
  if (items.length >= MAX_ITEMS) throw new Error("Your cart is full. Please check out or remove an item first.");
  const entry = { ...item, id: newId(), addedAt: Date.now() };
  items.push(entry);
  emit();
  await writeRemote();
  return entry;
}

export async function updateCartItem(id, patch) {
  items = items.map((i) => (i.id === id ? { ...i, ...patch } : i));
  emit();
  await writeRemote();
}

export async function removeFromCart(id) {
  items = items.filter((i) => i.id !== id);
  emit();
  await writeRemote();
}

export async function clearCart() {
  items = [];
  emit();
  await writeRemote();
}

/* ---------------- small toast ---------------- */

export function cartToast(message, withLink = true) {
  let t = document.getElementById("cartToast");
  if (!t) {
    t = document.createElement("div");
    t.id = "cartToast";
    t.className = "cart-toast";
    document.body.appendChild(t);
  }
  t.innerHTML = `<span>${message}</span>${withLink ? '<a href="cart.html">View cart →</a>' : ""}`;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 5000);
}

// js/vehicles.js
// Public list of chauffeur vehicles (Firestore collection "vehicles").

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { placeholderImage } from "./price-format.js";
import { vehicleFromPrice, vehicleFeatures } from "./vehicle-utils.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const grid = document.getElementById("vehiclesGrid");
const chips = document.getElementById("vehicleChips");
const countEl = document.getElementById("vehicleCount");

let allVehicles = [];
let activeCategory = "all";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shortText(text, max = 170) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

function vehicleCard(v) {
  const img = v.imageUrl || placeholderImage(v.name, "Chauffeur vehicle");
  const from = vehicleFromPrice(v);
  const features = vehicleFeatures(v).slice(0, 4);

  return `
    <a class="veh-card" href="vehicle-details.html?id=${encodeURIComponent(v.id)}">
      <div class="veh-card-img">
        <img src="${escapeHtml(img)}" alt="${escapeHtml(v.name || "Vehicle")}" loading="lazy">
        <span class="veh-badge">${escapeHtml(v.category || "Vehicle")}</span>
      </div>
      <div class="veh-card-body">
        <h3>${escapeHtml(v.name || "Vehicle")}</h3>
        <div class="veh-specs">
          ${v.capacity ? `<span>Up to ${escapeHtml(v.capacity)} passengers</span>` : ""}
          ${v.luggage ? `<span>${escapeHtml(v.luggage)}</span>` : ""}
        </div>
        <p>${escapeHtml(shortText(v.description))}</p>
        ${
          features.length
            ? `<ul class="veh-feats">${features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`
            : ""
        }
        <div class="veh-card-foot">
          <div class="veh-from">${from ? `From <strong>€ ${from.toLocaleString()}</strong>` : "<strong>Price on request</strong>"}<small>with chauffeur · taxes included</small></div>
          <span class="v2-mini-btn">View &amp; book</span>
        </div>
      </div>
    </a>
  `;
}

function render() {
  const list =
    activeCategory === "all"
      ? allVehicles
      : allVehicles.filter((v) => (v.category || "").toLowerCase() === activeCategory);

  if (countEl) countEl.textContent = `${list.length} vehicle${list.length === 1 ? "" : "s"}`;

  grid.innerHTML = list.length
    ? list.map(vehicleCard).join("")
    : `<div class="veh-empty">No vehicles in this category right now. <a href="#" data-cat="all">Show all vehicles</a></div>`;

  grid.querySelector('[data-cat="all"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    setCategory("all");
  });
}

function setCategory(cat) {
  activeCategory = cat;
  chips?.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.cat === cat));
  render();
}

function renderChips() {
  if (!chips) return;
  const cats = [...new Set(allVehicles.map((v) => v.category).filter(Boolean))];
  chips.innerHTML =
    `<button type="button" data-cat="all" class="active">All vehicles</button>` +
    cats.map((c) => `<button type="button" data-cat="${escapeHtml(c.toLowerCase())}">${escapeHtml(c)}</button>`).join("");
  chips.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => setCategory(b.dataset.cat)));
}

async function load() {
  try {
    const snap = await getDocs(collection(db, "vehicles"));
    allVehicles = [];
    snap.forEach((d) => {
      const v = d.data();
      if (v.active === false) return;
      allVehicles.push({ id: d.id, ...v });
    });

    const order = { luxury: 0, suv: 1, minibus: 2, standard: 3 };
    allVehicles.sort(
      (a, b) =>
        (order[(a.category || "").toLowerCase()] ?? 9) - (order[(b.category || "").toLowerCase()] ?? 9) ||
        String(a.name).localeCompare(String(b.name))
    );

    renderChips();

    const type = new URLSearchParams(location.search).get("type");
    setCategory(type ? type.toLowerCase() : "all");
  } catch (error) {
    console.error("Load vehicles error:", error);
    grid.innerHTML = `<div class="veh-empty">Our vehicles could not be loaded. Please refresh the page or contact us on WhatsApp.</div>`;
  }
}

load();

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const vehiclesGrid = document.getElementById("vehiclesGrid");
const vehiclePageTitle = document.getElementById("vehiclePageTitle");
const vehicleCategoryLabel = document.getElementById("vehicleCategoryLabel");

const params = new URLSearchParams(window.location.search);
const selectedType = (params.get("type") || "").toLowerCase();

const categoryNames = {
  standard: "Standard Cars",
  suv: "SUV Vehicles",
  minibus: "Minibus Vehicles",
  luxury: "Luxury Vehicles"
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function vehicleMatchesType(vehicle) {
  if (!selectedType) return true;

  const text = `${vehicle.name || ""} ${vehicle.category || ""} ${vehicle.description || ""}`.toLowerCase();

  const keywords = {
    standard: ["standard", "car", "sedan", "vitz", "axio", "fit", "note"],
    suv: ["suv", "4x4", "rav4", "xtrail", "tucson", "sportage", "family"],
    minibus: ["minibus", "mini bus", "van", "h1", "hiace", "serena", "coaster", "bus"],
    luxury: ["luxury", "vip", "premium", "bmw", "mercedes", "audi", "range rover"]
  };

  const words = keywords[selectedType] || [selectedType];

  return words.some((word) => text.includes(word));
}

function getVehiclePrice(vehicle) {
  const price = Number(vehicle.price || 0);
  return price > 0 ? `From Rs ${price.toLocaleString()}` : "Custom Quote";
}

async function loadVehicles() {
  if (!vehiclesGrid) return;

  if (selectedType && categoryNames[selectedType]) {
    vehiclePageTitle.textContent = categoryNames[selectedType];
    vehicleCategoryLabel.textContent = categoryNames[selectedType];
  }

  try {
    const snapshot = await getDocs(collection(db, "vehicles"));

    if (snapshot.empty) {
      vehiclesGrid.innerHTML = `
        <div class="loading-card">
          <h3>No Vehicles Added Yet</h3>
          <p>Add vehicles from the admin dashboard.</p>
        </div>
      `;
      return;
    }

    const vehicles = [];

    snapshot.forEach((docSnap) => {
      const vehicle = docSnap.data();

      if (vehicle.active === false) return;
      if (!vehicleMatchesType(vehicle)) return;

      vehicles.push({
        id: docSnap.id,
        ...vehicle
      });
    });

    if (vehicles.length === 0) {
      vehiclesGrid.innerHTML = `
        <div class="loading-card">
          <h3>No Vehicles Found</h3>
          <p>No vehicles found for this category.</p>
          <a href="vehicles.html" class="btn">View All Vehicles</a>
        </div>
      `;
      return;
    }

    vehiclesGrid.innerHTML = "";

    vehicles.forEach((vehicle) => {
      const card = document.createElement("div");
      card.className = "vehicle-public-card";

      card.innerHTML = `
        ${
          vehicle.imageUrl
            ? `<img src="${escapeHtml(vehicle.imageUrl)}" alt="${escapeHtml(vehicle.name)}">`
            : `<div class="vehicle-public-placeholder">🚘</div>`
        }

        <div class="vehicle-public-info">
          <span>${escapeHtml(vehicle.category || "Vehicle")}</span>
          <h3>${escapeHtml(vehicle.name || "Vehicle")}</h3>

          <p>${escapeHtml(vehicle.description || "Comfortable private vehicle for your Mauritius trip.")}</p>

          <ul>
            ${vehicle.capacity ? `<li>✓ Up to ${escapeHtml(vehicle.capacity)} passengers</li>` : ""}
            <li>✓ Air Conditioning</li>
            <li>✓ Private Transfer</li>
            <li>✓ Professional Driver</li>
          </ul>

          <strong>${getVehiclePrice(vehicle)}</strong>

          <a
            class="btn"
            href="booking.html?vehicle=${encodeURIComponent(vehicle.name || "")}"
          >
            Select Vehicle
          </a>
        </div>
      `;

      vehiclesGrid.appendChild(card);
    });

  } catch (error) {
    console.error("Load vehicles error:", error);

    vehiclesGrid.innerHTML = `
      <div class="loading-card">
        <h3>Could Not Load Vehicles</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

loadVehicles();

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

function vehicleMatchesType(vehicle) {
  if (!selectedType) return true;

  const text =
    `${vehicle.name || ""} ${vehicle.category || ""} ${vehicle.description || ""}`
      .toLowerCase();

  const keywords = {
    standard: ["standard", "car", "sedan", "vitz", "fit", "axio", "note"],
    suv: ["suv", "4x4", "rav4", "xtrail", "tucson", "sportage"],
    minibus: ["minibus", "van", "hiace", "h1", "bus", "coaster"],
    luxury: ["luxury", "vip", "premium", "bmw", "audi", "mercedes", "range rover"]
  };

  return (keywords[selectedType] || []).some(word =>
    text.includes(word)
  );
}

function formatPrice(price) {
  const p = Number(price || 0);

  if (p <= 0) return "Custom Quote";

  return `Rs ${p.toLocaleString()}`;
}

function openRentalModal(vehicle) {
  const modal = document.getElementById("vehicleRentalModal");

  document.getElementById("selectedVehicleName").textContent =
    vehicle.name || "Vehicle";

  document.getElementById("selectedVehicleCategory").textContent =
    vehicle.category || "-";

  document.getElementById("selectedVehiclePrice").textContent =
    formatPrice(vehicle.price);

  modal.classList.add("show");

  window.selectedRentalVehicle = vehicle;
}

function renderVehicleCard(vehicle) {
  const card = document.createElement("div");

  card.className = "vehicle-public-card";

  card.innerHTML = `
    ${
      vehicle.imageUrl
        ? `
        <img
          src="${escapeHtml(vehicle.imageUrl)}"
          alt="${escapeHtml(vehicle.name)}"
        >
      `
        : `
        <div class="vehicle-public-placeholder">
          🚘
        </div>
      `
    }

    <div class="vehicle-public-info">

      <span class="vehicle-category">
        ${escapeHtml(vehicle.category || "Vehicle")}
      </span>

      <h3>
        ${escapeHtml(vehicle.name || "Vehicle")}
      </h3>

      <p>
        ${
          escapeHtml(
            vehicle.description ||
            "Comfortable private vehicle for Mauritius travel."
          )
        }
      </p>

      <ul class="vehicle-features">
        ${
          vehicle.capacity
            ? `<li>✓ Up to ${vehicle.capacity} passengers</li>`
            : ""
        }

        <li>✓ Air Conditioning</li>
        <li>✓ Professional Driver</li>
        <li>✓ Island Wide Service</li>
      </ul>

      <strong class="vehicle-price">
        ${formatPrice(vehicle.price)}
      </strong>

      <div class="vehicle-buttons">

        <button
          class="btn vehicle-rent-btn"
          data-id="${vehicle.id}"
        >
          Rent This Vehicle
        </button>

        <button
          class="btn-outline vehicle-view-btn"
          data-id="${vehicle.id}"
        >
          View Details
        </button>

      </div>

    </div>
  `;

  card.querySelector(".vehicle-rent-btn")
    .addEventListener("click", () => {
      openRentalModal(vehicle);
    });

  card.querySelector(".vehicle-view-btn")
    .addEventListener("click", () => {

      const msg =
`
Vehicle: ${vehicle.name || ""}

Category: ${vehicle.category || ""}

Capacity: ${vehicle.capacity || "-"}

Price: ${formatPrice(vehicle.price)}

${vehicle.description || ""}
`;

      alert(msg);
    });

  return card;
}

async function loadVehicles() {

  if (!vehiclesGrid) return;

  if (selectedType && categoryNames[selectedType]) {
    vehiclePageTitle.textContent =
      categoryNames[selectedType];

    vehicleCategoryLabel.textContent =
      categoryNames[selectedType];
  }

  try {

    const snapshot =
      await getDocs(collection(db, "vehicles"));

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

    if (!vehicles.length) {

      vehiclesGrid.innerHTML = `
        <div class="loading-card">
          <h3>No Vehicles Found</h3>
          <p>No vehicles found in this category.</p>
          <a href="vehicles.html" class="btn">
            View All Vehicles
          </a>
        </div>
      `;

      return;
    }

    vehiclesGrid.innerHTML = "";

    vehicles.forEach(vehicle => {
      vehiclesGrid.appendChild(
        renderVehicleCard(vehicle)
      );
    });

  } catch (error) {

    console.error(error);

    vehiclesGrid.innerHTML = `
      <div class="loading-card">
        <h3>Could Not Load Vehicles</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

const closeBtn =
  document.getElementById("closeVehicleRentalModal");

if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    document
      .getElementById("vehicleRentalModal")
      .classList.remove("show");
  });
}

loadVehicles();

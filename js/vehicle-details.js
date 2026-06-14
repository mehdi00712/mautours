import { firebaseConfig } from "./firebase-config.js";

import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getFirestore,
  doc,
  getDoc
}
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const params = new URLSearchParams(window.location.search);
const vehicleId = params.get("id");

const loading = document.getElementById("vehicleLoading");
const content = document.getElementById("vehicleContent");

const mainImage =
  document.getElementById("mainVehicleImage");

const thumbnailGrid =
  document.getElementById("vehicleThumbnailGrid");

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function formatPrice(price) {

  const p = Number(price || 0);

  if (p <= 0) {
    return "Custom Quote";
  }

  return `Rs ${p.toLocaleString()} / day`;
}

async function loadVehicle() {

  try {

    const snap =
      await getDoc(doc(db,"vehicles",vehicleId));

    if (!snap.exists()) {

      loading.innerHTML = `
        <h3>Vehicle Not Found</h3>
      `;

      return;
    }

    const vehicle = snap.data();

    document.getElementById("vehicleCategory").textContent =
      vehicle.category || "Vehicle";

    document.getElementById("vehicleName").textContent =
      vehicle.name || "Vehicle";

    document.getElementById("vehicleDescription").textContent =
      vehicle.description || "";

    document.getElementById("vehicleCapacity").textContent =
      `${vehicle.capacity || "-"} passengers`;

    document.getElementById("vehiclePrice").textContent =
      formatPrice(vehicle.price);

    const images = [];

    if (vehicle.imageUrl) {
      images.push(vehicle.imageUrl);
    }

    if (Array.isArray(vehicle.vehicleGalleryImages)) {
      images.push(...vehicle.vehicleGalleryImages);
    }

    if (images.length) {

      mainImage.src = images[0];

      thumbnailGrid.innerHTML = "";

      images.forEach((url) => {

        const img =
          document.createElement("img");

        img.src = url;
        img.className =
          "vehicle-thumb";

        img.addEventListener("click", () => {
          mainImage.src = url;
        });

        thumbnailGrid.appendChild(img);
      });
    }

    document
      .getElementById("rentVehicleBtn")
      .addEventListener("click", () => {

        window.location.href =
          `vehicles.html?rent=${vehicleId}`;
      });

    loading.style.display = "none";
    content.style.display = "block";

  } catch (error) {

    console.error(error);

    loading.innerHTML = `
      <h3>Error Loading Vehicle</h3>
      <p>${escapeHtml(error.message)}</p>
    `;
  }
}

loadVehicle();

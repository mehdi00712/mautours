import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const params = new URLSearchParams(window.location.search);
const packageId = params.get("id");

const packageLoading = document.getElementById("packageLoading");
const packageDetailsContent = document.getElementById("packageDetailsContent");

const mainPackageImage = document.getElementById("mainPackageImage");
const packageThumbnailGrid = document.getElementById("packageThumbnailGrid");

const packageCategory = document.getElementById("packageCategory");
const packageTitle = document.getElementById("packageTitle");
const packageDescription = document.getElementById("packageDescription");
const packageDuration = document.getElementById("packageDuration");
const packagePrice = document.getElementById("packagePrice");
const packageIncludes = document.getElementById("packageIncludes");
const packageFullDetails = document.getElementById("packageFullDetails");

const bookPackageBtn = document.getElementById("bookPackageBtn");
const packageWhatsappBtn = document.getElementById("packageWhatsappBtn");
const packageVehiclesGrid = document.getElementById("packageVehiclesGrid");

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPrice(data) {
  const price = Number(data.price || 0);

  if (price <= 0 || data.priceType === "Custom Quote") {
    return "Custom Quote";
  }

  if (data.priceType === "Fixed") {
    return `Rs ${price.toLocaleString()}`;
  }

  return `${data.priceType || "Starting From"} Rs ${price.toLocaleString()}`;
}

function showError(message) {
  if (packageLoading) {
    packageLoading.innerHTML = `
      <h3>Package Not Found</h3>
      <p>${escapeHtml(message)}</p>
      <a href="booking.html" class="btn">Back to Packages</a>
    `;
  }
}

function setMainImage(url) {
  if (!mainPackageImage || !url) return;
  mainPackageImage.src = url;
}

function renderGallery(packageData) {
  if (!packageThumbnailGrid) return;

  const images = [];

  if (packageData.imageUrl) {
    images.push(packageData.imageUrl);
  }

  if (Array.isArray(packageData.galleryImages)) {
    packageData.galleryImages.forEach((url) => {
      if (url && !images.includes(url)) images.push(url);
    });
  }

  if (images.length === 0) {
    setMainImage("assets/ile.jpg");
    packageThumbnailGrid.innerHTML = "";
    return;
  }

  setMainImage(images[0]);
  packageThumbnailGrid.innerHTML = "";

  images.forEach((url, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `package-thumb ${index === 0 ? "active" : ""}`;

    btn.innerHTML = `
      <img src="${escapeHtml(url)}" alt="Package picture ${index + 1}">
    `;

    btn.addEventListener("click", () => {
      setMainImage(url);

      document.querySelectorAll(".package-thumb").forEach((thumb) => {
        thumb.classList.remove("active");
      });

      btn.classList.add("active");
    });

    packageThumbnailGrid.appendChild(btn);
  });
}

function renderIncludes(includes) {
  if (!packageIncludes) return;

  if (!Array.isArray(includes) || includes.length === 0) {
    packageIncludes.innerHTML = `<li>Custom itinerary planning</li>`;
    return;
  }

  packageIncludes.innerHTML = includes
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

async function loadVehicles() {
  if (!packageVehiclesGrid) return;

  try {
    const snapshot = await getDocs(collection(db, "vehicles"));

    const vehicles = [];

    snapshot.forEach((docSnap) => {
      const vehicle = docSnap.data();

      if (vehicle.active === false) return;

      vehicles.push({
        id: docSnap.id,
        ...vehicle
      });
    });

    if (vehicles.length === 0) {
      packageVehiclesGrid.innerHTML = `
        <div class="loading-card">
          <h3>No Vehicles Added Yet</h3>
          <p>Vehicles will appear here once added by admin.</p>
        </div>
      `;
      return;
    }

    packageVehiclesGrid.innerHTML = "";

    vehicles.forEach((vehicle) => {
      const price = Number(vehicle.price || 0);
      const capacity = Number(vehicle.capacity || 0);

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
          <p>${escapeHtml(vehicle.description || "Comfortable private vehicle for your trip.")}</p>

          <ul>
            ${capacity > 0 ? `<li>✓ Up to ${capacity} passengers</li>` : ""}
            <li>✓ Air Conditioning</li>
            <li>✓ Private Transfer</li>
            <li>✓ Professional Driver</li>
          </ul>

          <strong>${price > 0 ? `Rs ${price.toLocaleString()}` : "Custom Quote"}</strong>

          <a class="btn" href="booking.html?package=${encodeURIComponent(packageId)}&vehicle=${encodeURIComponent(vehicle.name || "")}">
            Select Vehicle
          </a>
        </div>
      `;

      packageVehiclesGrid.appendChild(card);
    });

  } catch (error) {
    console.error("Load Vehicles Error:", error);

    packageVehiclesGrid.innerHTML = `
      <div class="loading-card">
        <h3>Could Not Load Vehicles</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

async function loadPackageDetails() {
  if (!packageId) {
    showError("No package ID was provided.");
    return;
  }

  try {
    const snap = await getDoc(doc(db, "trips", packageId));

    if (!snap.exists()) {
      showError("This package does not exist or was removed.");
      return;
    }

    const data = snap.data();

    if (data.active === false) {
      showError("This package is currently unavailable.");
      return;
    }

    document.title = `${data.title || "Package Details"} | Mautour Holidays`;

    if (packageCategory) packageCategory.textContent = data.category || "Package";
    if (packageTitle) packageTitle.textContent = data.title || "Package Details";
    if (packageDescription) packageDescription.textContent = data.description || "";
    if (packageDuration) packageDuration.textContent = data.duration || "-";
    if (packagePrice) packagePrice.textContent = formatPrice(data);

    if (packageFullDetails) {
      packageFullDetails.textContent =
        data.fullDetails ||
        "Full package details will be confirmed by our team according to your travel dates and preferences.";
    }

    renderIncludes(data.includes);
    renderGallery(data);

    if (bookPackageBtn) {
      bookPackageBtn.href = `booking.html?package=${encodeURIComponent(packageId)}`;
    }

    if (packageWhatsappBtn) {
      const message = encodeURIComponent(
        `Hi, I want to know more about this package: ${data.title || "Mauritius Package"} 🇲🇺`
      );

      packageWhatsappBtn.href = `https://wa.me/23059066404?text=${message}`;
    }

    if (packageLoading) packageLoading.style.display = "none";
    if (packageDetailsContent) packageDetailsContent.style.display = "grid";

  } catch (error) {
    console.error("Load Package Details Error:", error);
    showError(error.message || "Could not load package details.");
  }
}

loadPackageDetails();
loadVehicles();

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

let currentUser = null;
let selectedRentalVehicle = null;

const vehiclesGrid = document.getElementById("vehiclesGrid");
const vehiclePageTitle = document.getElementById("vehiclePageTitle");
const vehicleCategoryLabel = document.getElementById("vehicleCategoryLabel");

const modal = document.getElementById("vehicleRentalModal");
const closeBtn = document.getElementById("closeVehicleRentalModal");
const rentalForm = document.getElementById("vehicleRentalForm");

const selectedVehicleName = document.getElementById("selectedVehicleName");
const selectedVehicleCategory = document.getElementById("selectedVehicleCategory");
const selectedVehiclePrice = document.getElementById("selectedVehiclePrice");
const rentalEstimatedTotal = document.getElementById("rentalEstimatedTotal");

const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popupTitle");
const popupMessage = document.getElementById("popupMessage");
const popupBtn = document.getElementById("popupBtn");

const params = new URLSearchParams(window.location.search);
const selectedType = (params.get("type") || "").toLowerCase();

const categoryNames = {
  standard: "Standard Cars",
  suv: "SUV Vehicles",
  minibus: "Minibus Vehicles",
  luxury: "Luxury Vehicles"
};

onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

function showPopup(title, message, redirect = null) {
  if (!popup || !popupTitle || !popupMessage || !popupBtn) {
    alert(`${title}\n\n${message}`);
    if (redirect) window.location.href = redirect;
    return;
  }

  popupTitle.textContent = title;
  popupMessage.textContent = message;
  popup.classList.add("show");

  popupBtn.onclick = () => {
    popup.classList.remove("show");
    if (redirect) window.location.href = redirect;
  };
}

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

  const text = `${vehicle.name || ""} ${vehicle.category || ""} ${vehicle.description || ""}`.toLowerCase();

  const keywords = {
    standard: ["standard", "car", "sedan", "vitz", "fit", "axio", "note"],
    suv: ["suv", "4x4", "rav4", "xtrail", "tucson", "sportage"],
    minibus: ["minibus", "van", "hiace", "h1", "bus", "coaster"],
    luxury: ["luxury", "vip", "premium", "bmw", "audi", "mercedes", "range rover"]
  };

  return (keywords[selectedType] || []).some((word) => text.includes(word));
}

function formatPrice(price) {
  const p = Number(price || 0);
  if (p <= 0) return "Custom Quote";
  return `€ ${p.toLocaleString()}`;
}

function getRentalDays(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;

  const start = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);

  if (end < start) return 0;

  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function updateRentalTotal() {
  if (!selectedRentalVehicle || !rentalEstimatedTotal) return;

  const pickupDate = document.getElementById("rentalPickupDate")?.value || "";
  const returnDate = document.getElementById("rentalReturnDate")?.value || "";
  const rentalDays = getRentalDays(pickupDate, returnDate);
  const dailyPrice = Number(selectedRentalVehicle.price || 0);

  if (rentalDays <= 0 || dailyPrice <= 0) {
    rentalEstimatedTotal.textContent = "Custom Quote";
    return;
  }

  const total = dailyPrice * rentalDays;
  rentalEstimatedTotal.textContent = `€ ${total.toLocaleString()} (${rentalDays} day${rentalDays > 1 ? "s" : ""})`;
}

function openRentalModal(vehicle) {
  if (!currentUser) {
    showPopup(
      "Login Required",
      "Please sign in before renting a vehicle.",
      "login.html?redirect=vehicles.html"
    );
    return;
  }

  selectedRentalVehicle = vehicle;

  if (selectedVehicleName) selectedVehicleName.textContent = vehicle.name || "Vehicle";
  if (selectedVehicleCategory) selectedVehicleCategory.textContent = vehicle.category || "-";
  if (selectedVehiclePrice) selectedVehiclePrice.textContent = `${formatPrice(vehicle.price)} / day`;

  if (modal) {
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  updateRentalTotal();
}

function closeRentalModal() {
  if (modal) modal.classList.remove("show");
  document.body.style.overflow = "";
}

function renderVehicleCard(vehicle) {
  const card = document.createElement("div");
  card.className = "vehicle-public-card";

  card.innerHTML = `
    ${
      vehicle.imageUrl
        ? `<img src="${escapeHtml(vehicle.imageUrl)}" alt="${escapeHtml(vehicle.name || "Vehicle")}">`
        : `<div class="vehicle-public-placeholder">🚘</div>`
    }

    <div class="vehicle-public-info">
      <span class="vehicle-category">${escapeHtml(vehicle.category || "Vehicle")}</span>

      <h3>${escapeHtml(vehicle.name || "Vehicle")}</h3>

      <p>${escapeHtml(vehicle.description || "Comfortable private vehicle for Mauritius travel.")}</p>

      <ul class="vehicle-features">
        ${vehicle.capacity ? `<li>✓ Up to ${escapeHtml(vehicle.capacity)} passengers</li>` : ""}
        <li>✓ Air Conditioning</li>
        <li>✓ Professional Driver</li>
        <li>✓ Island Wide Service</li>
      </ul>

      <strong class="vehicle-price">${formatPrice(vehicle.price)} / day</strong>

      <div class="vehicle-buttons">
        <button class="btn vehicle-rent-btn" type="button">Rent This Vehicle</button>
        <button class="btn-outline vehicle-view-btn" type="button">View Details</button>
      </div>
    </div>
  `;

  card.querySelector(".vehicle-rent-btn").addEventListener("click", () => {
    openRentalModal(vehicle);
  });

  card.querySelector(".vehicle-view-btn").addEventListener("click", () => {
    window.location.href = `vehicle-details.html?id=${encodeURIComponent(vehicle.id)}`;
  });

  return card;
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

    if (!vehicles.length) {
      vehiclesGrid.innerHTML = `
        <div class="loading-card">
          <h3>No Vehicles Found</h3>
          <p>No vehicles found in this category.</p>
          <a href="vehicles.html" class="btn">View All Vehicles</a>
        </div>
      `;
      return;
    }

    vehiclesGrid.innerHTML = "";

    vehicles.forEach((vehicle) => {
      vehiclesGrid.appendChild(renderVehicleCard(vehicle));
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

if (closeBtn) {
  closeBtn.addEventListener("click", closeRentalModal);
}

if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeRentalModal();
  });
}

document.getElementById("rentalPickupDate")?.addEventListener("change", updateRentalTotal);
document.getElementById("rentalReturnDate")?.addEventListener("change", updateRentalTotal);

if (rentalForm) {
  rentalForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showPopup(
        "Login Required",
        "Please sign in before renting a vehicle.",
        "login.html?redirect=vehicles.html"
      );
      return;
    }

    if (!selectedRentalVehicle) {
      showPopup("Vehicle Required", "Please select a vehicle first.");
      return;
    }

    const submitBtn = rentalForm.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const name = document.getElementById("rentalName").value.trim();
    const email = document.getElementById("rentalEmail").value.trim();
    const phone = document.getElementById("rentalPhone").value.trim();
    const passengers = Number(document.getElementById("rentalPassengers").value);
    const pickupDate = document.getElementById("rentalPickupDate").value;
    const returnDate = document.getElementById("rentalReturnDate").value;
    const pickupLocation = document.getElementById("rentalPickupLocation").value.trim();
    const proofFile = document.getElementById("rentalPaymentProof").files[0];

    if (!name || !email || !phone || !passengers || !pickupDate || !returnDate || !pickupLocation || !proofFile) {
      showPopup("Incomplete Form", "Please fill in all fields and upload payment proof.");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    if (passengers < 1) {
      showPopup("Invalid Passengers", "Please enter at least 1 passenger.");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pickup = new Date(`${pickupDate}T00:00:00`);
    const returned = new Date(`${returnDate}T00:00:00`);

    if (pickup < today) {
      showPopup("Invalid Date", "Pickup date cannot be in the past.");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    if (returned < pickup) {
      showPopup("Invalid Date", "Return date cannot be before pickup date.");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    try {
      const rentalDays = getRentalDays(pickupDate, returnDate);
      const dailyPrice = Number(selectedRentalVehicle.price || 0);
      const totalPrice = dailyPrice > 0 ? dailyPrice * rentalDays : 0;

      const bookingRef = doc(collection(db, "bookings"));
      const bookingId = bookingRef.id;

      const safeFileName = proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");

      const storageRef = ref(
        storage,
        `payment_proofs/${currentUser.uid}/${bookingId}_${safeFileName}`
      );

      const uploadResult = await uploadBytes(storageRef, proofFile);
      const paymentProofUrl = await getDownloadURL(uploadResult.ref);

      await setDoc(bookingRef, {
        bookingType: "vehicle_rental",

        userId: currentUser.uid,
        userEmail: currentUser.email || "",

        name,
        email,
        phone,
        passengers,
        people: passengers,

        pickupDate,
        returnDate,
        rentalDays,
        pickupLocation,
        rentalPeriod: `${pickupDate} → ${returnDate}`,

        vehicleId: selectedRentalVehicle.id || "",
        vehicleName: selectedRentalVehicle.name || "",
        vehicleCategory: selectedRentalVehicle.category || "",
        vehiclePrice: dailyPrice,
        vehicleCapacity: Number(selectedRentalVehicle.capacity || 0),
        vehicleImageUrl: selectedRentalVehicle.imageUrl || "",
        vehicleGalleryImages: Array.isArray(selectedRentalVehicle.vehicleGalleryImages)
          ? selectedRentalVehicle.vehicleGalleryImages
          : [],
        vehicleDescription: selectedRentalVehicle.description || "",

        package: "Vehicle Rental Only",

        pricePerDay: dailyPrice,
        totalPrice,

        paymentMethod: "Bank Transfer",
        paymentStatus: "Proof Uploaded",
        paymentProofUrl,

        adminDecision: "Pending",
        bookingStatus: "Awaiting Admin Validation",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      rentalForm.reset();
      selectedRentalVehicle = null;
      closeRentalModal();

      showPopup(
        "Vehicle Rental Submitted ✅",
        "Your vehicle rental request and payment proof have been submitted. Admin will validate your booking.",
        "index.html"
      );

    } catch (error) {
      console.error("Vehicle rental error:", error);
      showPopup("Rental Error", error.message || "Could not submit vehicle rental.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

loadVehicles();

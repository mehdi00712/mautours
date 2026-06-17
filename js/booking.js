import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

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
let selectedTrip = null;
let selectedVehicle = null;
let allVehicles = [];

const dynamicTrips = document.getElementById("dynamicTrips");
const modal = document.getElementById("bookingModal");
const closeModal = document.getElementById("closeModal");
const bookingForm = document.getElementById("bookingForm");
const selectedPackageInput = document.getElementById("selectedPackage");
const vehicleOptionsList = document.getElementById("vehicleOptionsList");
const bookingEstimatedTotal = document.getElementById("bookingEstimatedTotal");
const vehicleSelectionBox = document.getElementById("vehicleSelectionBox");

const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popupTitle");
const popupMessage = document.getElementById("popupMessage");
const popupBtn = document.getElementById("popupBtn");

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

function formatPrice(trip) {
  const price = Number(trip.price || 0);

  if (price <= 0 || trip.priceType === "Custom Quote") return "Custom Quote";
  if (trip.priceType === "Fixed") return `€ ${price.toLocaleString()}`;

  return `${trip.priceType || "Starting From"} € ${price.toLocaleString()}`;
}

function formatIncludes(includes) {
  if (!Array.isArray(includes)) return "";

  return includes
    .filter((item) => String(item || "").trim())
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function getTripTime(trip) {
  if (trip.createdAt && typeof trip.createdAt.toMillis === "function") {
    return trip.createdAt.toMillis();
  }

  if (trip.updatedAt && typeof trip.updatedAt.toMillis === "function") {
    return trip.updatedAt.toMillis();
  }

  return 0;
}

function getDurationDays(durationText) {
  const text = String(durationText || "").toLowerCase();

  if (text.includes("half")) return 1;
  if (text.includes("full")) return 1;

  const match = text.match(/\d+/);
  if (!match) return 1;

  return Math.max(Number(match[0]), 1);
}

function addDaysToDate(dateString, daysToAdd) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split("T")[0];
}

function getBookingDates(startDate, durationText) {
  const totalDays = getDurationDays(durationText);
  const dates = [];

  for (let i = 0; i < totalDays; i++) {
    dates.push(addDaysToDate(startDate, i));
  }

  return dates;
}

function lockBodyScroll() {
  document.body.style.overflow = "hidden";
}

function unlockBodyScroll() {
  document.body.style.overflow = "";
}

function closeBookingModal() {
  if (modal) modal.classList.remove("show");
  unlockBodyScroll();
}

function getPeopleCount() {
  const people = Number(document.getElementById("people")?.value || 1);
  return people > 0 ? people : 1;
}

function packageRequiresVehicle() {
  return selectedTrip?.requiresVehicle === true;
}

function updateEstimatedTotal() {
  if (!bookingEstimatedTotal) return;

  const people = getPeopleCount();
  const basePrice = Number(selectedTrip?.price || 0);

  const vehiclePrice =
    packageRequiresVehicle()
      ? Number(selectedVehicle?.price || 0)
      : 0;

  let total = 0;

  if (basePrice > 0) {
    total += basePrice * people;
  }

  if (vehiclePrice > 0) {
    total += vehiclePrice * people;
  }

  bookingEstimatedTotal.textContent =
    total > 0 ? `€ ${total.toLocaleString()}` : "Custom Quote";
}

function setSelectedVehicle(vehicle, card = null) {
  selectedVehicle = vehicle;

  document.querySelectorAll(".vehicle-option-card").forEach((item) => {
    item.classList.remove("selected");
  });

  if (card) card.classList.add("selected");

  updateEstimatedTotal();
}

function renderVehicleOptions() {
  if (!vehicleOptionsList) return;

  selectedVehicle = null;

  if (!packageRequiresVehicle()) {
    if (vehicleSelectionBox) {
      vehicleSelectionBox.style.display = "none";
    }

    vehicleOptionsList.innerHTML = "";
    updateEstimatedTotal();
    return;
  }

  if (vehicleSelectionBox) {
    vehicleSelectionBox.style.display = "block";
  }

  const visibleVehicles = allVehicles.filter((vehicle) => vehicle.active !== false);

  if (visibleVehicles.length === 0) {
    vehicleOptionsList.innerHTML = `
      <div class="vehicle-empty">
        No vehicles available yet. Please contact us before booking.
      </div>
    `;
    updateEstimatedTotal();
    return;
  }

  vehicleOptionsList.innerHTML = "";

  visibleVehicles.forEach((vehicle, index) => {
    const price = Number(vehicle.price || 0);
    const capacity = Number(vehicle.capacity || 0);

    const card = document.createElement("button");
    card.type = "button";
    card.className = "vehicle-option-card";

    card.innerHTML = `
      ${
        vehicle.imageUrl
          ? `<img src="${escapeHtml(vehicle.imageUrl)}" alt="${escapeHtml(vehicle.name)}">`
          : `<div class="vehicle-placeholder">🚘</div>`
      }

      <div class="vehicle-option-info">
        <strong>${escapeHtml(vehicle.name || "Vehicle")}</strong>
        <span>${escapeHtml(vehicle.category || "Vehicle")}</span>
        ${capacity > 0 ? `<small>${capacity} passengers</small>` : ""}
        ${vehicle.description ? `<small>${escapeHtml(vehicle.description)}</small>` : ""}
        <b>${price > 0 ? `€ ${price.toLocaleString()}` : "Custom Quote"}</b>
      </div>
    `;

    card.addEventListener("click", () => {
      setSelectedVehicle(vehicle, card);
    });

    vehicleOptionsList.appendChild(card);

    if (index === 0) {
      setSelectedVehicle(vehicle, card);
    }
  });
}

async function loadVehicles() {
  try {
    const snapshot = await getDocs(collection(db, "vehicles"));

    allVehicles = [];

    snapshot.forEach((docSnap) => {
      const vehicle = docSnap.data();

      if (vehicle.active === false) return;

      allVehicles.push({
        id: docSnap.id,
        ...vehicle
      });
    });
  } catch (error) {
    console.error("Load Vehicles Error:", error);
    allVehicles = [];
  }
}

async function loadTrips() {
  if (!dynamicTrips) return;

  dynamicTrips.innerHTML = `
    <div class="loading-card">
      <h3>Loading Experiences...</h3>
      <p>Please wait while we load the latest packages.</p>
    </div>
  `;

  try {
    const snapshot = await getDocs(collection(db, "trips"));

    if (snapshot.empty) {
      dynamicTrips.innerHTML = `
        <div class="loading-card">
          <h3>No Packages Available</h3>
          <p>The admin has not added any packages yet.</p>
        </div>
      `;
      return;
    }

    const trips = [];

    snapshot.forEach((docSnap) => {
      const trip = docSnap.data();

      if (trip.active === false) return;

      trips.push({
        id: docSnap.id,
        requiresVehicle: trip.requiresVehicle === true,
        ...trip
      });
    });

    trips.sort((a, b) => getTripTime(b) - getTripTime(a));

    if (trips.length === 0) {
      dynamicTrips.innerHTML = `
        <div class="loading-card">
          <h3>No Active Packages</h3>
          <p>No packages are currently visible to customers.</p>
        </div>
      `;
      return;
    }

    dynamicTrips.innerHTML = "";

    trips.forEach((trip) => {
      const title = escapeHtml(trip.title || "Untitled Package");
      const category = escapeHtml(trip.category || "Package");
      const description = escapeHtml(trip.description || "");
      const duration = escapeHtml(trip.duration || "");
      const imageUrl = escapeHtml(trip.imageUrl || "assets/ile.jpg");
      const includes = formatIncludes(trip.includes);
      const priceText = escapeHtml(formatPrice(trip));
      const galleryCount = Array.isArray(trip.galleryImages) ? trip.galleryImages.length : 0;

      const vehicleBadge = trip.requiresVehicle === true
        ? `<p><strong>Vehicle:</strong> Required</p>`
        : `<p><strong>Vehicle:</strong> Not required</p>`;

      const card = document.createElement("div");
      card.className = "booking-card package-premium";

      card.innerHTML = `
        <img src="${imageUrl}" alt="${title}" loading="lazy">

        <span>${category}</span>
        <h3>${title}</h3>
        <p>${description}</p>

        ${duration ? `<p><strong>Duration:</strong> ${duration}</p>` : ""}
        ${vehicleBadge}
        ${galleryCount > 0 ? `<p><strong>Pictures:</strong> ${galleryCount + 1} photos</p>` : ""}

        ${includes ? `<ul class="package-includes">${includes}</ul>` : ""}

        <strong>${priceText}</strong>

        <div class="package-card-actions">
          <a class="btn" href="package-details.html?id=${trip.id}">
            View Details
          </a>

          <button class="btn-outline book-btn" data-id="${trip.id}">
            Quick Book
          </button>
        </div>
      `;

      dynamicTrips.appendChild(card);

      card.querySelector(".book-btn").addEventListener("click", () => {
        openBookingModal(trip);
      });
    });
  } catch (error) {
    console.error("Load Trips Error:", error);

    dynamicTrips.innerHTML = `
      <div class="loading-card">
        <h3>Could Not Load Packages</h3>
        <p>${escapeHtml(error.message || "Please try again later.")}</p>
      </div>
    `;
  }
}

function openBookingModal(trip) {
  if (!currentUser) {
    showPopup(
      "Login Required",
      "Please sign in before making a booking.",
      "login.html?redirect=booking.html"
    );
    return;
  }

  selectedTrip = {
    requiresVehicle: trip.requiresVehicle === true,
    ...trip
  };

  selectedVehicle = null;

  if (selectedPackageInput) {
    selectedPackageInput.value = trip.title || "";
  }

  renderVehicleOptions();
  updateEstimatedTotal();

  if (modal) {
    modal.classList.add("show");
    lockBodyScroll();
  }
}

const peopleInput = document.getElementById("people");

if (peopleInput) {
  peopleInput.addEventListener("input", updateEstimatedTotal);
}

if (closeModal) {
  closeModal.addEventListener("click", closeBookingModal);
}

if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeBookingModal();
    }
  });
}

if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showPopup("Login Required", "Please sign in first.", "login.html?redirect=booking.html");
      return;
    }

    if (!selectedTrip || !selectedTrip.id) {
      showPopup("No Package Selected", "Please select a package first.");
      return;
    }

    const submitBtn = bookingForm.querySelector("button[type='submit']");
    const originalBtnText = submitBtn.textContent;

    if (packageRequiresVehicle() && !selectedVehicle) {
      showPopup("Vehicle Required", "Please choose a vehicle before submitting your booking.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const people = Number(document.getElementById("people").value);
    const date = document.getElementById("date").value.trim();

    const proofInput = document.getElementById("paymentProof");
    const proofFile = proofInput && proofInput.files ? proofInput.files[0] : null;

    if (!name || !email || !phone || !people || !date || !proofFile) {
      showPopup("Incomplete Form", "Please fill in all fields and upload payment proof.");
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      return;
    }

    if (people < 1) {
      showPopup("Invalid Number", "Please enter at least 1 person.");
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      return;
    }

    const selectedDate = new Date(`${date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      showPopup("Invalid Date", "Please select today or a future date.");
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      return;
    }

    try {
      const bookingDates = getBookingDates(date, selectedTrip.duration);
      const endDate = bookingDates[bookingDates.length - 1] || date;

      const bookingRef = doc(collection(db, "bookings"));
      const bookingId = bookingRef.id;

      const safeFileName = proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");

      const storageRef = ref(
        storage,
        `payment_proofs/${currentUser.uid}/${bookingId}_${safeFileName}`
      );

      const uploadResult = await uploadBytes(storageRef, proofFile);
      const paymentProofUrl = await getDownloadURL(uploadResult.ref);

      const basePrice = Number(selectedTrip.price || 0);

      const vehiclePrice =
        packageRequiresVehicle()
          ? Number(selectedVehicle?.price || 0)
          : 0;

      const pricePerPerson =
        basePrice + vehiclePrice > 0
          ? basePrice + vehiclePrice
          : 0;

      const totalPrice =
        pricePerPerson > 0
          ? pricePerPerson * people
          : 0;

      await setDoc(bookingRef, {
        bookingType: "package_booking",

        userId: currentUser.uid,
        userEmail: currentUser.email || "",

        tripId: selectedTrip.id,
        package: selectedTrip.title || "",
        requiresVehicle: packageRequiresVehicle(),

        name,
        email,
        phone,
        people,

        date,
        startDate: date,
        endDate,
        reservedDates: bookingDates,
        duration: selectedTrip.duration || "",
        durationDays: bookingDates.length,
        bookingPeriod: `${date} → ${endDate}`,

        vehicleId: selectedVehicle?.id || "",
        vehicleName: selectedVehicle?.name || "",
        vehicleCategory: selectedVehicle?.category || "",
        vehiclePrice,
        vehicleCapacity: Number(selectedVehicle?.capacity || 0),
        vehicleImageUrl: selectedVehicle?.imageUrl || "",
        vehicleDescription: selectedVehicle?.description || "",

        basePackagePrice: basePrice,
        pricePerPerson,
        totalPrice,
        priceType: selectedTrip.priceType || "Custom Quote",

        paymentMethod: "Bank Transfer",
        paymentStatus: "Proof Uploaded",
        paymentProofUrl,

        adminDecision: "Pending",
        bookingStatus: "Awaiting Admin Validation",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      closeBookingModal();
      bookingForm.reset();
      selectedTrip = null;
      selectedVehicle = null;

      showPopup(
        "Booking Submitted ✅",
        "Your booking and payment proof have been submitted. Admin will validate your payment and confirm your booking.",
        "index.html"
      );
    } catch (error) {
      console.error("Booking Error:", error);

      showPopup(
        "Booking Error",
        error.message || "There was an error submitting your booking. Please try again."
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && modal.classList.contains("show")) {
    closeBookingModal();
  }
});

async function init() {
  await loadVehicles();
  await loadTrips();
}

init();

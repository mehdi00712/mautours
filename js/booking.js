import { firebaseConfig } from "./firebase-config.js";

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const WHATSAPP_NUMBER = "23059066404";

let selectedTrip = null;
let selectedVehicle = null;
let allVehicles = [];

const dynamicTrips = document.getElementById("dynamicTrips");
const modal = document.getElementById("bookingModal");
const closeModal = document.getElementById("closeModal");
const bookingForm = document.getElementById("bookingForm");
const selectedPackageInput = document.getElementById("selectedPackage");
const vehicleOptionsList = document.getElementById("vehicleOptionsList");
const vehicleSelectionBox = document.getElementById("vehicleSelectionBox");
const selectedQuickVehicleDetails = document.getElementById(
  "selectedQuickVehicleDetails"
);

const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popupTitle");
const popupMessage = document.getElementById("popupMessage");
const popupBtn = document.getElementById("popupBtn");

function injectBookingStyles() {
  if (document.getElementById("bookingWhatsappStyles")) return;

  const style = document.createElement("style");
  style.id = "bookingWhatsappStyles";

  style.textContent = `
    .package-card-quotation {
      display: block;
      margin-top: 14px;
      color: var(--gold, #c9a227);
      font-weight: 900;
      font-size: 1.02rem;
    }

    .whatsapp-enquiry-heading {
      margin-bottom: 22px;
    }

    .whatsapp-enquiry-heading small {
      display: block;
      color: var(--gold, #c9a227);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 7px;
    }

    .whatsapp-enquiry-heading h3 {
      color: var(--darkblue, #071827);
      margin-bottom: 9px;
    }

    .whatsapp-enquiry-heading p {
      color: var(--muted, #6b7280);
      line-height: 1.6;
    }

    .form-field-label {
      display: block;
      margin: 4px 0 -4px;
      color: var(--darkblue, #071827);
      font-size: 0.9rem;
      font-weight: 800;
    }

    #bookingForm textarea {
      width: 100%;
      resize: vertical;
      min-height: 120px;
      font: inherit;
    }

    .activity-options-list {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin-top: 15px;
    }

    .activity-option-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      background: #fff;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .activity-option-card:hover {
      border-color: var(--gold, #c9a227);
      background: #fffdf5;
    }

    .activity-option-card input {
      width: 20px;
      height: 20px;
      flex: 0 0 auto;
      accent-color: var(--gold, #c9a227);
    }

    .activity-option-card span {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .activity-option-card strong {
      color: var(--darkblue, #071827);
    }

    .activity-option-card small {
      color: var(--muted, #6b7280);
    }

    .vehicle-options-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
      margin-top: 16px;
    }

    .vehicle-option-card {
      width: 100%;
      overflow: hidden;
      padding: 0;
      border: 2px solid #e5e7eb;
      border-radius: 18px;
      background: #fff;
      cursor: pointer;
      text-align: left;
      transition: 0.22s ease;
    }

    .vehicle-option-card:hover {
      transform: translateY(-3px);
      border-color: var(--gold, #c9a227);
      box-shadow: 0 12px 28px rgba(7, 24, 39, 0.1);
    }

    .vehicle-option-card.selected {
      border-color: var(--gold, #c9a227);
      background: #fffdf5;
      box-shadow: 0 0 0 4px rgba(201, 162, 39, 0.16);
    }

    .vehicle-option-card img,
    .vehicle-placeholder {
      width: 100%;
      height: 160px;
      object-fit: cover;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sand, #f4efe4);
      font-size: 2.5rem;
    }

    .vehicle-option-info {
      padding: 15px;
    }

    .vehicle-option-info strong {
      display: block;
      color: var(--darkblue, #071827);
      font-size: 1.05rem;
      margin-bottom: 5px;
    }

    .vehicle-option-info span {
      display: block;
      color: var(--gold, #c9a227);
      font-weight: 800;
      margin-bottom: 7px;
    }

    .vehicle-option-info small {
      display: block;
      color: var(--muted, #6b7280);
      line-height: 1.5;
      margin-top: 4px;
    }

    .selected-vehicle-details {
      margin-top: 16px;
      padding: 16px;
      border: 2px solid var(--gold, #c9a227);
      border-radius: 17px;
      background: #fffdf5;
    }

    .selected-vehicle-card {
      display: grid;
      grid-template-columns: 115px 1fr;
      gap: 14px;
      align-items: center;
    }

    .selected-vehicle-card img,
    .selected-vehicle-placeholder {
      width: 115px;
      height: 90px;
      object-fit: cover;
      border-radius: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sand, #f4efe4);
      font-size: 2rem;
    }

    .selected-vehicle-card strong {
      display: block;
      color: var(--darkblue, #071827);
      margin-bottom: 5px;
    }

    .selected-vehicle-card p,
    .selected-vehicle-card small {
      color: var(--muted, #6b7280);
      line-height: 1.5;
      margin: 3px 0;
    }

    .whatsapp-booking-note {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 16px;
      border-left: 4px solid #25d366;
      border-radius: 14px;
      background: #f0fdf4;
      color: #4b5563;
      line-height: 1.55;
    }

    .whatsapp-booking-note strong {
      color: #166534;
    }

    #bookingForm button[type="submit"] {
      width: 100%;
      background: #25d366;
      border-color: #25d366;
    }

    #bookingForm button[type="submit"]:hover {
      background: #1fb85a;
      border-color: #1fb85a;
    }

    @media (max-width: 768px) {
      .vehicle-options-list {
        grid-template-columns: 1fr;
      }

      .vehicle-option-card img,
      .vehicle-placeholder {
        height: 205px;
      }

      .selected-vehicle-card {
        grid-template-columns: 1fr;
      }

      .selected-vehicle-card img,
      .selected-vehicle-placeholder {
        width: 100%;
        height: 205px;
      }
    }
  `;

  document.head.appendChild(style);
}

function showPopup(title, message) {
  if (!popup || !popupTitle || !popupMessage || !popupBtn) {
    alert(`${title}\n\n${message}`);
    return;
  }

  popupTitle.textContent = title;
  popupMessage.textContent = message;
  popup.classList.add("show");

  popupBtn.onclick = () => {
    popup.classList.remove("show");
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

function normalizeBool(value) {
  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  );
}

function formatIncludes(includes) {
  if (!Array.isArray(includes)) return "";

  return includes
    .filter((item) => String(item || "").trim())
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function getTripTime(trip) {
  if (
    trip.createdAt &&
    typeof trip.createdAt.toMillis === "function"
  ) {
    return trip.createdAt.toMillis();
  }

  if (
    trip.updatedAt &&
    typeof trip.updatedAt.toMillis === "function"
  ) {
    return trip.updatedAt.toMillis();
  }

  return 0;
}

function lockBodyScroll() {
  document.body.style.overflow = "hidden";
}

function unlockBodyScroll() {
  document.body.style.overflow = "";
}

function closeBookingModal() {
  if (modal) {
    modal.classList.remove("show");
  }

  unlockBodyScroll();
}

function setMinimumTravelDate() {
  const dateInput = document.getElementById("date");
  if (!dateInput) return;

  const now = new Date();

  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  )
    .toISOString()
    .split("T")[0];

  dateInput.min = localDate;
}

function packageRequiresVehicle() {
  return normalizeBool(selectedTrip?.requiresVehicle);
}

function getSelectedActivities() {
  return Array.from(
    document.querySelectorAll(".quick-activity-checkbox:checked")
  )
    .map((input) => input.dataset.name || "")
    .filter(Boolean);
}

function renderActivityOptions() {
  if (!bookingForm) return;

  const oldBox = document.getElementById("quickActivitiesBox");
  if (oldBox) oldBox.remove();

  const activities = Array.isArray(selectedTrip?.activities)
    ? selectedTrip.activities
    : [];

  const activityNames = activities
    .map((activity) => {
      if (typeof activity === "string") {
        return activity.trim();
      }

      return String(activity?.name || "").trim();
    })
    .filter(Boolean);

  if (activityNames.length === 0) return;

  const box = document.createElement("div");
  box.id = "quickActivitiesBox";
  box.className = "vehicle-selection-box";

  box.innerHTML = `
    <h4>Optional Activities</h4>

    <p>
      Select the activities you are interested in. Availability and details
      will be confirmed on WhatsApp.
    </p>

    <div class="activity-options-list">
      ${activityNames
        .map(
          (name) => `
            <label class="activity-option-card">
              <input
                type="checkbox"
                class="quick-activity-checkbox"
                data-name="${escapeHtml(name)}"
              >

              <span>
                <strong>${escapeHtml(name)}</strong>
                <small>Select if interested</small>
              </span>
            </label>
          `
        )
        .join("")}
    </div>
  `;

  const anchor = document.getElementById(
    "quickActivitiesAnchor"
  );

  if (anchor) {
    anchor.insertAdjacentElement("afterend", box);
  } else if (vehicleSelectionBox) {
    bookingForm.insertBefore(box, vehicleSelectionBox);
  } else {
    bookingForm.appendChild(box);
  }
}

function setSelectedVehicle(vehicle, card = null) {
  selectedVehicle = vehicle;

  document.querySelectorAll(".vehicle-option-card").forEach((item) => {
    item.classList.remove("selected");
  });

  if (card) {
    card.classList.add("selected");
  }

  if (!selectedQuickVehicleDetails) return;

  const capacity = Number(vehicle.capacity || 0);

  selectedQuickVehicleDetails.style.display = "block";
  selectedQuickVehicleDetails.innerHTML = `
    <div class="selected-vehicle-card">
      ${
        vehicle.imageUrl
          ? `
            <img
              src="${escapeHtml(vehicle.imageUrl)}"
              alt="${escapeHtml(vehicle.name || "Vehicle")}"
            >
          `
          : `<div class="selected-vehicle-placeholder">🚘</div>`
      }

      <div>
        <strong>${escapeHtml(vehicle.name || "Vehicle")}</strong>

        <p>${escapeHtml(vehicle.category || "Vehicle")}</p>

        ${
          capacity > 0
            ? `<p>Up to ${capacity} passengers</p>`
            : ""
        }

        ${
          vehicle.description
            ? `<small>${escapeHtml(vehicle.description)}</small>`
            : ""
        }
      </div>
    </div>
  `;
}

function renderVehicleOptions() {
  if (!vehicleOptionsList) return;

  selectedVehicle = null;

  if (selectedQuickVehicleDetails) {
    selectedQuickVehicleDetails.style.display = "none";
    selectedQuickVehicleDetails.innerHTML = "";
  }

  if (!packageRequiresVehicle()) {
    if (vehicleSelectionBox) {
      vehicleSelectionBox.style.display = "none";
    }

    vehicleOptionsList.innerHTML = "";
    return;
  }

  if (vehicleSelectionBox) {
    vehicleSelectionBox.style.display = "block";
  }

  const visibleVehicles = allVehicles.filter(
    (vehicle) => vehicle.active !== false
  );

  if (visibleVehicles.length === 0) {
    vehicleOptionsList.innerHTML = `
      <div class="vehicle-empty">
        No vehicle options are currently listed.
        Please continue on WhatsApp and our team will assist you.
      </div>
    `;

    return;
  }

  vehicleOptionsList.innerHTML = "";

  visibleVehicles.forEach((vehicle) => {
    const capacity = Number(vehicle.capacity || 0);

    const card = document.createElement("button");
    card.type = "button";
    card.className = "vehicle-option-card";

    card.innerHTML = `
      ${
        vehicle.imageUrl
          ? `
            <img
              src="${escapeHtml(vehicle.imageUrl)}"
              alt="${escapeHtml(vehicle.name || "Vehicle")}"
            >
          `
          : `<div class="vehicle-placeholder">🚘</div>`
      }

      <div class="vehicle-option-info">
        <strong>${escapeHtml(vehicle.name || "Vehicle")}</strong>

        <span>${escapeHtml(vehicle.category || "Vehicle")}</span>

        ${
          capacity > 0
            ? `<small>Up to ${capacity} passengers</small>`
            : ""
        }

        ${
          vehicle.description
            ? `<small>${escapeHtml(vehicle.description)}</small>`
            : ""
        }
      </div>
    `;

    card.addEventListener("click", () => {
      setSelectedVehicle(vehicle, card);
    });

    vehicleOptionsList.appendChild(card);
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
          <p>No packages have been added yet.</p>
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
        ...trip,
        requiresVehicle: normalizeBool(trip.requiresVehicle),
        activities: Array.isArray(trip.activities)
          ? trip.activities
          : []
      });
    });

    trips.sort((a, b) => getTripTime(b) - getTripTime(a));

    if (trips.length === 0) {
      dynamicTrips.innerHTML = `
        <div class="loading-card">
          <h3>No Active Packages</h3>
          <p>No packages are currently available.</p>
        </div>
      `;
      return;
    }

    dynamicTrips.innerHTML = "";

    trips.forEach((trip) => {
      const title = escapeHtml(
        trip.title || "Mauritius Holiday Package"
      );
      const category = escapeHtml(
        trip.category || "Package"
      );
      const description = escapeHtml(
        trip.description || ""
      );
      const duration = escapeHtml(
        trip.duration || ""
      );
      const imageUrl = escapeHtml(
        trip.imageUrl || "assets/ile.jpg"
      );
      const includes = formatIncludes(trip.includes);

      const galleryCount = Array.isArray(trip.galleryImages)
        ? trip.galleryImages.filter(Boolean).length
        : 0;

      const activitiesCount = Array.isArray(trip.activities)
        ? trip.activities.filter((activity) => {
            if (typeof activity === "string") {
              return activity.trim() !== "";
            }

            return Boolean(
              String(activity?.name || "").trim()
            );
          }).length
        : 0;

      const vehicleBadge = trip.requiresVehicle
        ? `<p><strong>Vehicle:</strong> Selection available</p>`
        : `<p><strong>Vehicle:</strong> Not required</p>`;

      const activitiesBadge =
        activitiesCount > 0
          ? `
            <p>
              <strong>Optional Activities:</strong>
              ${activitiesCount} available
            </p>
          `
          : "";

      const card = document.createElement("div");
      card.className = "booking-card package-premium";

      card.innerHTML = `
        <img src="${imageUrl}" alt="${title}" loading="lazy">

        <span>${category}</span>
        <h3>${title}</h3>
        <p>${description}</p>

        ${
          duration
            ? `<p><strong>Duration:</strong> ${duration}</p>`
            : ""
        }

        ${vehicleBadge}
        ${activitiesBadge}

        ${
          galleryCount > 0
            ? `
              <p>
                <strong>Pictures:</strong>
                ${galleryCount + 1} photos
              </p>
            `
            : ""
        }

        ${
          includes
            ? `<ul class="package-includes">${includes}</ul>`
            : ""
        }

        <span class="package-card-quotation">
          Personalised quotation on WhatsApp
        </span>

        <div class="package-card-actions">
          <a class="btn" href="package-details.html?id=${trip.id}">
            View Details
          </a>

          <button class="btn-outline book-btn" data-id="${trip.id}">
            Enquire on WhatsApp
          </button>
        </div>
      `;

      dynamicTrips.appendChild(card);

      const enquireButton = card.querySelector(".book-btn");

      if (enquireButton) {
        enquireButton.addEventListener("click", () => {
          openBookingModal(trip);
        });
      }
    });
  } catch (error) {
    console.error("Load Trips Error:", error);

    dynamicTrips.innerHTML = `
      <div class="loading-card">
        <h3>Could Not Load Packages</h3>
        <p>${escapeHtml(
          error.message || "Please try again later."
        )}</p>
      </div>
    `;
  }
}

function openBookingModal(trip) {
  selectedTrip = {
    ...trip,
    requiresVehicle: normalizeBool(trip.requiresVehicle),
    activities: Array.isArray(trip.activities)
      ? trip.activities
      : []
  };

  selectedVehicle = null;

  if (bookingForm) {
    bookingForm.reset();
  }

  setMinimumTravelDate();

  if (selectedPackageInput) {
    selectedPackageInput.value =
      selectedTrip.title || "Mauritius Holiday Package";
  }

  renderActivityOptions();
  renderVehicleOptions();

  if (modal) {
    modal.classList.add("show");
    lockBodyScroll();
  }
}

function buildWhatsAppMessage() {
  const name =
    document.getElementById("name")?.value.trim() || "";
  const email =
    document.getElementById("email")?.value.trim() || "";
  const phone =
    document.getElementById("phone")?.value.trim() || "";
  const people = Number(
    document.getElementById("people")?.value || 0
  );
  const date =
    document.getElementById("date")?.value || "";
  const specialRequests =
    document.getElementById("specialRequests")?.value.trim() || "";

  const activities = getSelectedActivities();

  const activitiesText =
    activities.length > 0
      ? activities.map((activity) => `• ${activity}`).join("\n")
      : "• No optional activities selected";

  const vehicleName =
    selectedVehicle?.name || "To be discussed";
  const vehicleCategory =
    selectedVehicle?.category || "Not specified";

  const requestText =
    specialRequests || "No special requests provided";

  const message = `
Hello Mautour Holidays,

I would like to enquire about and book the following Mauritius holiday package.

*PACKAGE*
${selectedTrip?.title || "Mauritius Holiday Package"}

*DURATION*
${selectedTrip?.duration || "To be confirmed"}

*TRAVEL DETAILS*
Preferred date: ${date}
Number of people: ${people}

*CUSTOMER DETAILS*
Name: ${name}
Email: ${email}
WhatsApp / Phone: ${phone}

*PREFERRED VEHICLE*
${vehicleName}
Category: ${vehicleCategory}

*OPTIONAL ACTIVITIES*
${activitiesText}

*SPECIAL REQUESTS*
${requestText}

Please send me the full details, availability, personalised quotation, payment instructions and booking confirmation.

Thank you.
  `.trim();

  return encodeURIComponent(message);
}

if (closeModal) {
  closeModal.addEventListener("click", closeBookingModal);
}

if (modal) {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeBookingModal();
    }
  });
}

if (bookingForm) {
  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!selectedTrip) {
      showPopup(
        "No Package Selected",
        "Please choose a package first."
      );
      return;
    }

    const name =
      document.getElementById("name")?.value.trim() || "";
    const email =
      document.getElementById("email")?.value.trim() || "";
    const phone =
      document.getElementById("phone")?.value.trim() || "";
    const people = Number(
      document.getElementById("people")?.value || 0
    );
    const date =
      document.getElementById("date")?.value || "";

    if (!name || !email || !phone || !people || !date) {
      showPopup(
        "Missing Information",
        "Please complete your name, email, phone number, number of people and preferred travel date."
      );
      return;
    }

    if (people < 1) {
      showPopup(
        "Invalid Number",
        "Please enter at least one traveller."
      );
      return;
    }

    const selectedDate = new Date(`${date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      showPopup(
        "Invalid Date",
        "Please choose today or a future travel date."
      );
      return;
    }

    const visibleVehicles = allVehicles.filter(
      (vehicle) => vehicle.active !== false
    );

    if (
      packageRequiresVehicle() &&
      visibleVehicles.length > 0 &&
      !selectedVehicle
    ) {
      showPopup(
        "Choose a Vehicle",
        "Please select your preferred vehicle before continuing on WhatsApp."
      );
      return;
    }

    const message = buildWhatsAppMessage();

    const whatsappUrl =
      `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );
  });
}

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    modal &&
    modal.classList.contains("show")
  ) {
    closeBookingModal();
  }
});

async function init() {
  injectBookingStyles();
  setMinimumTravelDate();
  await loadVehicles();
  await loadTrips();
}

init();

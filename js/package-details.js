import { firebaseConfig } from "./firebase-config.js";

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const WHATSAPP_NUMBER = "23052542792";

const params = new URLSearchParams(window.location.search);
const packageId = params.get("id");

let currentPackage = null;
let selectedVehicle = null;
let allVehicles = [];

const packageLoading = document.getElementById("packageLoading");
const packageDetailsContent = document.getElementById("packageDetailsContent");

const mainPackageImage = document.getElementById("mainPackageImage");
const packageThumbnailGrid = document.getElementById("packageThumbnailGrid");
const photoCount = document.getElementById("photoCount");

const packageCategory = document.getElementById("packageCategory");
const packageTitle = document.getElementById("packageTitle");
const packageDescription = document.getElementById("packageDescription");
const packageDuration = document.getElementById("packageDuration");
const packageIncludes = document.getElementById("packageIncludes");
const packageFullDetails = document.getElementById("packageFullDetails");
const breadcrumbPackage = document.getElementById("breadcrumbPackage");

const packageVehicleSection = document.getElementById("packageVehicleSection");
const packageVehicleRequirement = document.getElementById(
  "packageVehicleRequirement"
);
const packageVehiclesGrid = document.getElementById("packageVehiclesGrid");
const selectedVehicleDetails = document.getElementById(
  "selectedVehicleDetails"
);

const packageBookingForm = document.getElementById("packageBookingForm");

const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popupTitle");
const popupMessage = document.getElementById("popupMessage");
const popupBtn = document.getElementById("popupBtn");

function injectPackageStyles() {
  if (document.getElementById("packageWhatsappStyles")) return;

  const style = document.createElement("style");
  style.id = "packageWhatsappStyles";

  style.textContent = `
    .whatsapp-enquiry-heading {
      margin-bottom: 24px;
    }

    .whatsapp-enquiry-heading small {
      display: block;
      color: var(--gold, #c9a227);
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 7px;
    }

    .whatsapp-enquiry-heading h2 {
      color: var(--darkblue, #071827);
      margin-bottom: 10px;
    }

    .whatsapp-enquiry-heading p {
      color: var(--muted, #6b7280);
      line-height: 1.65;
    }

    .form-field-label {
      display: block;
      margin: 4px 0 -4px;
      color: var(--darkblue, #071827);
      font-size: 0.9rem;
      font-weight: 800;
    }

    .package-booking-form textarea {
      width: 100%;
      resize: vertical;
      min-height: 120px;
      font: inherit;
    }

    .vehicle-options-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 15px;
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
      height: 165px;
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

    .vehicle-short-description {
      display: -webkit-box !important;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .selected-vehicle-details {
      margin-top: 17px;
      padding: 17px;
      border: 2px solid var(--gold, #c9a227);
      border-radius: 18px;
      background: #fffdf5;
    }

    .selected-vehicle-details h4 {
      color: var(--darkblue, #071827);
      margin-bottom: 13px;
    }

    .selected-vehicle-card {
      display: grid;
      grid-template-columns: 125px 1fr;
      gap: 15px;
      align-items: center;
    }

    .selected-vehicle-card img,
    .selected-vehicle-placeholder {
      width: 125px;
      height: 95px;
      object-fit: cover;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sand, #f4efe4);
      font-size: 2rem;
    }

    .selected-vehicle-card strong {
      display: block;
      color: var(--darkblue, #071827);
      font-size: 1.1rem;
      margin-bottom: 5px;
    }

    .selected-vehicle-card p,
    .selected-vehicle-card small {
      color: var(--muted, #6b7280);
      line-height: 1.5;
      margin: 3px 0;
    }

    .activity-selection-box {
      margin-top: 18px;
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

    #continueWhatsappBtn {
      background: #25d366;
      border-color: #25d366;
    }

    #continueWhatsappBtn:hover {
      background: #1fb85a;
      border-color: #1fb85a;
    }

    @media (max-width: 768px) {
      .vehicle-options-list {
        grid-template-columns: 1fr;
      }

      .vehicle-option-card img,
      .vehicle-placeholder {
        height: 210px;
      }

      .selected-vehicle-card {
        grid-template-columns: 1fr;
      }

      .selected-vehicle-card img,
      .selected-vehicle-placeholder {
        width: 100%;
        height: 210px;
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

function showError(message) {
  if (!packageLoading) return;

  packageLoading.innerHTML = `
    <h3>Package Not Found</h3>
    <p>${escapeHtml(message)}</p>
    <a href="booking.html" class="btn">Back to Packages</a>
  `;
}

function setMinimumTravelDate() {
  const dateInput = document.getElementById("date");
  if (!dateInput) return;

  const today = new Date();
  const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  )
    .toISOString()
    .split("T")[0];

  dateInput.min = localDate;
}

function renderGallery(packageData) {
  const images = [];

  if (packageData.imageUrl) {
    images.push(packageData.imageUrl);
  }

  if (Array.isArray(packageData.galleryImages)) {
    packageData.galleryImages.forEach((url) => {
      if (url && !images.includes(url)) {
        images.push(url);
      }
    });
  }

  if (images.length === 0) {
    images.push("assets/ile.jpg");
  }

  if (photoCount) {
    photoCount.textContent = images.length;
  }

  if (mainPackageImage) {
    mainPackageImage.src = images[0];
    mainPackageImage.alt =
      packageData.title || "Mauritius tour package";
  }

  if (!packageThumbnailGrid) return;

  packageThumbnailGrid.innerHTML = "";

  images.forEach((url, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `package-thumb ${index === 0 ? "active" : ""}`;

    button.innerHTML = `
      <img
        src="${escapeHtml(url)}"
        alt="${escapeHtml(
          `${packageData.title || "Package"} photo ${index + 1}`
        )}"
      >
    `;

    button.addEventListener("click", () => {
      if (mainPackageImage) {
        mainPackageImage.src = url;
      }

      document.querySelectorAll(".package-thumb").forEach((thumb) => {
        thumb.classList.remove("active");
      });

      button.classList.add("active");
    });

    packageThumbnailGrid.appendChild(button);
  });
}

function renderIncludes(includes) {
  if (!packageIncludes) return;

  if (!Array.isArray(includes) || includes.length === 0) {
    packageIncludes.innerHTML = `
      <li>Personalised itinerary planning</li>
      <li>Support from the Mautour Holidays team</li>
      <li>Booking assistance through WhatsApp</li>
    `;
    return;
  }

  packageIncludes.innerHTML = includes
    .filter(Boolean)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function getSelectedActivities() {
  return Array.from(
    document.querySelectorAll(".activity-checkbox:checked")
  )
    .map((input) => input.dataset.name || "")
    .filter(Boolean);
}

function renderActivities(activities) {
  if (!packageBookingForm) return;

  const oldBox = document.getElementById("packageActivitiesBox");
  if (oldBox) oldBox.remove();

  if (!Array.isArray(activities) || activities.length === 0) {
    return;
  }

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
  box.id = "packageActivitiesBox";
  box.className = "vehicle-selection-box activity-selection-box";

  box.innerHTML = `
    <h4>Optional Activities</h4>

    <p>
      Select the activities you are interested in. Our team will provide
      availability, details and a personalised quotation on WhatsApp.
    </p>

    <div class="activity-options-list">
      ${activityNames
        .map(
          (name) => `
            <label class="activity-option-card">
              <input
                type="checkbox"
                class="activity-checkbox"
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

  const anchor = document.getElementById("packageActivitiesAnchor");
  const vehicleSection = document.getElementById(
    "packageVehicleSection"
  );

  if (anchor) {
    anchor.insertAdjacentElement("afterend", box);
  } else if (vehicleSection) {
    packageBookingForm.insertBefore(box, vehicleSection);
  } else {
    packageBookingForm.appendChild(box);
  }
}

function selectVehicle(vehicle, card) {
  selectedVehicle = vehicle;

  document.querySelectorAll(".vehicle-option-card").forEach((item) => {
    item.classList.remove("selected");
  });

  card.classList.add("selected");

  if (!selectedVehicleDetails) return;

  const capacity = Number(vehicle.capacity || 0);

  selectedVehicleDetails.style.display = "block";
  selectedVehicleDetails.innerHTML = `
    <h4>Selected Vehicle</h4>

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

async function loadVehicles() {
  if (!packageVehiclesGrid || !currentPackage) return;

  if (!currentPackage.requiresVehicle) {
    selectedVehicle = null;

    if (packageVehicleSection) {
      packageVehicleSection.style.display = "none";
    }

    if (packageVehicleRequirement) {
      packageVehicleRequirement.textContent = "Not required";
    }

    return;
  }

  if (packageVehicleSection) {
    packageVehicleSection.style.display = "block";
  }

  if (packageVehicleRequirement) {
    packageVehicleRequirement.textContent = "Selection available";
  }

  packageVehiclesGrid.innerHTML = `
    <div class="vehicle-empty">Loading vehicles...</div>
  `;

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

    if (allVehicles.length === 0) {
      selectedVehicle = null;

      packageVehiclesGrid.innerHTML = `
        <div class="vehicle-empty">
          No vehicle options are currently listed.
          Please ask our team on WhatsApp.
        </div>
      `;

      if (selectedVehicleDetails) {
        selectedVehicleDetails.style.display = "none";
      }

      return;
    }

    packageVehiclesGrid.innerHTML = "";

    allVehicles.forEach((vehicle) => {
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
              ? `
                <small class="vehicle-short-description">
                  ${escapeHtml(vehicle.description)}
                </small>
              `
              : ""
          }
        </div>
      `;

      card.addEventListener("click", () => {
        selectVehicle(vehicle, card);
      });

      packageVehiclesGrid.appendChild(card);
    });
  } catch (error) {
    console.error("Load Vehicles Error:", error);

    selectedVehicle = null;

    packageVehiclesGrid.innerHTML = `
      <div class="vehicle-empty">
        We could not load the vehicle options.
        Please continue on WhatsApp and our team will assist you.
      </div>
    `;

    if (selectedVehicleDetails) {
      selectedVehicleDetails.style.display = "none";
    }
  }
}

async function loadPackageDetails() {
  if (!packageId) {
    showError("No package ID was provided.");
    return;
  }

  try {
    const snapshot = await getDoc(doc(db, "trips", packageId));

    if (!snapshot.exists()) {
      showError("This package does not exist or has been removed.");
      return;
    }

    const data = snapshot.data();

    if (data.active === false) {
      showError("This package is currently unavailable.");
      return;
    }

    currentPackage = {
      id: snapshot.id,
      ...data,
      requiresVehicle: normalizeBool(data.requiresVehicle),
      activities: Array.isArray(data.activities)
        ? data.activities
        : []
    };

    document.title = `${
      data.title || "Package Details"
    } | Mautour Holidays`;

    if (breadcrumbPackage) {
      breadcrumbPackage.textContent = data.title || "Package";
    }

    if (packageCategory) {
      packageCategory.textContent = data.category || "Package";
    }

    if (packageTitle) {
      packageTitle.textContent = data.title || "Package Details";
    }

    if (packageDescription) {
      packageDescription.textContent = data.description || "";
    }

    if (packageDuration) {
      packageDuration.textContent =
        data.duration || "To be confirmed";
    }

    if (packageVehicleRequirement) {
      packageVehicleRequirement.textContent =
        currentPackage.requiresVehicle
          ? "Selection available"
          : "Not required";
    }

    if (packageFullDetails) {
      packageFullDetails.textContent =
        data.fullDetails ||
        "Full itinerary details will be confirmed by our team according to your dates, preferences and group requirements.";
    }

    renderIncludes(data.includes);
    renderGallery(data);
    renderActivities(currentPackage.activities);

    if (packageLoading) {
      packageLoading.style.display = "none";
    }

    if (packageDetailsContent) {
      packageDetailsContent.style.display = "grid";
    }

    await loadVehicles();
  } catch (error) {
    console.error("Load Package Details Error:", error);

    showError(
      error.message || "Could not load the package details."
    );
  }
}

function buildWhatsAppMessage() {
  const name = document.getElementById("name")?.value.trim() || "";
  const email = document.getElementById("email")?.value.trim() || "";
  const phone = document.getElementById("phone")?.value.trim() || "";
  const people = Number(
    document.getElementById("people")?.value || 0
  );
  const date = document.getElementById("date")?.value || "";
  const specialRequests =
    document.getElementById("specialRequests")?.value.trim() || "";

  const selectedActivities = getSelectedActivities();

  const vehicleName = selectedVehicle?.name || "To be discussed";
  const vehicleCategory =
    selectedVehicle?.category || "Not specified";

  const activityList =
    selectedActivities.length > 0
      ? selectedActivities.map((item) => `• ${item}`).join("\n")
      : "• No optional activities selected";

  const specialRequestText =
    specialRequests || "No special requests provided";

  const message = `
Hello Mautour Holidays,

I would like to enquire about and book the following holiday package.

*PACKAGE*
${currentPackage?.title || "Mauritius Holiday Package"}

*DURATION*
${currentPackage?.duration || "To be confirmed"}

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
${activityList}

*SPECIAL REQUESTS*
${specialRequestText}

Please send me the full details, availability, personalised quotation, payment instructions and booking confirmation.

Thank you.
  `.trim();

  return encodeURIComponent(message);
}

if (packageBookingForm) {
  packageBookingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!currentPackage) {
      showPopup(
        "Package Not Ready",
        "Please wait for the package details to finish loading."
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

    if (
      currentPackage.requiresVehicle &&
      allVehicles.length > 0 &&
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

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  });
}

async function init() {
  injectPackageStyles();
  setMinimumTravelDate();
  await loadPackageDetails();
}

init();

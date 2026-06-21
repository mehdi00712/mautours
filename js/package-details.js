import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
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

const params = new URLSearchParams(window.location.search);
const packageId = params.get("id");

let currentUser = null;
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
const packagePrice = document.getElementById("packagePrice");
const sidePackagePrice = document.getElementById("sidePackagePrice");
const packageIncludes = document.getElementById("packageIncludes");
const packageFullDetails = document.getElementById("packageFullDetails");
const breadcrumbPackage = document.getElementById("breadcrumbPackage");

const packageVehiclesGrid = document.getElementById("packageVehiclesGrid");
const packageWhatsappBtn = document.getElementById("packageWhatsappBtn");
const packageBookingForm = document.getElementById("packageBookingForm");
const bookingEstimatedTotal = document.getElementById("bookingEstimatedTotal");

const packageVehicleSection = document.getElementById("packageVehicleSection");
const packageVehicleRequirement = document.getElementById("packageVehicleRequirement");

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

function formatMoney(value) {
  const amount = Number(value || 0);
  return amount > 0 ? `€ ${amount.toLocaleString()}` : "Custom Quote";
}

function formatPrice(data) {
  const price = Number(data.price || 0);

  if (price <= 0 || data.priceType === "Custom Quote") return "Custom Quote";
  if (data.priceType === "Fixed") return `€ ${price.toLocaleString()}`;

  return `${data.priceType || "Starting From"} € ${price.toLocaleString()}`;
}

function getDurationDays(durationText) {
  if (!durationText) return 1;

  const text = String(durationText).toLowerCase();

  if (text.includes("half")) return 1;
  if (text.includes("full")) return 1;

  const match = text.match(/(\d+)/);
  if (!match) return 1;

  return Math.max(Number(match[1]), 1);
}

function calculateEndDate(startDate, durationDays) {
  const date = new Date(`${startDate}T00:00:00`);
  date.setDate(date.getDate() + durationDays - 1);
  return date.toISOString().split("T")[0];
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

function getSelectedActivities() {
  const checked = document.querySelectorAll(".activity-checkbox:checked");

  return Array.from(checked).map((input) => ({
    name: input.dataset.name || "",
    price: Number(input.dataset.price || 0)
  }));
}

function getSelectedActivitiesTotal() {
  return getSelectedActivities().reduce((sum, activity) => {
    return sum + Number(activity.price || 0);
  }, 0);
}

function updateEstimatedTotal() {
  const people = Number(document.getElementById("people")?.value || 1);
  const safePeople = people > 0 ? people : 1;

  const basePrice = Number(currentPackage?.price || 0);

  const vehiclePrice =
    currentPackage?.requiresVehicle === true
      ? Number(selectedVehicle?.price || 0)
      : 0;

  const activitiesTotal = getSelectedActivitiesTotal();

  let totalPerPerson = 0;

  if (basePrice > 0) totalPerPerson += basePrice;
  if (vehiclePrice > 0) totalPerPerson += vehiclePrice;
  if (activitiesTotal > 0) totalPerPerson += activitiesTotal;

  const total = totalPerPerson > 0 ? totalPerPerson * safePeople : 0;
  const totalText = total > 0 ? `€ ${total.toLocaleString()}` : "Custom Quote";

  if (bookingEstimatedTotal) bookingEstimatedTotal.textContent = totalText;
  if (sidePackagePrice) sidePackagePrice.textContent = totalText;
}

function renderGallery(packageData) {
  const images = [];

  if (packageData.imageUrl) images.push(packageData.imageUrl);

  if (Array.isArray(packageData.galleryImages)) {
    packageData.galleryImages.forEach((url) => {
      if (url && !images.includes(url)) images.push(url);
    });
  }

  if (images.length === 0) images.push("assets/ile.jpg");

  if (photoCount) photoCount.textContent = images.length;
  if (mainPackageImage) mainPackageImage.src = images[0];

  if (!packageThumbnailGrid) return;

  packageThumbnailGrid.innerHTML = "";

  images.forEach((url, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `package-thumb ${index === 0 ? "active" : ""}`;

    btn.innerHTML = `<img src="${escapeHtml(url)}" alt="Package photo ${index + 1}">`;

    btn.addEventListener("click", () => {
      mainPackageImage.src = url;

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

function renderActivities(activities) {
  if (!packageBookingForm) return;

  const oldBox = document.getElementById("packageActivitiesBox");
  if (oldBox) oldBox.remove();

  if (!Array.isArray(activities) || activities.length === 0) {
    updateEstimatedTotal();
    return;
  }

  const box = document.createElement("div");
  box.id = "packageActivitiesBox";
  box.className = "vehicle-selection-box";

  box.innerHTML = `
    <h4>Choose Activities</h4>
    <p>Select only the activities you want. The total price will update automatically.</p>

    <div class="activity-options-list">
      ${activities
        .filter((activity) => activity && activity.name)
        .map((activity, index) => {
          const name = activity.name || "";
          const price = Number(activity.price || 0);

          return `
            <label class="activity-option-card">
              <input
                type="checkbox"
                class="activity-checkbox"
                data-name="${escapeHtml(name)}"
                data-price="${price}"
              />
              <span>
                <strong>${escapeHtml(name)}</strong>
                <small>${price > 0 ? `+ € ${price.toLocaleString()} per person` : "Included / Free"}</small>
              </span>
            </label>
          `;
        })
        .join("")}
    </div>
  `;

  const vehicleSection = document.getElementById("packageVehicleSection");
  const totalBox = packageBookingForm.querySelector(".booking-total-box");

  if (vehicleSection) {
    packageBookingForm.insertBefore(box, vehicleSection);
  } else if (totalBox) {
    packageBookingForm.insertBefore(box, totalBox);
  } else {
    packageBookingForm.appendChild(box);
  }

  document.querySelectorAll(".activity-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", updateEstimatedTotal);
  });

  updateEstimatedTotal();
}

function selectVehicle(vehicle, card) {
  selectedVehicle = vehicle;

  document.querySelectorAll(".vehicle-option-card").forEach((item) => {
    item.classList.remove("selected");
  });

  card.classList.add("selected");
  updateEstimatedTotal();
}

async function loadVehicles() {
  if (!packageVehiclesGrid) return;

  if (currentPackage?.requiresVehicle !== true) {
    selectedVehicle = null;

    if (packageVehicleSection) {
      packageVehicleSection.style.display = "none";
    }

    if (packageVehicleRequirement) {
      packageVehicleRequirement.textContent = "Not required";
    }

    packageVehiclesGrid.innerHTML = `
      <div class="vehicle-empty">
        No vehicle selection is required for this package.
      </div>
    `;

    updateEstimatedTotal();
    return;
  }

  if (packageVehicleSection) {
    packageVehicleSection.style.display = "block";
  }

  if (packageVehicleRequirement) {
    packageVehicleRequirement.textContent = "Required";
  }

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
      packageVehiclesGrid.innerHTML = `
        <div class="vehicle-empty">
          No vehicles available yet. Please contact us before booking.
        </div>
      `;

      updateEstimatedTotal();
      return;
    }

    packageVehiclesGrid.innerHTML = "";

    allVehicles.forEach((vehicle, index) => {
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
        selectVehicle(vehicle, card);
      });

      packageVehiclesGrid.appendChild(card);

      if (index === 0) {
        selectVehicle(vehicle, card);
      }
    });
  } catch (error) {
    console.error("Load Vehicles Error:", error);

    packageVehiclesGrid.innerHTML = `
      <div class="vehicle-empty">Could not load vehicles.</div>
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

    currentPackage = {
      id: snap.id,
      requiresVehicle: data.requiresVehicle === true,
      activities: Array.isArray(data.activities) ? data.activities : [],
      ...data
    };

    document.title = `${data.title || "Package Details"} | Mautour Holidays`;

    if (breadcrumbPackage) breadcrumbPackage.textContent = data.title || "Package";
    if (packageCategory) packageCategory.textContent = data.category || "Package";
    if (packageTitle) packageTitle.textContent = data.title || "Package Details";
    if (packageDescription) packageDescription.textContent = data.description || "";
    if (packageDuration) packageDuration.textContent = data.duration || "-";
    if (packagePrice) packagePrice.textContent = formatPrice(data);
    if (sidePackagePrice) sidePackagePrice.textContent = formatPrice(data);

    if (packageFullDetails) {
      packageFullDetails.textContent =
        data.fullDetails ||
        "Full package details will be confirmed by our team according to your travel dates and preferences.";
    }

    if (packageVehicleRequirement) {
      packageVehicleRequirement.textContent =
        data.requiresVehicle === true ? "Required" : "Not required";
    }

    renderIncludes(data.includes);
    renderGallery(data);
    renderActivities(data.activities);

    if (packageWhatsappBtn) {
      const message = encodeURIComponent(
        `Hi, I want to know more about this package: ${data.title || "Mauritius Package"} 🇲🇺`
      );

      packageWhatsappBtn.href = `https://wa.me/23059066404?text=${message}`;
    }

    if (packageLoading) packageLoading.style.display = "none";
    if (packageDetailsContent) packageDetailsContent.style.display = "grid";

    updateEstimatedTotal();
  } catch (error) {
    console.error("Load Package Details Error:", error);
    showError(error.message || "Could not load package details.");
  }
}

document.getElementById("people")?.addEventListener("input", updateEstimatedTotal);

if (packageBookingForm) {
  packageBookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showPopup(
        "Login Required",
        "Please sign in before making a booking.",
        `login.html?redirect=package-details.html?id=${packageId}`
      );
      return;
    }

    if (!currentPackage) {
      showPopup("Package Error", "Package details are not loaded yet.");
      return;
    }

    const submitBtn = packageBookingForm.querySelector("button[type='submit']");
    const originalBtnText = submitBtn.textContent;

    if (currentPackage.requiresVehicle === true && !selectedVehicle) {
      showPopup("Vehicle Required", "Please choose a vehicle before booking.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const people = Number(document.getElementById("people").value);
    const startDate = document.getElementById("date").value.trim();
    const proofFile = document.getElementById("paymentProof").files[0];

    if (!name || !email || !phone || !people || !startDate || !proofFile) {
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

    const selectedDate = new Date(`${startDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      showPopup("Invalid Date", "Please select today or a future date.");
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      return;
    }

    try {
      const durationDays = getDurationDays(currentPackage.duration);
      const endDate = calculateEndDate(startDate, durationDays);

      const bookingRef = doc(collection(db, "bookings"));
      const bookingId = bookingRef.id;

      const safeFileName = proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");

      const storageRef = ref(
        storage,
        `payment_proofs/${currentUser.uid}/${bookingId}_${safeFileName}`
      );

      const uploadResult = await uploadBytes(storageRef, proofFile);
      const paymentProofUrl = await getDownloadURL(uploadResult.ref);

      const basePrice = Number(currentPackage.price || 0);

      const vehiclePrice =
        currentPackage.requiresVehicle === true
          ? Number(selectedVehicle?.price || 0)
          : 0;

      const selectedActivities = getSelectedActivities();
      const activitiesTotal = getSelectedActivitiesTotal();

      const pricePerPerson =
        basePrice + vehiclePrice + activitiesTotal > 0
          ? basePrice + vehiclePrice + activitiesTotal
          : 0;

      const totalPrice =
        pricePerPerson > 0
          ? pricePerPerson * people
          : 0;

      await setDoc(bookingRef, {
        bookingType: "package_booking",

        userId: currentUser.uid,
        userEmail: currentUser.email || "",

        tripId: currentPackage.id,
        package: currentPackage.title || "",
        requiresVehicle: currentPackage.requiresVehicle === true,

        name,
        email,
        phone,
        people,

        date: startDate,
        startDate,
        endDate,
        duration: currentPackage.duration || "",
        durationDays,
        bookingPeriod: `${startDate} → ${endDate}`,

        vehicleId: selectedVehicle?.id || "",
        vehicleName: selectedVehicle?.name || "",
        vehicleCategory: selectedVehicle?.category || "",
        vehiclePrice,
        vehicleCapacity: Number(selectedVehicle?.capacity || 0),
        vehicleImageUrl: selectedVehicle?.imageUrl || "",

        selectedActivities,
        activitiesTotal,

        basePackagePrice: basePrice,
        pricePerPerson,
        totalPrice,
        priceType: currentPackage.priceType || "Custom Quote",

        paymentMethod: "Bank Transfer",
        paymentStatus: "Proof Uploaded",
        paymentProofUrl,

        adminDecision: "Pending",
        bookingStatus: "Awaiting Admin Validation",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      packageBookingForm.reset();
      selectedVehicle = null;

      showPopup(
        "Booking Submitted ✅",
        "Your booking and payment proof have been submitted. Admin will validate your booking.",
        "index.html"
      );
    } catch (error) {
      console.error("Booking Error:", error);
      showPopup("Booking Error", error.message || "There was an error submitting your booking.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
}

async function init() {
  await loadPackageDetails();
  await loadVehicles();
}

init();

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
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

const params = new URLSearchParams(window.location.search);
const vehicleId = params.get("id");

let currentUser = null;
let currentVehicle = null;

const loading = document.getElementById("vehicleLoading");
const content = document.getElementById("vehicleContent");

const breadcrumbVehicle = document.getElementById("breadcrumbVehicle");
const mainImage = document.getElementById("mainVehicleImage");
const thumbnailGrid = document.getElementById("vehicleThumbnailGrid");
const vehiclePhotoCount = document.getElementById("vehiclePhotoCount");

const vehicleCategory = document.getElementById("vehicleCategory");
const vehicleName = document.getElementById("vehicleName");
const vehicleDescription = document.getElementById("vehicleDescription");
const vehicleCapacity = document.getElementById("vehicleCapacity");
const vehiclePrice = document.getElementById("vehiclePrice");

const rentVehicleBtn = document.getElementById("rentVehicleBtn");
const vehicleWhatsappBtn = document.getElementById("vehicleWhatsappBtn");

const rentalForm = document.getElementById("vehicleDetailsRentalForm");
const rentalEstimatedTotal = document.getElementById("rentalEstimatedTotal");

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

    if (redirect) {
      window.location.href = redirect;
    }
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

function formatPrice(price) {
  const p = Number(price || 0);

  if (p <= 0) {
    return "Custom Quote";
  }

  return `Rs ${p.toLocaleString()} / day`;
}

function getRentalDays(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;

  const start = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);

  if (end < start) return 0;

  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function updateRentalTotal() {
  if (!currentVehicle || !rentalEstimatedTotal) return;

  const pickupDate = document.getElementById("rentalPickupDate")?.value || "";
  const returnDate = document.getElementById("rentalReturnDate")?.value || "";

  const rentalDays = getRentalDays(pickupDate, returnDate);
  const dailyPrice = Number(currentVehicle.price || 0);

  if (rentalDays <= 0 || dailyPrice <= 0) {
    rentalEstimatedTotal.textContent = "Custom Quote";
    return;
  }

  const total = rentalDays * dailyPrice;

  rentalEstimatedTotal.textContent =
    `Rs ${total.toLocaleString()} (${rentalDays} day${rentalDays > 1 ? "s" : ""})`;
}

function showError(message) {
  if (!loading) return;

  loading.innerHTML = `
    <h3>Vehicle Not Found</h3>
    <p>${escapeHtml(message)}</p>
    <a href="vehicles.html" class="btn">Back to Vehicles</a>
  `;
}

function renderVehicleGallery(vehicle) {
  const images = [];

  if (vehicle.imageUrl) {
    images.push(vehicle.imageUrl);
  }

  if (Array.isArray(vehicle.vehicleGalleryImages)) {
    vehicle.vehicleGalleryImages.forEach((url) => {
      if (url && !images.includes(url)) {
        images.push(url);
      }
    });
  }

  if (images.length === 0) {
    images.push("assets/ile.jpg");
  }

  if (mainImage) {
    mainImage.src = images[0];
  }

  if (vehiclePhotoCount) {
    vehiclePhotoCount.textContent = images.length;
  }

  if (!thumbnailGrid) return;

  thumbnailGrid.innerHTML = "";

  images.forEach((url, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `vehicle-thumb-btn ${index === 0 ? "active" : ""}`;

    btn.innerHTML = `
      <img
        src="${escapeHtml(url)}"
        alt="Vehicle photo ${index + 1}"
      />
    `;

    btn.addEventListener("click", () => {
      if (mainImage) {
        mainImage.src = url;
      }

      document.querySelectorAll(".vehicle-thumb-btn").forEach((item) => {
        item.classList.remove("active");
      });

      btn.classList.add("active");
    });

    thumbnailGrid.appendChild(btn);
  });
}

function fillVehicleDetails(vehicle) {
  document.title = `${vehicle.name || "Vehicle Details"} | Mautour Holidays`;

  if (breadcrumbVehicle) breadcrumbVehicle.textContent = vehicle.name || "Vehicle";
  if (vehicleCategory) vehicleCategory.textContent = vehicle.category || "Vehicle";
  if (vehicleName) vehicleName.textContent = vehicle.name || "Vehicle";
  if (vehicleDescription) {
    vehicleDescription.textContent =
      vehicle.description || "Comfortable private vehicle for your Mauritius trip.";
  }

  if (vehicleCapacity) {
    vehicleCapacity.textContent = vehicle.capacity
      ? `${vehicle.capacity} passengers`
      : "-";
  }

  if (vehiclePrice) {
    vehiclePrice.textContent = formatPrice(vehicle.price);
  }

  if (vehicleWhatsappBtn) {
    const msg = encodeURIComponent(
      `Hi, I want to know more about renting this vehicle: ${vehicle.name || "Vehicle"} in Mauritius 🇲🇺`
    );

    vehicleWhatsappBtn.href = `https://wa.me/23059066404?text=${msg}`;
  }

  renderVehicleGallery(vehicle);
  updateRentalTotal();
}

async function loadVehicle() {
  if (!vehicleId) {
    showError("No vehicle ID was provided.");
    return;
  }

  try {
    const snap = await getDoc(doc(db, "vehicles", vehicleId));

    if (!snap.exists()) {
      showError("This vehicle does not exist or was removed.");
      return;
    }

    const vehicle = snap.data();

    if (vehicle.active === false) {
      showError("This vehicle is currently unavailable.");
      return;
    }

    currentVehicle = {
      id: snap.id,
      ...vehicle
    };

    fillVehicleDetails(currentVehicle);

    if (loading) loading.style.display = "none";
    if (content) content.style.display = "block";
  } catch (error) {
    console.error("Load Vehicle Error:", error);
    showError(error.message || "Could not load vehicle details.");
  }
}

if (rentVehicleBtn) {
  rentVehicleBtn.addEventListener("click", () => {
    document
      .querySelector(".vehicle-rental-card")
      ?.scrollIntoView({ behavior: "smooth" });
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
        "Please sign in before renting this vehicle.",
        `login.html?redirect=vehicle-details.html?id=${vehicleId}`
      );
      return;
    }

    if (!currentVehicle) {
      showPopup("Vehicle Error", "Vehicle details are not loaded yet.");
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
      const dailyPrice = Number(currentVehicle.price || 0);
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

        vehicleId: currentVehicle.id || "",
        vehicleName: currentVehicle.name || "",
        vehicleCategory: currentVehicle.category || "",
        vehiclePrice: dailyPrice,
        vehicleCapacity: Number(currentVehicle.capacity || 0),
        vehicleImageUrl: currentVehicle.imageUrl || "",
        vehicleGalleryImages: Array.isArray(currentVehicle.vehicleGalleryImages)
          ? currentVehicle.vehicleGalleryImages
          : [],
        vehicleDescription: currentVehicle.description || "",

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

      showPopup(
        "Vehicle Rental Submitted ✅",
        "Your vehicle rental request and payment proof have been submitted. Admin will validate your booking.",
        "index.html"
      );
    } catch (error) {
      console.error("Vehicle Rental Error:", error);
      showPopup("Rental Error", error.message || "Could not submit vehicle rental.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

loadVehicle();

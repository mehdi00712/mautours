import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
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

const dynamicTrips = document.getElementById("dynamicTrips");

const modal = document.getElementById("bookingModal");
const closeModal = document.getElementById("closeModal");
const bookingForm = document.getElementById("bookingForm");
const selectedPackageInput = document.getElementById("selectedPackage");

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

    if (redirect) {
      window.location.href = redirect;
    }

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

function normalizeSlotId(tripId, date) {
  return `${tripId}_${date}`
    .toLowerCase()
    .replaceAll(" ", "-")
    .replace(/[^a-z0-9-_]/g, "");
}

function formatPrice(trip) {
  const price = Number(trip.price || 0);

  if (price <= 0 || trip.priceType === "Custom Quote") {
    return "Custom Quote";
  }

  if (trip.priceType === "Fixed") {
    return `Rs ${price.toLocaleString()}`;
  }

  return `${trip.priceType || "Starting From"} Rs ${price.toLocaleString()}`;
}

function formatIncludes(includes) {
  if (!Array.isArray(includes) || includes.length === 0) {
    return "";
  }

  return includes
    .filter((item) => String(item || "").trim())
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

async function loadTrips() {
  if (!dynamicTrips) return;

  dynamicTrips.innerHTML = `
    <div class="loading-card">
      <h3>Loading Experiences...</h3>
      <p>Please wait while we load the latest tours and packages.</p>
    </div>
  `;

  try {
    const tripsQuery = query(
      collection(db, "trips"),
      where("active", "==", true),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(tripsQuery);

    if (snapshot.empty) {
      dynamicTrips.innerHTML = `
        <div class="loading-card">
          <h3>No Packages Available</h3>
          <p>The admin has not added any active trips yet.</p>
        </div>
      `;
      return;
    }

    dynamicTrips.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const trip = docSnap.data();
      const tripId = docSnap.id;

      const title = escapeHtml(trip.title || "Untitled Trip");
      const category = escapeHtml(trip.category || "Package");
      const description = escapeHtml(trip.description || "");
      const duration = escapeHtml(trip.duration || "");
      const imageUrl = escapeHtml(trip.imageUrl || "assets/ile.jpg");
      const includes = formatIncludes(trip.includes);
      const priceText = escapeHtml(formatPrice(trip));

      const card = document.createElement("div");
      card.className = "booking-card package-premium";

      card.innerHTML = `
        <img src="${imageUrl}" alt="${title}" loading="lazy">
        <span>${category}</span>
        <h3>${title}</h3>
        <p>${description}</p>

        ${duration ? `<p><strong class="duration-label">Duration:</strong> ${duration}</p>` : ""}

        ${includes ? `<ul class="package-includes">${includes}</ul>` : ""}

        <strong>${priceText}</strong>

        <button class="btn book-btn" data-id="${tripId}">
          Book Package
        </button>
      `;

      dynamicTrips.appendChild(card);

      const bookBtn = card.querySelector(".book-btn");

      bookBtn.addEventListener("click", () => {
        openBookingModal({
          id: tripId,
          ...trip
        });
      });
    });

  } catch (error) {
    console.error("Load Trips Error:", error);

    dynamicTrips.innerHTML = `
      <div class="loading-card">
        <h3>Could Not Load Packages</h3>
        <p>Please try again later or contact us on WhatsApp.</p>
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

  selectedTrip = trip;

  if (selectedPackageInput) {
    selectedPackageInput.value = trip.title || "";
  }

  if (modal) {
    modal.classList.add("show");
  }
}

if (closeModal && modal) {
  closeModal.addEventListener("click", () => {
    modal.classList.remove("show");
  });
}

if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("show");
    }
  });
}

if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showPopup(
        "Login Required",
        "Please sign in first.",
        "login.html?redirect=booking.html"
      );
      return;
    }

    if (!selectedTrip || !selectedTrip.id) {
      showPopup("No Package Selected", "Please select a package first.");
      return;
    }

    const submitBtn = bookingForm.querySelector("button[type='submit']");
    const originalBtnText = submitBtn.textContent;

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
      showPopup(
        "Incomplete Form",
        "Please fill in all fields and upload payment proof."
      );
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

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      showPopup("Invalid Date", "Please select today or a future date.");
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      return;
    }

    try {
      const slotId = normalizeSlotId(selectedTrip.id, date);
      const slotRef = doc(db, "bookingSlots", slotId);
      const slotSnap = await getDoc(slotRef);

      if (slotSnap.exists()) {
        showPopup(
          "Date Unavailable",
          "This package is already booked for the selected date. Please choose another date."
        );
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        return;
      }

      const bookingRef = doc(collection(db, "bookings"));
      const bookingId = bookingRef.id;

      await setDoc(slotRef, {
        tripId: selectedTrip.id,
        package: selectedTrip.title || "",
        date,
        userId: currentUser.uid,
        bookingId,
        status: "Reserved",
        createdAt: serverTimestamp()
      });

      const safeFileName = proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");

      const storageRef = ref(
        storage,
        `payment_proofs/${currentUser.uid}/${bookingId}_${safeFileName}`
      );

      await uploadBytes(storageRef, proofFile);

      const paymentProofUrl = await getDownloadURL(storageRef);

      const basePrice = Number(selectedTrip.price || 0);
      const totalPrice = basePrice > 0 ? basePrice * people : 0;

      await setDoc(bookingRef, {
        userId: currentUser.uid,
        userEmail: currentUser.email || "",

        tripId: selectedTrip.id,
        name,
        email,
        phone,
        people,
        date,
        package: selectedTrip.title || "",

        pricePerPerson: basePrice,
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

      if (modal) {
        modal.classList.remove("show");
      }

      bookingForm.reset();
      selectedTrip = null;

      showPopup(
        "Booking Submitted ✅",
        "Your booking and payment proof have been submitted.\n\nAdmin will validate your payment and confirm your booking.",
        "index.html"
      );

    } catch (error) {
      console.error("Booking Error:", error);

      showPopup(
        "Booking Error",
        "There was an error submitting your booking. Please try again."
      );

    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && modal.classList.contains("show")) {
    modal.classList.remove("show");
  }
});

loadTrips();

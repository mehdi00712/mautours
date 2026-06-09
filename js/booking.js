import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
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

async function loadTrips() {
  if (!dynamicTrips) return;

  dynamicTrips.innerHTML = `<p>Loading packages...</p>`;

  try {
    const q = query(
      collection(db, "trips"),
      where("active", "==", true),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      dynamicTrips.innerHTML = `<p class="center">No packages available yet.</p>`;
      return;
    }

    dynamicTrips.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const trip = docSnap.data();
      const tripId = docSnap.id;

      const priceText =
        Number(trip.price || 0) > 0
          ? `${trip.priceType || "Starting From"} Rs ${Number(trip.price).toLocaleString()}`
          : "Custom Quote";

      const includes = Array.isArray(trip.includes)
        ? trip.includes.map(item => `<li>${item}</li>`).join("")
        : "";

      const card = document.createElement("div");
      card.className = "booking-card package-premium";

      card.innerHTML = `
        <img src="${trip.imageUrl || "assets/ile.jpg"}" alt="${trip.title}">
        <span>${trip.category || "Package"}</span>
        <h3>${trip.title}</h3>
        <p>${trip.description || ""}</p>
        <ul class="package-includes">${includes}</ul>
        <strong>${priceText}</strong>
        <button class="btn book-btn" data-id="${tripId}">Book Package</button>
      `;

      dynamicTrips.appendChild(card);

      card.querySelector(".book-btn").addEventListener("click", () => {
        openBookingModal({
          id: tripId,
          ...trip
        });
      });
    });

  } catch (error) {
    console.error("Load Trips Error:", error);
    dynamicTrips.innerHTML = `<p class="center">Could not load packages.</p>`;
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
    selectedPackageInput.value = trip.title;
  }

  if (modal) {
    modal.classList.add("show");
  }
}

if (closeModal && modal) {
  closeModal.addEventListener("click", () => modal.classList.remove("show"));
}

if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("show");
  });
}

if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showPopup("Login Required", "Please sign in first.", "login.html?redirect=booking.html");
      return;
    }

    if (!selectedTrip) {
      showPopup("No Package Selected", "Please select a package first.");
      return;
    }

    const submitBtn = bookingForm.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const people = Number(document.getElementById("people").value);
    const date = document.getElementById("date").value.trim();
    const proofFile = document.getElementById("paymentProof").files[0];

    if (!name || !email || !phone || !people || !date || !proofFile) {
      showPopup("Incomplete Form", "Please fill in all fields and upload payment proof.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Booking for Validation";
      return;
    }

    try {
      const slotId = `${selectedTrip.id}_${date}`;
      const slotRef = doc(db, "bookingSlots", slotId);
      const bookingRef = doc(collection(db, "bookings"));
      const bookingId = bookingRef.id;

      await setDoc(slotRef, {
        tripId: selectedTrip.id,
        package: selectedTrip.title,
        date,
        userId: currentUser.uid,
        bookingId,
        createdAt: serverTimestamp()
      });

      const storageRef = ref(
        storage,
        `payment_proofs/${currentUser.uid}/${bookingId}_${proofFile.name}`
      );

      await uploadBytes(storageRef, proofFile);
      const paymentProofUrl = await getDownloadURL(storageRef);

      const basePrice = Number(selectedTrip.price || 0);
      const totalPrice = basePrice > 0 ? basePrice * people : 0;

      await setDoc(bookingRef, {
        userId: currentUser.uid,
        userEmail: currentUser.email,

        tripId: selectedTrip.id,
        name,
        email,
        phone,
        people,
        date,
        package: selectedTrip.title,

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

      modal.classList.remove("show");
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
        "Date Unavailable",
        "This package may already be booked for this date, or there was an error submitting your booking."
      );

    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Booking for Validation";
    }
  });
}

loadTrips();

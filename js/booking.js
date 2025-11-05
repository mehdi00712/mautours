// js/booking.js

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== Package Prices =====
const packagePrices = {
  "Southern Wonders Tour": 2500,
  "Île aux Cerfs Experience": 3000,
  "Airport Transfers": 1200
};

// ===== Modal & Buttons =====
const modal = document.getElementById("bookingModal");
const closeModal = document.getElementById("closeModal");
const bookingForm = document.getElementById("bookingForm");
let selectedPackage = "";

const bookButtons = document.querySelectorAll(".book-btn");
bookButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedPackage = btn.dataset.package;
    openBookingModal(selectedPackage);
  });
});

function openBookingModal(packageName) {
  selectedPackage = packageName;
  if (modal) {
    modal.classList.add("show");
    document.getElementById("selectedPackage").value = packageName;
  }
}

if (closeModal) {
  closeModal.addEventListener("click", () => modal.classList.remove("show"));
}

// ===== Popup Elements =====
const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popupTitle");
const popupMessage = document.getElementById("popupMessage");
const popupBtn = document.getElementById("popupBtn");

// ===== Function to Show Popup =====
function showPopup(title, message, redirect = null) {
  popupTitle.textContent = title;
  popupMessage.textContent = message;
  popup.classList.add("show");

  popupBtn.onclick = () => {
    popup.classList.remove("show");
    if (redirect) window.location.href = redirect;
  };
}

// ===== Submit Booking =====
if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const people = parseInt(document.getElementById("people").value.trim());
    const date = document.getElementById("date").value.trim();

    if (!name || !email || !phone || !people || !date) {
      showPopup("Incomplete Form", "Please fill in all fields before proceeding.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showPopup("Invalid Email", "Please enter a valid email address.");
      return;
    }

    const basePrice = packagePrices[selectedPackage] || 0;
    const totalPrice = basePrice * people;

    try {
      await addDoc(collection(db, "bookings"), {
        name,
        email,
        phone,
        people,
        date,
        package: selectedPackage,
        pricePerPerson: basePrice,
        totalPrice,
        createdAt: serverTimestamp()
      });

      modal.classList.remove("show");
      bookingForm.reset();

      showPopup(
        "Booking Confirmed 🎉",
        `Your booking for "${selectedPackage}" has been recorded.\nTotal: Rs ${totalPrice}\n\nClick OK to continue to payment.`,
        "https://secureacceptance.cybersource.com/pay"
      );

    } catch (error) {
      console.error("Booking Error:", error);
      showPopup("Error", "There was an issue processing your booking. Please try again.");
    }
  });
}

// ===== ESC Key to Close =====
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("show")) {
    modal.classList.remove("show");
  }
});

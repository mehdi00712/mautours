// js/booking.js

// Import Firebase modules
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

// ===== Modal Elements =====
const modal = document.getElementById("bookingModal");
const closeModal = document.getElementById("closeModal");
const bookingForm = document.getElementById("bookingForm");
const checkoutBtn = document.getElementById("checkoutBtn");
let selectedPackage = "";

// ===== Open Modal when clicking "Book Now" =====
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

// ===== Close Modal =====
if (closeModal) {
  closeModal.addEventListener("click", () => {
    modal.classList.remove("show");
  });
}

// ===== Submit Booking =====
if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const people = document.getElementById("people").value.trim();
    const date = document.getElementById("date").value.trim();

    if (!name || !email || !phone || !people || !date) {
      alert("⚠️ Please fill in all fields before submitting.");
      return;
    }

    try {
      // Save booking to Firestore
      await addDoc(collection(db, "bookings"), {
        name,
        email,
        phone,
        people,
        date,
        package: selectedPackage,
        createdAt: serverTimestamp()
      });

      // Close modal & show success
      modal.classList.remove("show");
      alert("✅ Booking saved successfully! Redirecting to payment...");

      // Simulate checkout redirect
      // ⚠️ Replace this placeholder with your real ABSA hosted payment URL once ready
      setTimeout(() => {
        window.location.href = "https://secureacceptance.cybersource.com/pay";
      }, 1500);
    } catch (error) {
      console.error("Booking Error:", error);
      alert("❌ Failed to save booking: " + error.message);
    }
  });
}

// ===== Optional: ESC Key closes modal =====
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && modal.classList.contains("show")) {
    modal.classList.remove("show");
  }
});

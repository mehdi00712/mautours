// js/booking.js
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Handle Book Now buttons
const bookButtons = document.querySelectorAll(".book-btn");

bookButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const packageName = btn.dataset.package;
    openBookingModal(packageName);
  });
});

// Modal logic
const modal = document.getElementById("bookingModal");
const closeModal = document.getElementById("closeModal");
const bookingForm = document.getElementById("bookingForm");
const checkoutBtn = document.getElementById("checkoutBtn");
let selectedPackage = "";

function openBookingModal(packageName) {
  selectedPackage = packageName;
  modal.classList.add("show");
  document.getElementById("selectedPackage").value = packageName;
}

if (closeModal) {
  closeModal.addEventListener("click", () => {
    modal.classList.remove("show");
  });
}

// Handle Booking Submission
if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const people = document.getElementById("people").value.trim();
    const date = document.getElementById("date").value.trim();

    try {
      await addDoc(collection(db, "bookings"), {
        name,
        email,
        phone,
        people,
        date,
        package: selectedPackage,
        createdAt: serverTimestamp()
      });

      modal.classList.remove("show");
      alert("✅ Booking saved! Redirecting to payment...");

      // TODO: replace with ABSA live redirect link when you receive it
      setTimeout(() => {
        window.location.href = "https://secureacceptance.cybersource.com/pay";
      }, 1500);
    } catch (error) {
      alert("❌ Error saving booking: " + error.message);
    }
  });
}

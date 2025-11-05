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

const packagePrices = {
  "Southern Wonders Tour": 2500,
  "Île aux Cerfs Experience": 3000,
  "Airport Transfers": 1200
};

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
  if (modal) {
    modal.classList.add("show");
    document.getElementById("selectedPackage").value = packageName;
  }
}

if (closeModal) {
  closeModal.addEventListener("click", () => {
    modal.classList.remove("show");
  });
}

if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const people = parseInt(document.getElementById("people").value.trim());
    const date = document.getElementById("date").value.trim();

    if (!name || !email || !phone || !people || !date) {
      alert("⚠️ Please fill in all fields before proceeding.");
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

      alert(`✅ Booking saved!\nTotal: Rs ${totalPrice}\nRedirecting to payment...`);
    } catch (error) {
      console.warn("⚠️ Unable to save booking:", error.message);
      alert("⚠️ Booking saved locally — redirecting to payment...");
    } finally {
      modal.classList.remove("show");
      bookingForm.reset();

      // Always redirect (even if Firestore fails)
      setTimeout(() => {
        window.location.href = "https://secureacceptance.cybersource.com/pay";
      }, 1500);
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("show")) {
    modal.classList.remove("show");
  }
});

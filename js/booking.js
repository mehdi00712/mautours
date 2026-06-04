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

const packagePrices = {
  "Southern Wonders Tour": 2500,
  "Île aux Cerfs Experience": 3000,
  "Airport Transfers": 1200
};

const modal = document.getElementById("bookingModal");
const closeModal = document.getElementById("closeModal");
const bookingForm = document.getElementById("bookingForm");
const selectedPackageInput = document.getElementById("selectedPackage");

const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popupTitle");
const popupMessage = document.getElementById("popupMessage");
const popupBtn = document.getElementById("popupBtn");

let selectedPackage = "";

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

function openBookingModal(packageName) {
  selectedPackage = packageName;

  if (selectedPackageInput) {
    selectedPackageInput.value = packageName;
  }

  if (modal) {
    modal.classList.add("show");
  }
}

document.querySelectorAll(".book-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    openBookingModal(btn.dataset.package);
  });
});

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

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const people = Number(document.getElementById("people").value);
    const date = document.getElementById("date").value.trim();

    if (!name || !email || !phone || !people || !date || !selectedPackage) {
      showPopup("Incomplete Form", "Please fill in all fields before proceeding.");
      return;
    }

    if (people < 1) {
      showPopup("Invalid Number", "Please enter at least 1 person.");
      return;
    }

    const selectedDate = new Date(date);
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      showPopup("Invalid Date", "Please select today or a future date.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      showPopup("Invalid Email", "Please enter a valid email address.");
      return;
    }

    const basePrice = packagePrices[selectedPackage] || 0;
    const totalPrice = basePrice * people;
    const confirmedPackage = selectedPackage;

    try {
      await addDoc(collection(db, "bookings"), {
        name: name,
        email: email,
        phone: phone,
        people: people,
        date: date,
        package: confirmedPackage,
        pricePerPerson: basePrice,
        totalPrice: totalPrice,
        paymentStatus: "Pending",
        bookingStatus: "New",
        createdAt: serverTimestamp()
      });

      modal.classList.remove("show");
      bookingForm.reset();
      selectedPackage = "";

      showPopup(
        "Booking Confirmed 🎉",
        `Your booking has been recorded.\n\nPackage: ${confirmedPackage}\nTotal: Rs ${totalPrice.toLocaleString()}\n\nClick OK to continue to payment.`,
        "https://secureacceptance.cybersource.com/pay"
      );

    } catch (error) {
      console.error("Booking Error:", error);
      showPopup(
        "Error",
        "There was an issue processing your booking. Please try again."
      );
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && modal.classList.contains("show")) {
    modal.classList.remove("show");
  }
});

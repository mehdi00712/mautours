import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
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

let currentUser = null;
let selectedPackage = "";

const packagePrices = {
  "Standard Package": 2500,
  "Family Package": 18000,
  "VIP Luxury Package": 45000,

  "Day 1 - 23 Colours Nature Park": 0,
  "Day 2 - Alexandra Falls and Tea Factory": 0,
  "Day 3 - Dolphins and Whale Watching": 0,
  "Day 4 - Casela Safari Park": 0,
  "Day 5 - Ile aux Cerfs Island": 0,
  "Day 6 - Port Louis City Tour": 0,
  "Day 7 - Chamarel and Horse Riding": 0,
  "Day 8 - Helicopter Tour": 0,
  "Day 9 - Fishing or Catamaran Tour": 0
};

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

function openBookingModal(packageName) {
  if (!currentUser) {
    showPopup(
      "Login Required",
      "Please sign in before making a booking.",
      "login.html?redirect=booking.html"
    );
    return;
  }

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

    if (!currentUser) {
      showPopup(
        "Login Required",
        "Please sign in before making a booking.",
        "login.html?redirect=booking.html"
      );
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

    if (!name || !email || !phone || !people || !date || !selectedPackage || !proofFile) {
      showPopup("Incomplete Form", "Please fill in all fields and upload payment proof.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Booking for Validation";
      return;
    }

    if (people < 1) {
      showPopup("Invalid Number", "Please enter at least 1 person.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Booking for Validation";
      return;
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      showPopup("Invalid Date", "Please select today or a future date.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Booking for Validation";
      return;
    }

    try {
      const bookingRef = doc(collection(db, "bookings"));
      const bookingId = bookingRef.id;

      const storageRef = ref(
        storage,
        `payment_proofs/${currentUser.uid}/${bookingId}_${proofFile.name}`
      );

      await uploadBytes(storageRef, proofFile);
      const paymentProofUrl = await getDownloadURL(storageRef);

      const basePrice = packagePrices[selectedPackage] || 0;
      const totalPrice = basePrice > 0 ? basePrice * people : 0;

      await setDoc(bookingRef, {
        userId: currentUser.uid,
        userEmail: currentUser.email,

        name,
        email,
        phone,
        people,
        date,
        package: selectedPackage,

        pricePerPerson: basePrice,
        totalPrice,
        priceType: basePrice > 0 ? "Fixed" : "Custom Quote",

        paymentMethod: "Bank Transfer",
        paymentStatus: "Proof Uploaded",
        paymentProofUrl,

        adminDecision: "Pending",
        bookingStatus: "Awaiting Admin Validation",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (modal) modal.classList.remove("show");

      bookingForm.reset();
      selectedPackage = "";

      showPopup(
        "Booking Submitted ✅",
        "Your booking request and payment proof have been submitted.\n\nOur admin team will verify your payment and confirm or reject your booking.",
        "index.html"
      );

    } catch (error) {
      console.error("Booking Error:", error);
      showPopup(
        "Error",
        "There was an issue submitting your booking. Please try again."
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Booking for Validation";
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && modal.classList.contains("show")) {
    modal.classList.remove("show");
  }
});

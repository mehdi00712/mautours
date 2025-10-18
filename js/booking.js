import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  const bookButtons = document.querySelectorAll(".book-btn");
  const modal = document.getElementById("bookingModal");
  const closeBtn = document.querySelector(".modal .close");
  const modalTitle = document.getElementById("modalTitle");
  const form = document.getElementById("bookingForm");

  let selectedPackage = null;
  let selectedPrice = null;

  // Open booking modal
  bookButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedPackage = btn.dataset.package;
      selectedPrice = btn.dataset.price;
      modalTitle.textContent = `Book: ${selectedPackage}`;
      modal.classList.add("show");
      document.body.style.overflow = "hidden";
    });
  });

  // Close modal
  closeBtn.addEventListener("click", () => {
    modal.classList.remove("show");
    document.body.style.overflow = "auto";
  });

  // Submit booking form
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.name.value;
    const email = form.email.value;
    const phone = form.phone.value;
    const date = form.date.value;
    const people = form.people.value;

    try {
      await addDoc(collection(db, "bookings"), {
        package: selectedPackage,
        price: selectedPrice,
        name,
        email,
        phone,
        date,
        people,
        createdAt: new Date(),
      });

      // Redirect to ABSA hosted payment link
      const mid = "bbm_coraplexltd_1232735_mur";
      const paymentUrl = `https://secureacceptance.cybersource.com/pay?mid=${mid}&amount=${selectedPrice}&reference=${encodeURIComponent(selectedPackage)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`;
      window.location.href = paymentUrl;

    } catch (error) {
      alert("Error saving booking: " + error.message);
    }
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("show");
      document.body.style.overflow = "auto";
    }
  });
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
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

  // Open modal
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

  // Submit form
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
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

      // Temporary animation before ABSA redirect
      modal.innerHTML = `
        <div style="text-align:center;padding:2rem;">
          <h3>Redirecting to Payment Portal...</h3>
          <p>Please wait while we connect you to ABSA Secure Payment.</p>
          <div class="spinner"></div>
        </div>
      `;

      // TODO: replace this with your real ABSA link
      const absaURL = "https://secureacceptance.cybersource.com/pay";
      setTimeout(() => {
        window.location.href = absaURL;
      }, 2000);
    } catch (err) {
      alert("Error saving booking: " + err.message);
    }
  });

  // Click outside closes modal
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("show");
      document.body.style.overflow = "auto";
    }
  });
});

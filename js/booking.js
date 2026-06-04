import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app);

const createAbsaPayment = httpsCallable(functions, "createAbsaPayment");

const packagePrices = {
  "Southern Wonders Tour": 2500,
  "Île aux Cerfs Experience": 3000,
  "Airport Transfers": 1200
};

let currentUser = null;
let selectedPackage = "";

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

function createSlotId(packageName, date) {
  return `${packageName}_${date}`
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll("î", "i")
    .replaceAll("'", "")
    .replaceAll("’", "")
    .replace(/[^a-z0-9-_]/g, "");
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

    const confirmedPackage = selectedPackage;
    const basePrice = packagePrices[confirmedPackage] || 0;
    const totalPrice = basePrice * people;
    const slotId = createSlotId(confirmedPackage, date);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const slotRef = doc(db, "bookingSlots", slotId);
        const slotSnap = await transaction.get(slotRef);

        if (slotSnap.exists()) {
          throw new Error("DOUBLE_BOOKING");
        }

        const bookingRef = doc(collection(db, "bookings"));

        transaction.set(slotRef, {
          package: confirmedPackage,
          date,
          bookingId: bookingRef.id,
          userId: currentUser.uid,
          status: "Reserved",
          createdAt: serverTimestamp()
        });

        transaction.set(bookingRef, {
          userId: currentUser.uid,
          userEmail: currentUser.email,
          name,
          email,
          phone,
          people,
          date,
          package: confirmedPackage,
          pricePerPerson: basePrice,
          totalPrice,
          slotId,
          paymentMethod: "Absa Bank",
          paymentStatus: "Pending",
          bookingStatus: "New",
          createdAt: serverTimestamp()
        });

        return {
          bookingId: bookingRef.id
        };
      });

      const paymentResponse = await createAbsaPayment({
        bookingId: result.bookingId,
        amount: totalPrice,
        customerName: name,
        customerEmail: email,
        packageName: confirmedPackage
      });

      const paymentUrl = paymentResponse.data.paymentUrl;

      if (modal) {
        modal.classList.remove("show");
      }

      bookingForm.reset();
      selectedPackage = "";

      showPopup(
        "Booking Confirmed 🎉",
        `Your booking has been reserved.\n\nPackage: ${confirmedPackage}\nDate: ${date}\nTotal: Rs ${totalPrice.toLocaleString()}\n\nClick OK to continue to secure payment.`,
        paymentUrl
      );

    } catch (error) {
      console.error("Booking Error:", error);

      if (error.message === "DOUBLE_BOOKING") {
        showPopup(
          "Date Unavailable",
          "This package is already booked for the selected date. Please choose another date."
        );
        return;
      }

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

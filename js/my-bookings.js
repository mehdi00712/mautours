import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const bookingsList = document.getElementById("bookingsList");
const logoutBtn = document.getElementById("logoutBtn");

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  const price = Number(value || 0);
  return price > 0 ? `€ ${price.toLocaleString()}` : "Custom Quote";
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html?redirect=my-bookings.html";
    return;
  }

  await loadBookings(user.uid);
});

async function loadBookings(uid) {
  try {
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", uid)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      bookingsList.innerHTML = `
        <div class="loading-card">
          <h3>No Bookings Yet</h3>
          <p>You have not submitted any booking yet.</p>
          <a href="booking.html" class="btn">View Packages</a>
        </div>
      `;
      return;
    }

    const bookings = [];

    snapshot.forEach((docSnap) => {
      bookings.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    bookings.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });

    bookingsList.innerHTML = "";

    bookings.forEach((booking) => {
      const card = document.createElement("div");
      card.className = "admin-trip-card";

      const status = booking.bookingStatus || "Pending";
      const isRejected = status === "Rejected";

      card.innerHTML = `
        <h4>${escapeHtml(booking.package || booking.vehicleName || "Booking")}</h4>

        <p><strong>Status:</strong> ${escapeHtml(status)}</p>
        <p><strong>Payment:</strong> ${escapeHtml(booking.paymentStatus || "-")}</p>
        <p><strong>Date:</strong> ${escapeHtml(booking.bookingPeriod || booking.rentalPeriod || booking.date || "-")}</p>
        <p><strong>People / Passengers:</strong> ${escapeHtml(booking.people || booking.passengers || "-")}</p>
        <p><strong>Total:</strong> ${money(booking.totalPrice)}</p>

        ${
          booking.vehicleName
            ? `<p><strong>Vehicle:</strong> ${escapeHtml(booking.vehicleName)}</p>`
            : ""
        }

        ${
          isRejected && booking.rejectionReason
            ? `
              <div class="admin-note" style="border-left-color:#b45309;">
                <strong>Rejected Reason:</strong><br>
                ${escapeHtml(booking.rejectionReason)}
              </div>
            `
            : ""
        }

        ${
          booking.customerMessage
            ? `
              <div class="admin-note">
                <strong>Message:</strong><br>
                ${escapeHtml(booking.customerMessage)}
              </div>
            `
            : ""
        }

        ${
          booking.paymentProofUrl
            ? `<a href="${escapeHtml(booking.paymentProofUrl)}" target="_blank" class="proof-link">View Payment Proof</a>`
            : ""
        }
      `;

      bookingsList.appendChild(card);
    });
  } catch (error) {
    bookingsList.innerHTML = `
      <div class="loading-card">
        <h3>Error</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

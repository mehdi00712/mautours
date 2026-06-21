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

function formatActivities(activities) {
  if (!Array.isArray(activities) || activities.length === 0) {
    return "";
  }

  return `
    <div class="admin-note">
      <strong>Selected Activities:</strong>
      <ul style="margin:8px 0 0 18px;">
        ${activities
          .map((activity) => {
            const name = activity.name || "Activity";
            const price = Number(activity.price || 0);

            return `
              <li>
                ${escapeHtml(name)}
                ${price > 0 ? ` — ${money(price)}` : ""}
              </li>
            `;
          })
          .join("")}
      </ul>
    </div>
  `;
}

function getBookingTitle(booking) {
  if (booking.bookingType === "vehicle_rental") {
    return booking.vehicleName || "Vehicle Rental";
  }

  return booking.package || booking.vehicleName || "Booking";
}

function getBookingDate(booking) {
  return (
    booking.bookingPeriod ||
    booking.rentalPeriod ||
    booking.date ||
    booking.startDate ||
    "-"
  );
}

function getPeopleOrPassengers(booking) {
  return booking.people || booking.passengers || "-";
}

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value.includes("confirm") || value.includes("approved")) {
    return "status-confirmed";
  }

  if (value.includes("reject") || value.includes("cancel")) {
    return "status-rejected";
  }

  return "status-pending";
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html?redirect=my-bookings.html";
    return;
  }

  await loadBookings(user.uid);
});

async function loadBookings(uid) {
  if (!bookingsList) return;

  bookingsList.innerHTML = `
    <div class="loading-card">
      <h3>Loading bookings...</h3>
      <p>Please wait.</p>
    </div>
  `;

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
      const isRejected = String(status).toLowerCase().includes("rejected");

      const activitiesHtml = formatActivities(booking.selectedActivities);

      const vehicleHtml = booking.vehicleName
        ? `
          <p><strong>Vehicle:</strong> ${escapeHtml(booking.vehicleName)}</p>
          ${
            booking.vehiclePrice
              ? `<p><strong>Vehicle Price:</strong> ${money(booking.vehiclePrice)}</p>`
              : ""
          }
        `
        : "";

      const proofHtml = booking.paymentProofUrl
        ? `
          <a
            href="${escapeHtml(booking.paymentProofUrl)}"
            target="_blank"
            class="proof-link"
          >
            View Payment Proof
          </a>
        `
        : "";

      card.innerHTML = `
        <h4>${escapeHtml(getBookingTitle(booking))}</h4>

        <p>
          <strong>Status:</strong>
          <span class="${getStatusClass(status)}">${escapeHtml(status)}</span>
        </p>

        <p><strong>Payment:</strong> ${escapeHtml(booking.paymentStatus || "-")}</p>
        <p><strong>Date:</strong> ${escapeHtml(getBookingDate(booking))}</p>
        <p><strong>People / Passengers:</strong> ${escapeHtml(getPeopleOrPassengers(booking))}</p>

        ${
          booking.basePackagePrice
            ? `<p><strong>Base Package Price:</strong> ${money(booking.basePackagePrice)}</p>`
            : ""
        }

        ${
          booking.activitiesTotal
            ? `<p><strong>Activities Total:</strong> ${money(booking.activitiesTotal)}</p>`
            : ""
        }

        ${vehicleHtml}

        <p><strong>Total:</strong> ${money(booking.totalPrice)}</p>

        ${activitiesHtml}

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

        ${proofHtml}
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

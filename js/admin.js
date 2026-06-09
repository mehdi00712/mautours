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
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const adminUIDs = [
  "d6IRCgOfwhZrKyRIoP6siAM8EOf2",
  "OeS88yW5sjSPxSk9kUlVjPeoZeY2"
];

const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popupTitle");
const popupMessage = document.getElementById("popupMessage");
const popupBtn = document.getElementById("popupBtn");

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

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showPopup("Login Required", "Please log in first.", "login.html");
    return;
  }

  if (!adminUIDs.includes(user.uid)) {
    await signOut(auth);
    showPopup("Access Denied", "Admin privileges required.", "index.html");
    return;
  }

  loadBookings();
});

async function loadBookings() {
  const tableBody = document.querySelector("#bookingsTable tbody");
  const revenueFill = document.getElementById("revenueFill");
  const revenueValue = document.getElementById("revenueValue");

  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="10">Loading bookings...</td></tr>`;

  try {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    tableBody.innerHTML = "";

    if (snapshot.empty) {
      tableBody.innerHTML = `<tr><td colspan="10">No bookings found.</td></tr>`;
      if (revenueFill) revenueFill.style.width = "0%";
      if (revenueValue) revenueValue.textContent = "Rs 0";
      return;
    }

    let totalRevenue = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const bookingId = docSnap.id;

      if (data.bookingStatus === "Confirmed") {
        totalRevenue += Number(data.totalPrice || 0);
      }

      const status = data.bookingStatus || "Pending";
      const total =
        data.totalPrice && data.totalPrice > 0
          ? `Rs ${Number(data.totalPrice).toLocaleString()}`
          : "Custom Quote";

      const proofLink = data.paymentProofUrl
        ? `<a href="${data.paymentProofUrl}" target="_blank" class="proof-link">View Proof</a>`
        : "No Proof";

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${data.name || "-"}</td>
        <td>${data.phone || "-"}</td>
        <td>${data.email || "-"}</td>
        <td>${data.package || "-"}</td>
        <td>${data.date || "-"}</td>
        <td>${data.people || "-"}</td>
        <td><strong>${total}</strong></td>
        <td>${proofLink}</td>
        <td>${status}</td>
        <td>
          <button class="approve-btn" data-id="${bookingId}">Approve</button>
          <button class="reject-btn" data-id="${bookingId}">Reject</button>
          <button class="delete-btn" data-id="${bookingId}">Delete</button>
        </td>
      `;

      tableBody.appendChild(row);
    });

    if (revenueValue) {
      revenueValue.textContent = `Rs ${totalRevenue.toLocaleString()}`;
    }

    if (revenueFill) {
      const cappedRevenue = Math.min(totalRevenue, 200000);
      revenueFill.style.width = `${(cappedRevenue / 200000) * 100}%`;
    }

    bindAdminButtons();

  } catch (error) {
    console.error("Error loading bookings:", error);
    tableBody.innerHTML = `<tr><td colspan="10" style="color:red;">Error: ${error.message}</td></tr>`;
  }
}

function bindAdminButtons() {
  document.querySelectorAll(".approve-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await updateDoc(doc(db, "bookings", btn.dataset.id), {
        bookingStatus: "Confirmed",
        paymentStatus: "Verified",
        adminDecision: "Approved",
        updatedAt: serverTimestamp()
      });

      showPopup("Booking Approved", "The booking has been confirmed.");
      loadBookings();
    });
  });

  document.querySelectorAll(".reject-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const reason = prompt("Enter rejection reason:");

      await updateDoc(doc(db, "bookings", btn.dataset.id), {
        bookingStatus: "Rejected",
        paymentStatus: "Rejected",
        adminDecision: "Rejected",
        rejectionReason: reason || "No reason provided",
        updatedAt: serverTimestamp()
      });

      showPopup("Booking Rejected", "The booking has been rejected.");
      loadBookings();
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this booking?")) return;

      await deleteDoc(doc(db, "bookings", btn.dataset.id));
      showPopup("Booking Deleted", "The booking has been removed.");
      loadBookings();
    });
  });
}

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    showPopup("Logged Out", "You have been logged out successfully.", "index.html");
  });
}

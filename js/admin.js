// js/admin.js
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
  doc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Popup references
const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popupTitle");
const popupMessage = document.getElementById("popupMessage");
const popupBtn = document.getElementById("popupBtn");

function showPopup(title, message, redirect = null) {
  popupTitle.textContent = title;
  popupMessage.textContent = message;
  popup.classList.add("show");

  popupBtn.onclick = () => {
    popup.classList.remove("show");
    if (redirect) window.location.href = redirect;
  };
}

// ===== Admin Access =====
const adminUIDs = [
  "d6IRCgOfwhZrKyRIoP6siAM8EOf2",
  "OeS88yW5sjSPxSk9kUlVjPeoZeY2"
];

// ===== Auth Check =====
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showPopup("Login Required", "Please log in first.", "login.html");
  } else if (!adminUIDs.includes(user.uid)) {
    await signOut(auth);
    showPopup("Access Denied", "Admin privileges required.", "index.html");
  } else {
    console.log("✅ Admin access granted:", user.email);
    loadBookings();
  }
});

// ===== Load Bookings =====
async function loadBookings() {
  const tableBody = document.querySelector("#bookingsTable tbody");
  const revenueFill = document.getElementById("revenueFill");
  const revenueValue = document.getElementById("revenueValue");

  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="9">Loading...</td></tr>`;

  try {
    const snapshot = await getDocs(collection(db, "bookings"));
    tableBody.innerHTML = "";

    if (snapshot.empty) {
      tableBody.innerHTML = `<tr><td colspan="9">No bookings found.</td></tr>`;
      if (revenueFill) revenueFill.style.width = "0%";
      if (revenueValue) revenueValue.textContent = "Rs 0";
      return;
    }

    let totalRevenue = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const row = document.createElement("tr");

      const price = data.pricePerPerson || 0;
      const total = data.totalPrice || price * (data.people || 1);
      totalRevenue += total;

      row.innerHTML = `
        <td>${data.name}</td>
        <td>${data.phone || "-"}</td>
        <td>${data.email}</td>
        <td>${data.package}</td>
        <td>${data.date}</td>
        <td>${data.people}</td>
        <td>Rs ${price.toLocaleString()}</td>
        <td><strong>Rs ${total.toLocaleString()}</strong></td>
        <td><button class="delete-btn" data-id="${docSnap.id}">Delete</button></td>
      `;
      tableBody.appendChild(row);
    });

    // ===== Revenue Bar Update =====
    const cappedRevenue = Math.min(totalRevenue, 200000);
    const percentage = (cappedRevenue / 200000) * 100;

    if (revenueFill) {
      revenueFill.style.width = `${percentage}%`;
    }
    if (revenueValue) {
      revenueValue.textContent = `Rs ${totalRevenue.toLocaleString()}`;
    }

    // ===== Delete Buttons =====
    document.querySelectorAll(".delete-btn").forEach((btn) =>
      btn.addEventListener("click", async () => {
        showPopup(
          "Confirm Deletion",
          "Do you want to delete this booking?",
          null
        );

        popupBtn.onclick = async () => {
          await deleteDoc(doc(db, "bookings", btn.dataset.id));
          popup.classList.remove("show");
          showPopup("Booking Deleted", "The booking has been removed.", null);
          loadBookings();
        };
      })
    );
  } catch (error) {
    console.error("Error loading bookings:", error);
    tableBody.innerHTML = `<tr><td colspan="9" style="color:red;">Error: ${error.message}</td></tr>`;
  }
}

// ===== Logout =====
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    showPopup("Logged Out", "You have been logged out successfully.", "index.html");
  });
}

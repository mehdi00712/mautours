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

// ====== Admin Access List ======
const adminUIDs = [
  "d6IRCgOfwhZrKyRIoP6siAM8EOf2", // Main admin
  "OeS88yW5sjSPxSk9kUlVjPeoZeY2"  // Secondary admin
];

// ===== Auth Check =====
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in first!");
    window.location.href = "login.html";
  } else if (!adminUIDs.includes(user.uid)) {
    alert("Access Denied – Admin Only");
    await signOut(auth);
    window.location.href = "index.html";
  } else {
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

    // ===== Animate Revenue Bar =====
    const cappedRevenue = Math.min(totalRevenue, 200000);
    const percentage = (cappedRevenue / 200000) * 100;

    if (revenueFill) {
      revenueFill.style.width = `${percentage}%`;

      if (percentage < 40) {
        revenueFill.style.background = "linear-gradient(90deg, #0073ff, #0040a0)";
      } else if (percentage < 80) {
        revenueFill.style.background = "linear-gradient(90deg, #00b894, #009970)";
      } else {
        revenueFill.style.background = "linear-gradient(90deg, #fcb900, #f57c00)";
      }
    }

    if (revenueValue) {
      revenueValue.textContent = `Rs ${totalRevenue.toLocaleString()}`;
    }

    // ===== Delete Buttons =====
    document.querySelectorAll(".delete-btn").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (confirm("Delete this booking?")) {
          await deleteDoc(doc(db, "bookings", btn.dataset.id));
          loadBookings();
        }
      })
    );
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="9" style="color:red;">Error: ${error.message}</td></tr>`;
  }
}

// ===== Logout =====
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    alert("Logged out successfully!");
    window.location.href = "index.html";
  });
}

// admin.js - Mautours Dashboard
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyC2jf5v9p8kVXP3weiPvHm8piHDbP6XaRw",
  authDomain: "mautours-60318.firebaseapp.com",
  projectId: "mautours-60318",
  storageBucket: "mautours-60318.firebasestorage.app",
  messagingSenderId: "1009871171111",
  appId: "1:1009871171111:web:d4369386c1a958aa18a802",
  measurementId: "G-882H9VPLJT",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const tableBody = document.querySelector("#bookingsTable tbody");
const totalRevenueEl = document.getElementById("totalRevenue");

async function loadBookings() {
  tableBody.innerHTML = "";
  let totalRevenue = 0;

  try {
    const querySnapshot = await getDocs(collection(db, "bookings"));

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const tr = document.createElement("tr");

      const isPaid = data.status === "paid";
      if (isPaid) totalRevenue += parseFloat(data.price) || 0;

      tr.innerHTML = `
        <td>${data.name}</td>
        <td>${data.email}</td>
        <td>${data.excursion}</td>
        <td>${data.date}</td>
        <td>${data.people}</td>
        <td>${data.price}</td>
        <td><span class="${isPaid ? "status-paid" : "status-pending"}">${data.status}</span></td>
        <td>
          <button class="btn-small mark-paid" data-id="${docSnap.id}">Mark Paid</button>
          <button class="btn-small delete" data-id="${docSnap.id}">Delete</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    totalRevenueEl.textContent = `MUR ${totalRevenue}`;
  } catch (err) {
    console.error("Error loading bookings:", err);
  }
}

// Handle mark as paid & delete
tableBody.addEventListener("click", async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains("mark-paid")) {
    try {
      await updateDoc(doc(db, "bookings", id), { status: "paid" });
      alert("Booking marked as paid ✅");
      loadBookings();
    } catch (err) {
      console.error("Error marking as paid:", err);
    }
  }

  if (e.target.classList.contains("delete")) {
    if (confirm("Are you sure you want to delete this booking?")) {
      try {
        await deleteDoc(doc(db, "bookings", id));
        alert("Booking deleted 🗑️");
        loadBookings();
      } catch (err) {
        console.error("Error deleting booking:", err);
      }
    }
  }
});

loadBookings();

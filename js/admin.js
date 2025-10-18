import { auth, db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

const bookingTable = document.getElementById("bookingTable").querySelector("tbody");

// ===== Protect Page =====
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("Access denied. Please login as admin.");
    window.location.href = "login.html";
    return;
  }
  if (user.email !== "mbhoyroo246@gmail.com") {
    alert("Only the admin can access this page.");
    signOut(auth);
    window.location.href = "index.html";
    return;
  }

  loadBookings();
});

// ===== Load Bookings =====
function loadBookings() {
  const q = query(collection(db, "bookings"), orderBy("created_at", "desc"));

  onSnapshot(q, (snapshot) => {
    bookingTable.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const b = docSnap.data();
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${b.excursion}</td>
        <td>${b.name} <br><small>${b.email}</small></td>
        <td>Rs ${b.total}</td>
        <td>
          <button class="delete-btn" data-id="${docSnap.id}">Delete</button>
        </td>
      `;
      bookingTable.appendChild(tr);
    });

    // Attach delete listeners
    const deleteBtns = document.querySelectorAll(".delete-btn");
    deleteBtns.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (confirm("Are you sure you want to delete this booking?")) {
          await deleteDoc(doc(db, "bookings", id));
          alert("Booking deleted.");
        }
      });
    });
  });
}

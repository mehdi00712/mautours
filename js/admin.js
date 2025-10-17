import { db, auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const tableBody = document.querySelector("#bookingsTable tbody");

onAuthStateChanged(auth, async (user) => {
  if (!user || user.email !== "mbhoyroo246@gmail.com") {
    alert("Access denied. Admins only.");
    window.location.href = "login.html";
    return;
  }

  const bookings = await getDocs(collection(db, "bookings"));
  tableBody.innerHTML = "";

  bookings.forEach((docSnap) => {
    const data = docSnap.data();
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${data.name}</td>
      <td>${data.email}</td>
      <td>${data.excursion}</td>
      <td>${data.date}</td>
      <td>${data.people}</td>
      <td>${data.payment_status}</td>
      <td>
        <button class="btn confirm" data-id="${docSnap.id}">Confirm</button>
        <button class="btn-outline delete" data-id="${docSnap.id}">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  // Confirm booking
  document.querySelectorAll(".confirm").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await updateDoc(doc(db, "bookings", btn.dataset.id), {
        payment_status: "paid",
      });
      alert("Booking confirmed!");
      location.reload();
    });
  });

  // Delete booking
  document.querySelectorAll(".delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await deleteDoc(doc(db, "bookings", btn.dataset.id));
      alert("Booking deleted.");
      location.reload();
    });
  });
});

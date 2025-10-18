import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const adminUID = "d6IRCgOfwhZrKyRIoP6siAM8EOf2";

// ===== Access Control =====
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("You must log in first!");
    window.location.href = "login.html";
  } else if (user.uid !== adminUID) {
    alert("Access denied. Admin only.");
    window.location.href = "index.html";
  } else {
    loadBookings();
  }
});

// ===== Load Bookings =====
async function loadBookings() {
  const tableBody = document.querySelector("#bookingsTable tbody");
  tableBody.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "bookings"));
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${data.name}</td>
      <td>${data.package}</td>
      <td>${data.email}</td>
      <td>${data.date}</td>
      <td>${data.people}</td>
      <td><button class="delete-btn" data-id="${docSnap.id}">Delete</button></td>
    `;
    tableBody.appendChild(row);
  });

  // Add delete button event
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await deleteDoc(doc(db, "bookings", btn.dataset.id));
      loadBookings();
    });
  });
}

// ===== Logout =====
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => {
    alert("Logged out successfully.");
    window.location.href = "index.html";
  });
});

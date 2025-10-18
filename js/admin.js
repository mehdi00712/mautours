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

// Check authentication
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in first!");
    window.location.href = "login.html";
  } else if (user.uid !== adminUID) {
    alert("Access Denied – Admin Only");
    await signOut(auth);
    window.location.href = "index.html";
  } else {
    loadBookings();
  }
});

// Load bookings
async function loadBookings() {
  const tableBody = document.querySelector("#bookingsTable tbody");
  tableBody.innerHTML = `<tr><td colspan="7">Loading bookings...</td></tr>`;

  try {
    const snapshot = await getDocs(collection(db, "bookings"));
    tableBody.innerHTML = "";

    if (snapshot.empty) {
      tableBody.innerHTML = `<tr><td colspan="7">No bookings found.</td></tr>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${data.name}</td>
        <td>${data.phone || "-"}</td>
        <td>${data.email}</td>
        <td>${data.package}</td>
        <td>${data.date}</td>
        <td>${data.people}</td>
        <td>
          <button class="delete-btn" data-id="${docSnap.id}">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    document.querySelectorAll(".delete-btn").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete this booking?")) {
          await deleteDoc(doc(db, "bookings", btn.dataset.id));
          loadBookings();
        }
      })
    );
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="7" style="color:red;">Error loading bookings: ${error.message}</td></tr>`;
  }
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  alert("Logged out successfully!");
  window.location.href = "index.html";
});

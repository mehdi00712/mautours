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

async function loadBookings() {
  const tableBody = document.querySelector("#bookingsTable tbody");
  const snapshot = await getDocs(collection(db, "bookings"));
  tableBody.innerHTML = "";

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
      <td><button class="delete-btn" data-id="${docSnap.id}">Delete</button></td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll(".delete-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await deleteDoc(doc(db, "bookings", btn.dataset.id));
      loadBookings();
    })
  );
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    alert("Logged out successfully!");
    window.location.href = "index.html";
  });
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

const bookingsTable = document.querySelector("#bookingsTable tbody");

// Live updates from Firestore
onSnapshot(collection(db, "bookings"), (snapshot) => {
  bookingsTable.innerHTML = "";
  let totalRevenue = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    const price = parseFloat(data.price || 0);
    totalRevenue += price;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${data.name}</td>
      <td>${data.email}</td>
      <td>${data.excursion}</td>
      <td>${data.price}</td>
      <td>${data.date}</td>
      <td>${data.people}</td>
      <td>${data.status}</td>
    `;
    bookingsTable.appendChild(tr);
  });

  // Show total revenue
  const tfoot = document.createElement("tfoot");
  tfoot.innerHTML = `
    <tr>
      <th colspan="3">Total Revenue</th>
      <th>MUR ${totalRevenue.toFixed(2)}</th>
      <th colspan="3"></th>
    </tr>
  `;
  bookingsTable.appendChild(tfoot);
});

import { db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const bookingTable = document.getElementById("bookingTable");

if (bookingTable) {
  const q = query(collection(db, "bookings"), orderBy("created_at", "desc"));
  onSnapshot(q, (snapshot) => {
    bookingTable.innerHTML = "";
    snapshot.forEach((doc) => {
      const b = doc.data();
      const row = `
        <tr>
          <td>${b.name}</td>
          <td>${b.excursion}</td>
          <td>${b.date}</td>
          <td>${b.people}</td>
          <td>Rs ${b.total}</td>
          <td>${b.payment_status}</td>
        </tr>`;
      bookingTable.innerHTML += row;
    });
  });
}

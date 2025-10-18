import { app } from "./firebase-config.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const db = getFirestore(app);
const bookingsTable = document.querySelector("#bookingsTable tbody");

onSnapshot(collection(db, "bookings"), (snapshot) => {
  bookingsTable.innerHTML = "";
  let total = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    total += parseFloat(data.price || 0);

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

  const tfoot = document.createElement("tfoot");
  tfoot.innerHTML = `
    <tr>
      <th colspan="3">Total Revenue</th>
      <th>MUR ${total.toFixed(2)}</th>
      <th colspan="3"></th>
    </tr>
  `;
  bookingsTable.appendChild(tfoot);
});

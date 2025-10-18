import { app } from "./firebase-config.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const db = getFirestore(app);

// Get excursion & price from URL
const urlParams = new URLSearchParams(window.location.search);
const excursion = urlParams.get("excursion") || "";
const price = urlParams.get("price") || "0";

document.getElementById("excursion").value = excursion;
document.getElementById("price").value = price;

// Submit booking
document.getElementById("bookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const date = document.getElementById("date").value;
  const people = document.getElementById("people").value; 

  try {
    await addDoc(collection(db, "bookings"), {
      name,
      email,
      phone,
      excursion,
      price,
      date,
      people,
      status: "pending",
      createdAt: new Date(),
    });

    const merchantID = "bbm_coraplexltd_1232735_mur";
    const redirectUrl = encodeURIComponent("https://mehdi00712.github.io/mautours/success.html");
    const absaUrl = `https://secureacceptance.cybersource.com/pay?merchant=${merchantID}&amount=${price}&reference=${encodeURIComponent(excursion)}&return_url=${redirectUrl}`;
    window.location.href = absaUrl;
  } catch (err) {
    console.error("Booking error:", err);
    alert("Error saving booking. Try again.");
  }
});

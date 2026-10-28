// js/vehicle-details.js
// One vehicle: photos, full description, features, prices and a booking form
// that saves the booking (with Tourism Authority record details) and opens WhatsApp.

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { placeholderImage } from "./price-format.js";
import { SERVICE_TYPES, servicePrice, vehicleFromPrice, vehicleFeatures } from "./vehicle-utils.js";
import {
  insertTravellerFields,
  readTravellerFields,
  travellerFieldsComplete,
  saveBooking,
  showBookingConfirmation,
  getWhatsappNumber,
  openPendingTab,
  sendTabTo
} from "./booking-store.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const id = new URLSearchParams(location.search).get("id");
let vehicle = null;

const $ = (x) => document.getElementById(x);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(title, text) {
  const box = $("vdMessage");
  box.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span>`;
  box.style.display = "block";
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderGallery(v) {
  const images = [
    v.imageUrl,
    ...(Array.isArray(v.vehicleGalleryImages) ? v.vehicleGalleryImages : []),
    ...(Array.isArray(v.galleryImages) ? v.galleryImages : [])
  ].filter(Boolean);
  const unique = [...new Set(images)];
  if (!unique.length) unique.push(placeholderImage(v.name, v.category || "Vehicle"));

  const main = $("vdMainImage");
  main.src = unique[0];
  main.alt = v.name || "Vehicle";

  const thumbs = $("vdThumbs");
  thumbs.innerHTML = "";
  if (unique.length < 2) return;

  unique.forEach((url, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = i === 0 ? "active" : "";
    b.innerHTML = `<img src="${escapeHtml(url)}" alt="${escapeHtml(v.name)} photo ${i + 1}">`;
    b.addEventListener("click", () => {
      main.src = url;
      thumbs.querySelectorAll("button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
    });
    thumbs.appendChild(b);
  });
}

function renderPrices(v) {
  const rows = SERVICE_TYPES.map((s) => {
    const p = servicePrice(v, s.key);
    return `<li><span>${escapeHtml(s.label)}</span><strong>${p ? `€ ${p.toLocaleString()}` : "On request"}</strong></li>`;
  }).join("");
  $("vdPrices").innerHTML = rows;

  const select = $("vdService");
  select.innerHTML = SERVICE_TYPES.map((s) => {
    const p = servicePrice(v, s.key);
    return `<option value="${s.key}">${escapeHtml(s.label)}${p ? ` – € ${p.toLocaleString()}` : " – price on request"}</option>`;
  }).join("");
  updateEstimate();
}

function updateEstimate() {
  if (!vehicle) return;
  const key = $("vdService").value;
  const p = servicePrice(vehicle, key);
  $("vdEstimate").textContent = p ? `€ ${p.toLocaleString()}` : "Price on request";
  $("vdDropoffWrap").style.display = key === "airport" || key === "custom" ? "block" : "none";
}

async function load() {
  if (!id) {
    $("vdLoading").innerHTML = `<h3>Vehicle not found</h3><p><a href="vehicles.html">See all vehicles</a></p>`;
    return;
  }

  try {
    const snap = await getDoc(doc(db, "vehicles", id));
    if (!snap.exists() || snap.data().active === false) {
      $("vdLoading").innerHTML = `<h3>This vehicle is not available</h3><p><a href="vehicles.html">See all vehicles</a></p>`;
      return;
    }

    vehicle = { id: snap.id, ...snap.data() };
    document.title = `${vehicle.name} with Chauffeur | Mautour Holidays`;

    $("vdCrumb").textContent = vehicle.name;
    $("vdCategory").textContent = vehicle.category || "Vehicle";
    $("vdTitle").textContent = vehicle.name;
    $("vdDescription").textContent = vehicle.description || "";
    $("vdCapacity").textContent = vehicle.capacity ? `Up to ${vehicle.capacity}` : "Ask us";
    $("vdLuggage").textContent = vehicle.luggage || "Ask us";
    const from = vehicleFromPrice(vehicle);
    $("vdFrom").textContent = from ? `From € ${from.toLocaleString()}` : "On request";
    $("vdFeatures").innerHTML = vehicleFeatures(vehicle).map((f) => `<li>${escapeHtml(f)}</li>`).join("");
    $("vdFormVehicle").textContent = vehicle.name;

    const pax = $("vdPassengers");
    if (vehicle.capacity) pax.max = Number(vehicle.capacity) || "";

    renderGallery(vehicle);
    renderPrices(vehicle);

    $("vdLoading").style.display = "none";
    $("vdContent").style.display = "grid";
  } catch (error) {
    console.error("Vehicle load error:", error);
    $("vdLoading").innerHTML = `<h3>Could not load this vehicle</h3><p>Please refresh the page or contact us on WhatsApp.</p>`;
  }
}

function setMinDate() {
  const d = new Date();
  const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $("vdDate").min = iso;
}

$("vdService").addEventListener("change", updateEstimate);

$("vdForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!vehicle) return;

  const v = (x) => $(x).value.trim();
  const data = {
    name: v("vdName"),
    email: v("vdEmail"),
    phone: v("vdPhone"),
    date: v("vdDate"),
    time: v("vdTime"),
    pickup: v("vdPickup"),
    dropoff: v("vdDropoff"),
    passengers: Number(v("vdPassengers") || 0),
    luggageCount: Number(v("vdBags") || 0),
    flight: v("vdFlight"),
    specialRequests: v("vdNotes")
  };
  const serviceKey = $("vdService").value;
  const service = SERVICE_TYPES.find((s) => s.key === serviceKey);
  const traveller = readTravellerFields("vd");

  if (!data.name || !data.email || !data.phone || !data.date || !data.time || !data.pickup || !data.passengers) {
    showMessage("Missing information", "Please fill in your name, email, phone, date, time, pick-up location and number of passengers.");
    return;
  }
  if (!travellerFieldsComplete(traveller)) {
    showMessage("Lead traveller details", "Please complete the lead traveller details – they are required by the Tourism Authority of Mauritius.");
    return;
  }
  if (vehicle.capacity && data.passengers > Number(vehicle.capacity)) {
    showMessage("Too many passengers", `This vehicle takes up to ${vehicle.capacity} passengers. Please choose a larger vehicle or contact us.`);
    return;
  }

  const btn = $("vdSubmit");
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Saving your request...";
  $("vdMessage").style.display = "none";

  const tab = openPendingTab();

  try {
    const price = servicePrice(vehicle, serviceKey);
    const bookingRef = await saveBooking(db, {
      type: "vehicle",
      package: `${vehicle.name} – ${service.label}`,
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      vehiclePrice: price,
      serviceType: service.label,
      estimatedFrom: price,
      people: data.passengers,
      ...data,
      ...traveller
    });

    const message = [
      "Hello Mautour Holidays,",
      "",
      `Booking reference: *${bookingRef}*`,
      "",
      "*VEHICLE BOOKING*",
      `${vehicle.name} (${vehicle.category || "Vehicle"})`,
      `Service: ${service.label}${price ? ` – from € ${price}` : ""}`,
      "",
      "*TRIP*",
      `Date: ${data.date} at ${data.time}`,
      `Pick-up: ${data.pickup}`,
      data.dropoff ? `Drop-off / itinerary: ${data.dropoff}` : "",
      data.flight ? `Flight: ${data.flight}` : "",
      `Passengers: ${data.passengers}${data.luggageCount ? ` · Bags: ${data.luggageCount}` : ""}`,
      "",
      "*CUSTOMER*",
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone}`,
      data.specialRequests ? `\n*NOTES*\n${data.specialRequests}` : "",
      "",
      "Please confirm availability and the final price. Thank you."
    ]
      .filter((l) => l !== "")
      .join("\n");

    const number = await getWhatsappNumber(db);
    const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    sendTabTo(tab, whatsappUrl);
    showBookingConfirmation({ bookingRef, whatsappUrl, title: "Vehicle request received" });
    $("vdForm").reset();
    updateEstimate();
  } catch (error) {
    console.error("Vehicle booking error:", error);
    if (tab && !tab.closed) tab.close();
    showMessage("Could not save your request", "Please try again, or message us on WhatsApp.");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
});

insertTravellerFields($("vdNotesLabel"), "vd");
setMinDate();
load();

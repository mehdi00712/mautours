import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const adminUIDs = [
  "d6IRCgOfwhZrKyRIoP6siAM8EOf2",
  "OeS88yW5sjSPxSk9kUlVjPeoZeY2"
];

const adminLoadingScreen = document.getElementById("adminLoadingScreen");
const adminContent = document.getElementById("adminContent");

const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popupTitle");
const popupMessage = document.getElementById("popupMessage");
const popupBtn = document.getElementById("popupBtn");
const logoutBtn = document.getElementById("logoutBtn");

let activityRows = [];

function showAdminContent() {
  if (adminLoadingScreen) adminLoadingScreen.style.display = "none";
  if (adminContent) adminContent.style.display = "block";
}

function hideAdminAndRedirect(url) {
  if (adminContent) adminContent.style.display = "none";
  window.location.replace(url);
}

function showPopup(title, message, redirect = null) {
  if (!popup || !popupTitle || !popupMessage || !popupBtn) {
    alert(`${title}\n\n${message}`);
    if (redirect) window.location.replace(redirect);
    return;
  }

  popupTitle.textContent = title;
  popupMessage.textContent = message;
  popup.classList.add("show");

  popupBtn.onclick = () => {
    popup.classList.remove("show");
    if (redirect) window.location.replace(redirect);
  };
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setMessage(id, message, isError = false) {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = message;
  el.style.color = isError ? "#dc2626" : "#071827";
  el.style.fontWeight = "700";
  el.style.marginTop = "14px";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toIncludesArray(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseActivities(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const name = parts[0] || "";
      const price = Number(parts[1] || 0);

      return {
        name,
        price: price > 0 ? price : 0,
        active: true
      };
    })
    .filter((activity) => activity.name);
}

function activitiesToText(activities) {
  if (!Array.isArray(activities)) return "";

  return activities
    .map((activity) => {
      const name = activity.name || "";
      const price = Number(activity.price || 0);
      return `${name} | ${price}`;
    })
    .join("\n");
}

function formatPrice(data) {
  const price = Number(data.price || 0);

  if (price <= 0 || data.priceType === "Custom Quote") return "Custom Quote";
  if (data.priceType === "Fixed") return `€ ${price.toLocaleString()}`;

  return `${data.priceType || "Starting From"} € ${price.toLocaleString()}`;
}

function clearFileInput(id) {
  const input = document.getElementById(id);
  if (input) input.value = "";
}

async function uploadFile(path, file) {
  if (!file) return "";

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fullPath = `${path}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, fullPath);

  const uploadResult = await uploadBytes(storageRef, file);
  return await getDownloadURL(uploadResult.ref);
}

async function uploadMultipleFiles(path, files) {
  if (!files || files.length === 0) return [];

  const uploads = [];

  for (const file of files) {
    const url = await uploadFile(path, file);
    if (url) uploads.push(url);
  }

  return uploads;
}

/* =========================
   EASIER PACKAGE UI
========================= */

function injectAdminBetterUiStyles() {
  if (document.getElementById("adminBetterUiStyles")) return;

  const style = document.createElement("style");
  style.id = "adminBetterUiStyles";
  style.textContent = `
    .activity-builder-box {
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 18px;
      box-shadow: 0 8px 22px rgba(7, 24, 39, 0.05);
    }

    .activity-builder-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }

    .activity-builder-header h4 {
      color: var(--darkblue);
      margin: 0;
      font-size: 1.1rem;
    }

    .activity-builder-header p {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 0.92rem;
    }

    .activity-add-btn {
      border: none;
      background: var(--gold);
      color: var(--darkblue);
      padding: 10px 16px;
      border-radius: 999px;
      font-weight: 900;
      cursor: pointer;
    }

    .activity-rows {
      display: grid;
      gap: 12px;
    }

    .activity-row {
      display: grid;
      grid-template-columns: 1fr 150px auto;
      gap: 10px;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 12px;
    }

    .activity-row input {
      width: 100%;
      min-height: 44px;
      border-radius: 10px;
      border: 1px solid #d1d5db;
      padding: 10px 12px;
      font-size: 0.95rem;
    }

    .activity-remove-btn {
      border: none;
      background: #fee2e2;
      color: #991b1b;
      border-radius: 12px;
      padding: 12px 14px;
      font-weight: 900;
      cursor: pointer;
    }

    .activity-empty-note {
      background: rgba(201, 162, 39, 0.12);
      border: 1px dashed rgba(201, 162, 39, 0.5);
      border-radius: 14px;
      padding: 14px;
      color: var(--muted);
      font-weight: 700;
    }

    .admin-options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin: 10px 0;
    }

    .admin-option-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      background: #ffffff;
      border: 2px solid #e5e7eb;
      border-radius: 18px;
      padding: 18px;
      cursor: pointer;
      transition: 0.25s ease;
    }

    .admin-option-card:hover {
      border-color: var(--gold);
      background: #fffdf5;
      transform: translateY(-2px);
    }

    .admin-option-card input {
      width: 22px !important;
      height: 22px;
      margin-top: 3px;
      accent-color: var(--gold);
      flex: 0 0 auto;
    }

    .admin-option-card strong {
      display: block;
      color: var(--darkblue);
      font-size: 1rem;
      margin-bottom: 5px;
    }

    .admin-option-card p {
      color: var(--muted);
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .admin-option-card:has(input:checked) {
      border-color: var(--gold);
      background: rgba(201, 162, 39, 0.1);
    }

    @media (max-width: 700px) {
      .activity-row {
        grid-template-columns: 1fr;
      }

      .admin-options {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

function addActivityRow(name = "", price = "") {
  const rowsBox = document.getElementById("activityRows");
  const emptyNote = document.getElementById("activityEmptyNote");
  if (!rowsBox) return;

  const rowId = `activity_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const row = document.createElement("div");
  row.className = "activity-row";
  row.dataset.rowId = rowId;

  row.innerHTML = `
    <input
      type="text"
      class="activity-name-input"
      placeholder="Activity name e.g. Lunch Buffet"
      value="${escapeHtml(name)}"
    />

    <input
      type="number"
      class="activity-price-input"
      placeholder="Price €"
      min="0"
      value="${price !== "" ? Number(price || 0) : ""}"
    />

    <button type="button" class="activity-remove-btn">
      Remove
    </button>
  `;

  rowsBox.appendChild(row);

  row.querySelector(".activity-name-input").addEventListener("input", syncActivitiesTextarea);
  row.querySelector(".activity-price-input").addEventListener("input", syncActivitiesTextarea);

  row.querySelector(".activity-remove-btn").addEventListener("click", () => {
    row.remove();
    syncActivitiesTextarea();
    toggleActivityEmptyNote();
  });

  activityRows.push(rowId);
  toggleActivityEmptyNote();
  syncActivitiesTextarea();
}

function toggleActivityEmptyNote() {
  const rowsBox = document.getElementById("activityRows");
  const emptyNote = document.getElementById("activityEmptyNote");

  if (!rowsBox || !emptyNote) return;

  const hasRows = rowsBox.querySelectorAll(".activity-row").length > 0;
  emptyNote.style.display = hasRows ? "none" : "block";
}

function syncActivitiesTextarea() {
  const textarea = document.getElementById("tripActivities");
  const rowsBox = document.getElementById("activityRows");

  if (!textarea || !rowsBox) return;

  const lines = [];

  rowsBox.querySelectorAll(".activity-row").forEach((row) => {
    const name = row.querySelector(".activity-name-input")?.value.trim() || "";
    const price = Number(row.querySelector(".activity-price-input")?.value || 0);

    if (name) {
      lines.push(`${name} | ${price > 0 ? price : 0}`);
    }
  });

  textarea.value = lines.join("\n");
}

function loadActivitiesIntoBuilder(activitiesText = "") {
  const rowsBox = document.getElementById("activityRows");
  if (!rowsBox) return;

  rowsBox.innerHTML = "";
  activityRows = [];

  const activities = parseActivities(activitiesText);

  activities.forEach((activity) => {
    addActivityRow(activity.name, activity.price);
  });

  toggleActivityEmptyNote();
  syncActivitiesTextarea();
}

function enhanceActivitiesInput() {
  const textarea = document.getElementById("tripActivities");
  if (!textarea) return;

  if (document.getElementById("activityBuilderBox")) return;

  textarea.style.display = "none";

  const wrapper = document.createElement("div");
  wrapper.id = "activityBuilderBox";
  wrapper.className = "activity-builder-box";

  wrapper.innerHTML = `
    <div class="activity-builder-header">
      <div>
        <h4>Optional Activities</h4>
        <p>Add activities customers can tick when booking. Leave empty if this package has no optional activities.</p>
      </div>

      <button type="button" id="addActivityBtn" class="activity-add-btn">
        + Add Activity
      </button>
    </div>

    <div id="activityEmptyNote" class="activity-empty-note">
      No optional activities added yet.
    </div>

    <div id="activityRows" class="activity-rows"></div>
  `;

  textarea.parentElement.appendChild(wrapper);

  document.getElementById("addActivityBtn").addEventListener("click", () => {
    addActivityRow();
  });

  loadActivitiesIntoBuilder(textarea.value);
}

function enhancePackageCheckboxes() {
  const featured = document.getElementById("tripFeatured");
  const requiresVehicle = document.getElementById("tripRequiresVehicle");

  if (!featured || !requiresVehicle) return;
  if (document.getElementById("adminPackageOptions")) return;

  const featuredLabel = featured.closest("label");
  const vehicleLabel = requiresVehicle.closest("label");

  if (!featuredLabel || !vehicleLabel) return;

  const optionsBox = document.createElement("div");
  optionsBox.id = "adminPackageOptions";
  optionsBox.className = "admin-options";

  const featuredCard = document.createElement("label");
  featuredCard.className = "admin-option-card";
  featuredCard.innerHTML = `
    <input type="checkbox" id="tripFeaturedNew" />
    <div>
      <strong>⭐ Featured Package</strong>
      <p>Show this package on the homepage Featured Packages section.</p>
    </div>
  `;

  const vehicleCard = document.createElement("label");
  vehicleCard.className = "admin-option-card";
  vehicleCard.innerHTML = `
    <input type="checkbox" id="tripRequiresVehicleNew" />
    <div>
      <strong>🚐 Vehicle Required</strong>
      <p>Customer must choose one of your vehicles for this package.</p>
    </div>
  `;

  optionsBox.appendChild(featuredCard);
  optionsBox.appendChild(vehicleCard);

  vehicleLabel.after(optionsBox);

  featuredLabel.style.display = "none";
  vehicleLabel.style.display = "none";

  const featuredNew = document.getElementById("tripFeaturedNew");
  const requiresVehicleNew = document.getElementById("tripRequiresVehicleNew");

  featuredNew.checked = featured.checked;
  requiresVehicleNew.checked = requiresVehicle.checked;

  featuredNew.addEventListener("change", () => {
    featured.checked = featuredNew.checked;
  });

  requiresVehicleNew.addEventListener("change", () => {
    requiresVehicle.checked = requiresVehicleNew.checked;
  });
}

function syncNewCheckboxCards() {
  const featured = document.getElementById("tripFeatured");
  const requiresVehicle = document.getElementById("tripRequiresVehicle");
  const featuredNew = document.getElementById("tripFeaturedNew");
  const requiresVehicleNew = document.getElementById("tripRequiresVehicleNew");

  if (featured && featuredNew) featuredNew.checked = featured.checked;
  if (requiresVehicle && requiresVehicleNew) requiresVehicleNew.checked = requiresVehicle.checked;
}

function resetNewCheckboxCards() {
  const featured = document.getElementById("tripFeatured");
  const requiresVehicle = document.getElementById("tripRequiresVehicle");
  const featuredNew = document.getElementById("tripFeaturedNew");
  const requiresVehicleNew = document.getElementById("tripRequiresVehicleNew");

  if (featured) featured.checked = false;
  if (requiresVehicle) requiresVehicle.checked = false;
  if (featuredNew) featuredNew.checked = false;
  if (requiresVehicleNew) requiresVehicleNew.checked = false;
}

function enhanceAdminFormUI() {
  injectAdminBetterUiStyles();
  enhanceActivitiesInput();
  enhancePackageCheckboxes();
}

/* =========================
   AUTH GUARD - NO ADMIN GLIMPSE
========================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    hideAdminAndRedirect("login.html");
    return;
  }

  if (!adminUIDs.includes(user.uid)) {
    await signOut(auth);
    hideAdminAndRedirect("index.html");
    return;
  }

  showAdminContent();
  enhanceAdminFormUI();

  loadWebsiteSettings();
  loadHomepageContent();
  loadVehicles();
  loadTrips();
  loadGalleryImages();
  loadBookings();
});

/* =========================
   WEBSITE SETTINGS
========================= */

const websiteSettingsForm = document.getElementById("websiteSettingsForm");

if (websiteSettingsForm) {
  websiteSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      setMessage("settingsMessage", "Saving website settings...");

      await setDoc(
        doc(db, "siteContent", "settings"),
        {
          businessName: document.getElementById("businessName")?.value.trim() || "",
          whatsappNumber: document.getElementById("whatsappNumber")?.value.trim() || "",
          mobileNumber: document.getElementById("mobileNumber")?.value.trim() || "",
          businessEmail: document.getElementById("businessEmail")?.value.trim() || "",
          servedRegions: document.getElementById("servedRegions")?.value.trim() || "",
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      setMessage("settingsMessage", "Website settings saved successfully.");
      showPopup("Saved", "Website settings have been updated.");
    } catch (error) {
      setMessage("settingsMessage", error.message || "Failed to save website settings.", true);
      showPopup("Settings Error", error.message || "Failed to save website settings.");
    }
  });
}

async function loadWebsiteSettings() {
  try {
    const snap = await getDoc(doc(db, "siteContent", "settings"));
    if (!snap.exists()) return;

    const data = snap.data();

    if (document.getElementById("businessName")) {
      document.getElementById("businessName").value = data.businessName || "";
    }

    if (document.getElementById("whatsappNumber")) {
      document.getElementById("whatsappNumber").value = data.whatsappNumber || "";
    }

    if (document.getElementById("mobileNumber")) {
      document.getElementById("mobileNumber").value = data.mobileNumber || "";
    }

    if (document.getElementById("businessEmail")) {
      document.getElementById("businessEmail").value = data.businessEmail || "";
    }

    if (document.getElementById("servedRegions")) {
      document.getElementById("servedRegions").value = data.servedRegions || "";
    }
  } catch (error) {
    console.error("Load Settings Error:", error);
  }
}

/* =========================
   HOMEPAGE
========================= */

const homeContentForm = document.getElementById("homeContentForm");

if (homeContentForm) {
  homeContentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = document.getElementById("homeHeroImage")?.files[0];

    try {
      setMessage("homeContentMessage", "Saving homepage...");

      const payload = {
        heroTitle: document.getElementById("homeHeroTitle")?.value.trim() || "",
        heroSubtitle: document.getElementById("homeHeroSubtitle")?.value.trim() || "",
        heroBadge: document.getElementById("homeBadge")?.value.trim() || "",
        ctaText: document.getElementById("homeCtaText")?.value.trim() || "",
        updatedAt: serverTimestamp()
      };

      if (file) {
        payload.heroImageUrl = await uploadFile("site_images", file);
      }

      await setDoc(doc(db, "siteContent", "homepage"), payload, { merge: true });

      clearFileInput("homeHeroImage");
      setMessage("homeContentMessage", "Homepage saved successfully.");
      showPopup("Saved", "Homepage content has been updated.");
    } catch (error) {
      setMessage("homeContentMessage", error.message || "Failed to save homepage.", true);
      showPopup("Homepage Error", error.message || "Failed to save homepage.");
    }
  });
}

async function loadHomepageContent() {
  try {
    const snap = await getDoc(doc(db, "siteContent", "homepage"));
    if (!snap.exists()) return;

    const data = snap.data();

    if (document.getElementById("homeHeroTitle")) {
      document.getElementById("homeHeroTitle").value = data.heroTitle || "";
    }

    if (document.getElementById("homeHeroSubtitle")) {
      document.getElementById("homeHeroSubtitle").value = data.heroSubtitle || "";
    }

    if (document.getElementById("homeBadge")) {
      document.getElementById("homeBadge").value = data.heroBadge || "";
    }

    if (document.getElementById("homeCtaText")) {
      document.getElementById("homeCtaText").value = data.ctaText || "";
    }
  } catch (error) {
    console.error("Load Homepage Error:", error);
  }
}

/* =========================
   PACKAGE VEHICLES
========================= */

const vehicleForm = document.getElementById("vehicleForm");
const resetVehicleForm = document.getElementById("resetVehicleForm");
const adminVehiclesList = document.getElementById("adminVehiclesList");

if (vehicleForm) {
  vehicleForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const vehicleId = document.getElementById("vehicleId")?.value.trim();
    const imageFile = document.getElementById("vehicleImage")?.files[0];
    const galleryFiles = document.getElementById("vehicleGalleryImages")?.files || [];

    try {
      setMessage("vehicleMessage", "Saving vehicle...");

      const vehicleRef = vehicleId
        ? doc(db, "vehicles", vehicleId)
        : doc(collection(db, "vehicles"));

      const payload = {
        name: document.getElementById("vehicleName")?.value.trim() || "",
        category: document.getElementById("vehicleCategory")?.value || "",
        capacity: Number(document.getElementById("vehicleCapacity")?.value || 0),
        price: Number(document.getElementById("vehiclePrice")?.value || 0),
        description: document.getElementById("vehicleDescription")?.value.trim() || "",
        active: document.getElementById("vehicleActive")?.checked || false,
        updatedAt: serverTimestamp()
      };

      if (!payload.name || !payload.category || payload.capacity < 1) {
        throw new Error("Please enter vehicle name, category and passenger capacity.");
      }

      if (payload.price < 0) {
        throw new Error("Vehicle price cannot be negative.");
      }

      if (!vehicleId) {
        payload.createdAt = serverTimestamp();
      }

      if (imageFile) {
        payload.imageUrl = await uploadFile(`vehicle_images/${vehicleRef.id}`, imageFile);
      }

      if (galleryFiles.length > 0) {
        const newGalleryImages = await uploadMultipleFiles(
          `vehicle_gallery_images/${vehicleRef.id}`,
          galleryFiles
        );

        if (vehicleId) {
          const oldSnap = await getDoc(vehicleRef);

          const oldImages =
            oldSnap.exists() && Array.isArray(oldSnap.data().vehicleGalleryImages)
              ? oldSnap.data().vehicleGalleryImages
              : [];

          payload.vehicleGalleryImages = [...oldImages, ...newGalleryImages];
        } else {
          payload.vehicleGalleryImages = newGalleryImages;
        }
      }

      await setDoc(vehicleRef, payload, { merge: true });

      vehicleForm.reset();

      if (document.getElementById("vehicleId")) {
        document.getElementById("vehicleId").value = "";
      }

      if (document.getElementById("vehicleActive")) {
        document.getElementById("vehicleActive").checked = true;
      }

      clearFileInput("vehicleImage");
      clearFileInput("vehicleGalleryImages");

      setMessage("vehicleMessage", "Vehicle saved successfully.");
      showPopup("Vehicle Saved", "Vehicle saved for package selection.");
      loadVehicles();
    } catch (error) {
      setMessage("vehicleMessage", error.message || "Failed to save vehicle.", true);
      showPopup("Vehicle Error", error.message || "Failed to save vehicle.");
    }
  });
}

if (resetVehicleForm) {
  resetVehicleForm.addEventListener("click", () => {
    vehicleForm.reset();

    if (document.getElementById("vehicleId")) {
      document.getElementById("vehicleId").value = "";
    }

    if (document.getElementById("vehicleActive")) {
      document.getElementById("vehicleActive").checked = true;
    }

    clearFileInput("vehicleImage");
    clearFileInput("vehicleGalleryImages");

    setMessage("vehicleMessage", "Vehicle form cleared.");
  });
}

async function loadVehicles() {
  if (!adminVehiclesList) return;

  adminVehiclesList.innerHTML = `<p>Loading vehicles...</p>`;

  try {
    const q = query(collection(db, "vehicles"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      adminVehiclesList.innerHTML = `<p>No vehicles added yet.</p>`;
      return;
    }

    adminVehiclesList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const vehicleId = docSnap.id;

      const galleryCount = Array.isArray(data.vehicleGalleryImages)
        ? data.vehicleGalleryImages.length
        : 0;

      const card = document.createElement("div");
      card.className = "admin-trip-card";

      card.innerHTML = `
        <h4>${escapeHtml(data.name || "Unnamed Vehicle")}</h4>
        <p><strong>Category:</strong> ${escapeHtml(data.category || "-")}</p>
        <p><strong>Capacity:</strong> ${Number(data.capacity || 0)} passengers</p>
        <p><strong>Vehicle Price:</strong> € ${Number(data.price || 0).toLocaleString()}</p>
        <p><strong>Status:</strong> ${data.active === false ? "Unavailable" : "Available For Packages"}</p>
        <p><strong>Extra Pictures:</strong> ${galleryCount}</p>
        <p>${escapeHtml(data.description || "")}</p>

        ${
          data.imageUrl
            ? `<img src="${escapeHtml(data.imageUrl)}" alt="${escapeHtml(data.name)}" style="width:100%;max-height:190px;object-fit:cover;border-radius:14px;">`
            : ""
        }

        <div class="admin-trip-actions">
          <button class="edit-vehicle-btn" data-id="${vehicleId}">Edit</button>
          <button class="toggle-vehicle-btn" data-id="${vehicleId}" data-active="${data.active !== false}">
            ${data.active === false ? "Make Available" : "Make Unavailable"}
          </button>
          <button class="clear-vehicle-gallery-btn" data-id="${vehicleId}">Clear Extra Pictures</button>
          <button class="delete-vehicle-btn" data-id="${vehicleId}">Delete</button>
        </div>
      `;

      adminVehiclesList.appendChild(card);
    });

    bindVehicleButtons(snapshot);
  } catch (error) {
    adminVehiclesList.innerHTML = `
      <p style="color:red;">Failed to load vehicles: ${escapeHtml(error.message)}</p>
    `;
  }
}

function bindVehicleButtons(snapshot) {
  document.querySelectorAll(".edit-vehicle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const snap = snapshot.docs.find((d) => d.id === btn.dataset.id);
      if (!snap) return;

      const data = snap.data();

      document.getElementById("vehicleId").value = snap.id;
      document.getElementById("vehicleName").value = data.name || "";
      document.getElementById("vehicleCategory").value = data.category || "";
      document.getElementById("vehicleCapacity").value = data.capacity || 0;
      document.getElementById("vehiclePrice").value = data.price || 0;
      document.getElementById("vehicleDescription").value = data.description || "";

      if (document.getElementById("vehicleActive")) {
        document.getElementById("vehicleActive").checked = data.active !== false;
      }

      setMessage("vehicleMessage", "Editing vehicle for package selection. Add more pictures if needed, then click Save Vehicle.");
      vehicleForm.scrollIntoView({ behavior: "smooth" });
    });
  });

  document.querySelectorAll(".toggle-vehicle-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const active = btn.dataset.active === "true";

        await updateDoc(doc(db, "vehicles", btn.dataset.id), {
          active: !active,
          updatedAt: serverTimestamp()
        });

        showPopup(
          "Vehicle Updated",
          active
            ? "Vehicle unavailable for package selection."
            : "Vehicle available for package selection."
        );

        loadVehicles();
      } catch (error) {
        showPopup("Vehicle Error", error.message || "Could not update vehicle.");
      }
    });
  });

  document.querySelectorAll(".clear-vehicle-gallery-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Remove all extra pictures from this vehicle?")) return;

      try {
        await updateDoc(doc(db, "vehicles", btn.dataset.id), {
          vehicleGalleryImages: [],
          updatedAt: serverTimestamp()
        });

        showPopup("Gallery Cleared", "Extra vehicle pictures removed.");
        loadVehicles();
      } catch (error) {
        showPopup("Gallery Error", error.message || "Could not clear vehicle pictures.");
      }
    });
  });

  document.querySelectorAll(".delete-vehicle-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this vehicle permanently?")) return;

      try {
        await deleteDoc(doc(db, "vehicles", btn.dataset.id));
        showPopup("Vehicle Deleted", "Vehicle removed.");
        loadVehicles();
      } catch (error) {
        showPopup("Delete Error", error.message || "Could not delete vehicle.");
      }
    });
  });
}

/* =========================
   PACKAGES
========================= */

const tripForm = document.getElementById("tripForm");
const resetTripForm = document.getElementById("resetTripForm");
const adminTripsList = document.getElementById("adminTripsList");

if (tripForm) {
  tripForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    syncActivitiesTextarea();

    const tripId = document.getElementById("tripId")?.value.trim();
    const imageFile = document.getElementById("tripImage")?.files[0];
    const galleryFiles = document.getElementById("tripGalleryImages")?.files || [];

    try {
      setMessage("tripMessage", "Saving package...");

      const tripRef = tripId
        ? doc(db, "trips", tripId)
        : doc(collection(db, "trips"));

      const activities = parseActivities(
        document.getElementById("tripActivities")?.value
      );

      const payload = {
        title: document.getElementById("tripTitle")?.value.trim() || "",
        category: document.getElementById("tripCategory")?.value || "",
        description: document.getElementById("tripDescription")?.value.trim() || "",
        fullDetails: document.getElementById("tripFullDetails")?.value.trim() || "",
        duration: document.getElementById("tripDuration")?.value.trim() || "",
        price: Number(document.getElementById("tripPrice")?.value || 0),
        priceType: document.getElementById("tripPriceType")?.value || "Custom Quote",
        includes: toIncludesArray(document.getElementById("tripIncludes")?.value),
        activities,
        featured: document.getElementById("tripFeatured")?.checked || false,
        requiresVehicle: document.getElementById("tripRequiresVehicle")?.checked || false,
        active: true,
        updatedAt: serverTimestamp()
      };

      if (!payload.title || !payload.category || !payload.description || !payload.duration) {
        throw new Error("Please fill in all required package fields.");
      }

      if (payload.price < 0) {
        throw new Error("Package price cannot be negative.");
      }

      if (!tripId) {
        payload.createdAt = serverTimestamp();
      }

      if (imageFile) {
        payload.imageUrl = await uploadFile(`trip_images/${tripRef.id}`, imageFile);
      }

      if (galleryFiles.length > 0) {
        const newGalleryImages = await uploadMultipleFiles(
          `trip_gallery_images/${tripRef.id}`,
          galleryFiles
        );

        if (tripId) {
          const oldSnap = await getDoc(tripRef);

          const oldImages =
            oldSnap.exists() && Array.isArray(oldSnap.data().galleryImages)
              ? oldSnap.data().galleryImages
              : [];

          payload.galleryImages = [...oldImages, ...newGalleryImages];
        } else {
          payload.galleryImages = newGalleryImages;
        }
      }

      await setDoc(tripRef, payload, { merge: true });

      tripForm.reset();

      if (document.getElementById("tripId")) document.getElementById("tripId").value = "";

      resetNewCheckboxCards();
      loadActivitiesIntoBuilder("");

      clearFileInput("tripImage");
      clearFileInput("tripGalleryImages");

      setMessage("tripMessage", "Package saved successfully.");
      showPopup("Package Saved", "Package saved with optional activities.");
      loadTrips();
    } catch (error) {
      setMessage("tripMessage", error.message || "Failed to save package.", true);
      showPopup("Package Error", error.message || "Failed to save package.");
    }
  });
}

if (resetTripForm) {
  resetTripForm.addEventListener("click", () => {
    tripForm.reset();

    if (document.getElementById("tripId")) document.getElementById("tripId").value = "";

    resetNewCheckboxCards();
    loadActivitiesIntoBuilder("");

    clearFileInput("tripImage");
    clearFileInput("tripGalleryImages");

    setMessage("tripMessage", "Package form cleared.");
  });
}

async function loadTrips() {
  if (!adminTripsList) return;

  adminTripsList.innerHTML = `<p>Loading packages...</p>`;

  try {
    const q = query(collection(db, "trips"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      adminTripsList.innerHTML = `<p>No packages added yet.</p>`;
      return;
    }

    adminTripsList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const tripId = docSnap.id;

      const galleryCount = Array.isArray(data.galleryImages) ? data.galleryImages.length : 0;
      const activitiesCount = Array.isArray(data.activities) ? data.activities.length : 0;

      const vehicleText = data.requiresVehicle === true
        ? "Vehicle Required"
        : "No Vehicle Needed";

      const activitiesHtml = Array.isArray(data.activities) && data.activities.length > 0
        ? `
          <div style="margin-top:8px;">
            <strong>Optional Activities:</strong>
            <ul style="margin:8px 0 0 18px;">
              ${data.activities
                .map((activity) => `
                  <li>
                    ${escapeHtml(activity.name)} — € ${Number(activity.price || 0).toLocaleString()}
                  </li>
                `)
                .join("")}
            </ul>
          </div>
        `
        : `<p><strong>Optional Activities:</strong> 0</p>`;

      const card = document.createElement("div");
      card.className = "admin-trip-card";

      card.innerHTML = `
        <h4>${escapeHtml(data.title || "Untitled Package")}</h4>

        <p><strong>Category:</strong> ${escapeHtml(data.category || "-")}</p>
        <p><strong>Duration:</strong> ${escapeHtml(data.duration || "-")}</p>
        <p><strong>Price:</strong> ${escapeHtml(formatPrice(data))}</p>
        <p><strong>Status:</strong> ${data.active ? "Active" : "Disabled"}</p>
        <p><strong>Featured:</strong> ${data.featured ? "Yes" : "No"}</p>
        <p><strong>Vehicle:</strong> ${escapeHtml(vehicleText)}</p>
        <p><strong>Extra Pictures:</strong> ${galleryCount}</p>
        <p><strong>Activities Count:</strong> ${activitiesCount}</p>
        ${activitiesHtml}

        ${
          data.imageUrl
            ? `<img src="${escapeHtml(data.imageUrl)}" alt="${escapeHtml(data.title)}" style="width:100%;max-height:180px;object-fit:cover;border-radius:14px;">`
            : ""
        }

        <div class="admin-trip-actions">
          <button class="edit-trip-btn" data-id="${tripId}">Edit</button>
          <button class="toggle-trip-btn" data-id="${tripId}" data-active="${data.active}">
            ${data.active ? "Disable" : "Enable"}
          </button>
          <button class="toggle-featured-trip-btn" data-id="${tripId}" data-featured="${data.featured === true}">
            ${data.featured ? "Remove Featured" : "Make Featured"}
          </button>
          <button class="clear-trip-gallery-btn" data-id="${tripId}">Clear Extra Pictures</button>
          <button class="delete-trip-btn" data-id="${tripId}">Delete</button>
        </div>
      `;

      adminTripsList.appendChild(card);
    });

    bindTripButtons(snapshot);
  } catch (error) {
    adminTripsList.innerHTML = `
      <p style="color:red;">Failed to load packages: ${escapeHtml(error.message)}</p>
    `;
  }
}

function bindTripButtons(snapshot) {
  document.querySelectorAll(".edit-trip-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const snap = snapshot.docs.find((d) => d.id === btn.dataset.id);
      if (!snap) return;

      const data = snap.data();

      document.getElementById("tripId").value = snap.id;
      document.getElementById("tripTitle").value = data.title || "";
      document.getElementById("tripCategory").value = data.category || "";
      document.getElementById("tripDescription").value = data.description || "";
      document.getElementById("tripFullDetails").value = data.fullDetails || "";
      document.getElementById("tripDuration").value = data.duration || "";
      document.getElementById("tripPrice").value = data.price || 0;
      document.getElementById("tripPriceType").value = data.priceType || "Custom Quote";

      document.getElementById("tripIncludes").value = Array.isArray(data.includes)
        ? data.includes.join("\n")
        : "";

      const activitiesText = activitiesToText(data.activities);

      if (document.getElementById("tripActivities")) {
        document.getElementById("tripActivities").value = activitiesText;
      }

      loadActivitiesIntoBuilder(activitiesText);

      if (document.getElementById("tripFeatured")) {
        document.getElementById("tripFeatured").checked = data.featured === true;
      }

      if (document.getElementById("tripRequiresVehicle")) {
        document.getElementById("tripRequiresVehicle").checked = data.requiresVehicle === true;
      }

      syncNewCheckboxCards();

      setMessage("tripMessage", "Editing package. Change activities if needed, then click Save Package.");
      tripForm.scrollIntoView({ behavior: "smooth" });
    });
  });

  document.querySelectorAll(".toggle-trip-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const active = btn.dataset.active === "true";

        await updateDoc(doc(db, "trips", btn.dataset.id), {
          active: !active,
          updatedAt: serverTimestamp()
        });

        showPopup("Package Updated", active ? "Package disabled." : "Package enabled.");
        loadTrips();
      } catch (error) {
        showPopup("Package Error", error.message || "Could not update package.");
      }
    });
  });

  document.querySelectorAll(".toggle-featured-trip-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const featured = btn.dataset.featured === "true";

        await updateDoc(doc(db, "trips", btn.dataset.id), {
          featured: !featured,
          updatedAt: serverTimestamp()
        });

        showPopup("Featured Updated", featured ? "Removed from homepage." : "Shown on homepage.");
        loadTrips();
      } catch (error) {
        showPopup("Featured Error", error.message || "Could not update featured status.");
      }
    });
  });

  document.querySelectorAll(".clear-trip-gallery-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Remove all extra pictures from this package?")) return;

      try {
        await updateDoc(doc(db, "trips", btn.dataset.id), {
          galleryImages: [],
          updatedAt: serverTimestamp()
        });

        showPopup("Gallery Cleared", "Extra package pictures removed.");
        loadTrips();
      } catch (error) {
        showPopup("Gallery Error", error.message || "Could not clear package pictures.");
      }
    });
  });

  document.querySelectorAll(".delete-trip-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this package permanently?")) return;

      try {
        await deleteDoc(doc(db, "trips", btn.dataset.id));
        showPopup("Package Deleted", "Package removed.");
        loadTrips();
      } catch (error) {
        showPopup("Delete Error", error.message || "Could not delete package.");
      }
    });
  });
}

/* =========================
   GALLERY
========================= */

const galleryForm = document.getElementById("galleryForm");
const galleryImagesList = document.getElementById("galleryImagesList");

if (galleryForm) {
  galleryForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("galleryTitle")?.value.trim();
    const category = document.getElementById("galleryCategory")?.value;
    const file = document.getElementById("galleryImage")?.files[0];

    if (!title || !category || !file) {
      setMessage("galleryMessage", "Please fill in all gallery fields.", true);
      return;
    }

    try {
      setMessage("galleryMessage", "Uploading gallery image...");

      const imageUrl = await uploadFile(`gallery_images/${category}`, file);

      await addDoc(collection(db, "gallery"), {
        title,
        category,
        imageUrl,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      galleryForm.reset();

      setMessage("galleryMessage", "Gallery image uploaded.");
      showPopup("Gallery Saved", "Gallery image uploaded successfully.");
      loadGalleryImages();
    } catch (error) {
      setMessage("galleryMessage", error.message || "Failed to upload gallery image.", true);
      showPopup("Gallery Error", error.message || "Failed to upload gallery image.");
    }
  });
}

async function loadGalleryImages() {
  if (!galleryImagesList) return;

  galleryImagesList.innerHTML = `<p>Loading gallery images...</p>`;

  try {
    const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      galleryImagesList.innerHTML = `<p>No gallery images uploaded yet.</p>`;
      return;
    }

    galleryImagesList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const card = document.createElement("div");
      card.className = "admin-trip-card";

      card.innerHTML = `
        <h4>${escapeHtml(data.title || "Gallery Image")}</h4>
        <p><strong>Category:</strong> ${escapeHtml(data.category || "-")}</p>
        <p><strong>Status:</strong> ${data.active ? "Active" : "Disabled"}</p>

        ${
          data.imageUrl
            ? `<img src="${escapeHtml(data.imageUrl)}" alt="${escapeHtml(data.title)}" style="width:100%;max-height:180px;object-fit:cover;border-radius:14px;">`
            : ""
        }

        <div class="admin-trip-actions">
          <button class="toggle-gallery-btn" data-id="${docSnap.id}" data-active="${data.active}">
            ${data.active ? "Disable" : "Enable"}
          </button>
          <button class="delete-gallery-btn" data-id="${docSnap.id}">Delete</button>
        </div>
      `;

      galleryImagesList.appendChild(card);
    });

    bindGalleryButtons();
  } catch (error) {
    galleryImagesList.innerHTML = `
      <p style="color:red;">Failed to load gallery images: ${escapeHtml(error.message)}</p>
    `;
  }
}

function bindGalleryButtons() {
  document.querySelectorAll(".toggle-gallery-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const active = btn.dataset.active === "true";

        await updateDoc(doc(db, "gallery", btn.dataset.id), {
          active: !active,
          updatedAt: serverTimestamp()
        });

        showPopup("Gallery Updated", active ? "Image disabled." : "Image enabled.");
        loadGalleryImages();
      } catch (error) {
        showPopup("Gallery Error", error.message || "Could not update gallery image.");
      }
    });
  });

  document.querySelectorAll(".delete-gallery-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this gallery image?")) return;

      try {
        await deleteDoc(doc(db, "gallery", btn.dataset.id));
        showPopup("Image Deleted", "Gallery image removed.");
        loadGalleryImages();
      } catch (error) {
        showPopup("Delete Error", error.message || "Could not delete gallery image.");
      }
    });
  });
}

/* =========================
   REJECT BOOKING MODAL
========================= */

let selectedRejectBookingId = null;

const rejectModal = document.getElementById("rejectModal");
const closeRejectModal = document.getElementById("closeRejectModal");
const rejectReasonInput = document.getElementById("rejectReasonInput");
const confirmRejectBtn = document.getElementById("confirmRejectBtn");

function openRejectModal(bookingId) {
  selectedRejectBookingId = bookingId;

  if (rejectReasonInput) {
    rejectReasonInput.value = "";
  }

  if (rejectModal) {
    rejectModal.classList.add("show");
  }
}

function closeRejectBox() {
  selectedRejectBookingId = null;

  if (rejectModal) {
    rejectModal.classList.remove("show");
  }
}

if (closeRejectModal) {
  closeRejectModal.addEventListener("click", closeRejectBox);
}

if (rejectModal) {
  rejectModal.addEventListener("click", (e) => {
    if (e.target === rejectModal) closeRejectBox();
  });
}

if (confirmRejectBtn) {
  confirmRejectBtn.addEventListener("click", async () => {
    try {
      const reason = rejectReasonInput?.value.trim() || "";

      if (!selectedRejectBookingId) {
        showPopup("Reject Error", "No booking selected.");
        return;
      }

      if (!reason) {
        showPopup("Reason Required", "Please enter a rejection reason.");
        return;
      }

      await updateDoc(doc(db, "bookings", selectedRejectBookingId), {
        bookingStatus: "Rejected",
        paymentStatus: "Rejected",
        adminDecision: "Rejected",
        rejectionReason: reason,
        customerMessage: `Your booking was rejected. Reason: ${reason}`,
        customerMessageType: "booking_rejected",
        messageSeenByCustomer: false,
        updatedAt: serverTimestamp()
      });

      closeRejectBox();

      showPopup(
        "Booking Rejected",
        "The rejection reason has been saved for the customer."
      );

      loadBookings();
    } catch (error) {
      showPopup("Reject Error", error.message || "Could not reject booking.");
    }
  });
}

/* =========================
   BOOKINGS
========================= */

async function loadBookings() {
  const tableBody = document.querySelector("#bookingsTable tbody");
  const revenueFill = document.getElementById("revenueFill");
  const revenueValue = document.getElementById("revenueValue");

  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="11">Loading bookings...</td></tr>`;

  try {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    tableBody.innerHTML = "";

    let totalRevenue = 0;
    let totalBookings = 0;
    let pendingBookings = 0;
    let confirmedBookings = 0;
    let rejectedBookings = 0;

    if (snapshot.empty) {
      tableBody.innerHTML = `<tr><td colspan="11">No bookings found.</td></tr>`;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const bookingId = docSnap.id;

      totalBookings++;

      if (data.bookingStatus === "Confirmed") {
        confirmedBookings++;
        totalRevenue += Number(data.totalPrice || 0);
      } else if (data.bookingStatus === "Rejected") {
        rejectedBookings++;
      } else {
        pendingBookings++;
      }

      const typeText = "Package Booking";
      const packageText = data.package || "-";

      const vehicleText = data.vehicleName
        ? `${data.vehicleName} / € ${Number(data.vehiclePrice || 0).toLocaleString()}`
        : "-";

      const dateText = data.bookingPeriod || `${data.startDate || data.date || "-"} → ${data.endDate || "-"}`;

      const peopleText = data.people || data.passengers || "-";

      const activitiesText =
        Array.isArray(data.selectedActivities) && data.selectedActivities.length > 0
          ? data.selectedActivities.map((a) => `${a.name} (€ ${Number(a.price || 0).toLocaleString()})`).join(", ")
          : "-";

      const total =
        data.totalPrice && data.totalPrice > 0
          ? `€ ${Number(data.totalPrice).toLocaleString()}`
          : "Custom Quote";

      const proofLink = data.paymentProofUrl
        ? `<a href="${escapeHtml(data.paymentProofUrl)}" target="_blank" class="proof-link">View Proof</a>`
        : "No Proof";

      const statusText = data.bookingStatus || "Pending";

      const reasonText =
        data.bookingStatus === "Rejected" && data.rejectionReason
          ? `<br><small style="color:#b45309;font-weight:800;">Reason: ${escapeHtml(data.rejectionReason)}</small>`
          : "";

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${escapeHtml(data.name || "-")}<br><small>${escapeHtml(typeText)}</small></td>
        <td>${escapeHtml(data.phone || "-")}</td>
        <td>${escapeHtml(data.email || "-")}</td>
        <td>
          ${escapeHtml(packageText)}
          <br><small><strong>Activities:</strong> ${escapeHtml(activitiesText)}</small>
        </td>
        <td>${escapeHtml(vehicleText)}</td>
        <td>${escapeHtml(dateText)}</td>
        <td>${escapeHtml(peopleText)}</td>
        <td><strong>${total}</strong></td>
        <td>${proofLink}</td>
        <td>${escapeHtml(statusText)}${reasonText}</td>
        <td>
          <button class="approve-btn" data-id="${bookingId}">Approve</button>
          <button class="reject-btn" data-id="${bookingId}">Reject</button>
          <button class="delete-btn" data-id="${bookingId}">Delete</button>
        </td>
      `;

      tableBody.appendChild(row);
    });

    if (revenueValue) {
      revenueValue.textContent = `€ ${totalRevenue.toLocaleString()}`;
    }

    if (revenueFill) {
      const cappedRevenue = Math.min(totalRevenue, 200000);
      revenueFill.style.width = `${(cappedRevenue / 200000) * 100}%`;
    }

    setText("totalBookingsValue", totalBookings);
    setText("pendingBookingsValue", pendingBookings);
    setText("confirmedBookingsValue", confirmedBookings);
    setText("rejectedBookingsValue", rejectedBookings);

    bindBookingButtons();
  } catch (error) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="11" style="color:red;">
          Error: ${escapeHtml(error.message)}
        </td>
      </tr>
    `;
  }
}

function bindBookingButtons() {
  document.querySelectorAll(".approve-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await updateDoc(doc(db, "bookings", btn.dataset.id), {
          bookingStatus: "Confirmed",
          paymentStatus: "Verified",
          adminDecision: "Approved",
          customerMessage: "Your booking has been confirmed.",
          customerMessageType: "booking_confirmed",
          messageSeenByCustomer: false,
          updatedAt: serverTimestamp()
        });

        showPopup("Booking Approved", "The booking has been confirmed.");
        loadBookings();
      } catch (error) {
        showPopup("Approve Error", error.message || "Could not approve booking.");
      }
    });
  });

  document.querySelectorAll(".reject-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      openRejectModal(btn.dataset.id);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this booking?")) return;

      try {
        await deleteDoc(doc(db, "bookings", btn.dataset.id));
        showPopup("Booking Deleted", "The booking has been removed.");
        loadBookings();
      } catch (error) {
        showPopup("Delete Error", error.message || "Could not delete booking.");
      }
    });
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    showPopup("Logged Out", "You have been logged out successfully.", "index.html");
  });
}

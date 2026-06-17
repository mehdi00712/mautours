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

const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popupTitle");
const popupMessage = document.getElementById("popupMessage");
const popupBtn = document.getElementById("popupBtn");
const logoutBtn = document.getElementById("logoutBtn");

function showPopup(title, message, redirect = null) {
  if (!popup || !popupTitle || !popupMessage || !popupBtn) {
    alert(`${title}\n\n${message}`);
    if (redirect) window.location.href = redirect;
    return;
  }

  popupTitle.textContent = title;
  popupMessage.textContent = message;
  popup.classList.add("show");

  popupBtn.onclick = () => {
    popup.classList.remove("show");
    if (redirect) window.location.href = redirect;
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

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showPopup("Login Required", "Please log in first.", "login.html");
    return;
  }

  if (!adminUIDs.includes(user.uid)) {
    await signOut(auth);
    showPopup(
      "Access Denied",
      `Admin privileges required.\n\nYour UID is:\n${user.uid}`,
      "index.html"
    );
    return;
  }

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
   VEHICLES
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
      showPopup("Vehicle Saved", "Vehicle saved with pictures.");
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
        <p><strong>Rental Price:</strong> € ${Number(data.price || 0).toLocaleString()} / day</p>
        <p><strong>Status:</strong> ${data.active === false ? "Hidden" : "Visible"}</p>
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
            ${data.active === false ? "Show" : "Hide"}
          </button>

          <button class="clear-vehicle-gallery-btn" data-id="${vehicleId}">
            Clear Extra Pictures
          </button>

          <button class="delete-vehicle-btn" data-id="${vehicleId}">
            Delete
          </button>
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

      setMessage("vehicleMessage", "Editing vehicle. Add more pictures if needed, then click Save Vehicle.");

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

        showPopup("Vehicle Updated", active ? "Vehicle hidden." : "Vehicle visible.");
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

    const tripId = document.getElementById("tripId")?.value.trim();
    const imageFile = document.getElementById("tripImage")?.files[0];
    const galleryFiles = document.getElementById("tripGalleryImages")?.files || [];

    try {
      setMessage("tripMessage", "Saving package...");

      const tripRef = tripId
        ? doc(db, "trips", tripId)
        : doc(collection(db, "trips"));

      const payload = {
        title: document.getElementById("tripTitle")?.value.trim() || "",
        category: document.getElementById("tripCategory")?.value || "",
        description: document.getElementById("tripDescription")?.value.trim() || "",
        fullDetails: document.getElementById("tripFullDetails")?.value.trim() || "",
        duration: document.getElementById("tripDuration")?.value.trim() || "",
        price: Number(document.getElementById("tripPrice")?.value || 0),
        priceType: document.getElementById("tripPriceType")?.value || "Custom Quote",
        includes: toIncludesArray(document.getElementById("tripIncludes")?.value),
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

      if (document.getElementById("tripId")) {
        document.getElementById("tripId").value = "";
      }

      if (document.getElementById("tripFeatured")) {
        document.getElementById("tripFeatured").checked = false;
      }

      if (document.getElementById("tripRequiresVehicle")) {
        document.getElementById("tripRequiresVehicle").checked = false;
      }

      clearFileInput("tripImage");
      clearFileInput("tripGalleryImages");

      setMessage("tripMessage", "Package saved successfully.");
      showPopup("Package Saved", "Package saved.");
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

    if (document.getElementById("tripId")) {
      document.getElementById("tripId").value = "";
    }

    if (document.getElementById("tripFeatured")) {
      document.getElementById("tripFeatured").checked = false;
    }

    if (document.getElementById("tripRequiresVehicle")) {
      document.getElementById("tripRequiresVehicle").checked = false;
    }

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
      const galleryCount = Array.isArray(data.galleryImages)
        ? data.galleryImages.length
        : 0;

      const vehicleText = data.requiresVehicle === true
        ? "Vehicle Required"
        : "No Vehicle Needed";

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

          <button class="clear-trip-gallery-btn" data-id="${tripId}">
            Clear Extra Pictures
          </button>

          <button class="delete-trip-btn" data-id="${tripId}">
            Delete
          </button>
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

      if (document.getElementById("tripFeatured")) {
        document.getElementById("tripFeatured").checked = data.featured === true;
      }

      if (document.getElementById("tripRequiresVehicle")) {
        document.getElementById("tripRequiresVehicle").checked = data.requiresVehicle === true;
      }

      setMessage("tripMessage", "Editing package. Add more pictures if needed, then click Save Package.");

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

          <button class="delete-gallery-btn" data-id="${docSnap.id}">
            Delete
          </button>
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
    if (e.target === rejectModal) {
      closeRejectBox();
    }
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

      const isRental = data.bookingType === "vehicle_rental";
      const typeText = isRental ? "Vehicle Rental" : "Package Booking";
      const packageText = isRental ? "Vehicle Rental Only" : data.package || "-";

      const vehicleText = data.vehicleName
        ? `${data.vehicleName} / € ${Number(data.vehiclePrice || 0).toLocaleString()}`
        : "-";

      const dateText = isRental
        ? data.rentalPeriod || `${data.pickupDate || "-"} → ${data.returnDate || "-"}`
        : data.bookingPeriod || `${data.startDate || data.date || "-"} → ${data.endDate || "-"}`;

      const peopleText = isRental
        ? data.passengers || data.people || "-"
        : data.people || "-";

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
        <td>${escapeHtml(packageText)}</td>
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

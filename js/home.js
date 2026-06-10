import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (el && value) el.textContent = value;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function whatsappLink(number) {
  const clean = String(number || "23059066404").replace(/\D/g, "");
  const msg = encodeURIComponent("Hi, I want to book a tour in Mauritius 🇲🇺");
  return `https://wa.me/${clean}?text=${msg}`;
}

function formatPrice(trip) {
  const price = Number(trip.price || 0);

  if (price <= 0 || trip.priceType === "Custom Quote") {
    return "Custom Quote";
  }

  if (trip.priceType === "Fixed") {
    return `Rs ${price.toLocaleString()}`;
  }

  return `${trip.priceType || "Starting From"} Rs ${price.toLocaleString()}`;
}

async function loadSettings() {
  try {
    const snap = await getDoc(doc(db, "siteContent", "settings"));

    if (!snap.exists()) {
      const fallback = whatsappLink("23059066404");
      $("heroWhatsappBtn").href = fallback;
      $("ctaWhatsappBtn").href = fallback;
      $("floatingWhatsappBtn").href = fallback;
      return;
    }

    const data = snap.data();

    setText("siteBusinessName", data.businessName || "Mautour Holidays");
    setText("footerBusinessName", data.businessName || "Mautour Holidays");
    setText("contactEmail", data.businessEmail || "mautourholidays@gmail.com");
    setText("contactPhone", data.whatsappNumber ? `+${data.whatsappNumber}` : "+230 5906 6404");
    setText("contactMobile", data.mobileNumber ? `+${data.mobileNumber}` : "+230 5254 2792");
    setText("contactRegions", data.servedRegions || "UAE 🇦🇪 Saudi Arabia 🇸🇦 Qatar 🇶🇦 Kuwait 🇰🇼");

    const link = whatsappLink(data.whatsappNumber || "23059066404");
    $("heroWhatsappBtn").href = link;
    $("ctaWhatsappBtn").href = link;
    $("floatingWhatsappBtn").href = link;

  } catch (error) {
    console.error("Load settings error:", error);
  }
}

async function loadHomepageContent() {
  try {
    const snap = await getDoc(doc(db, "siteContent", "homepage"));
    if (!snap.exists()) return;

    const data = snap.data();

    setText("homeHeroTitle", data.heroTitle);
    setText("homeHeroSubtitle", data.heroSubtitle);
    setText("homeHeroBadge", data.heroBadge);

    if (data.ctaText) {
      setText("heroWhatsappBtn", data.ctaText);
      setText("ctaWhatsappBtn", data.ctaText);
    }

    if (data.heroImageUrl) {
      const hero = $("homeHero");
      if (hero) {
        hero.style.background = `
          linear-gradient(to bottom, rgba(7,24,39,.35), rgba(7,24,39,.86)),
          url("${data.heroImageUrl}") center/cover no-repeat
        `;

        const video = $("heroVideo");
        if (video) video.style.display = "none";
      }
    }

  } catch (error) {
    console.error("Load homepage error:", error);
  }
}

async function loadFeaturedTrips() {
  const grid = $("homeTripsGrid");
  if (!grid) return;

  try {
    const q = query(
      collection(db, "trips"),
      where("active", "==", true),
      orderBy("createdAt", "desc"),
      limit(3)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      grid.innerHTML = `
        <div class="loading-card">
          <h3>No Packages Yet</h3>
          <p>Add trips from the admin dashboard to show them here.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const trip = docSnap.data();

      grid.innerHTML += `
        <div class="experience-card">
          <img src="${escapeHtml(trip.imageUrl || "assets/ile.jpg")}" alt="${escapeHtml(trip.title)}" loading="lazy" />
          <div>
            <span>${escapeHtml(trip.category || "Package")}</span>
            <h3>${escapeHtml(trip.title || "Luxury Experience")}</h3>
            <p>${escapeHtml(trip.description || "")}</p>
            <p><strong>${escapeHtml(formatPrice(trip))}</strong></p>
            <a href="booking.html" class="card-link">View Package →</a>
          </div>
        </div>
      `;
    });

  } catch (error) {
    console.error("Load featured trips error:", error);
  }
}

async function loadGallery() {
  const grid = $("homeGalleryGrid");
  if (!grid) return;

  try {
    const q = query(
      collection(db, "gallery"),
      where("active", "==", true),
      orderBy("createdAt", "desc"),
      limit(6)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      grid.innerHTML = `
        <div class="loading-card">
          <h3>No Gallery Images Yet</h3>
          <p>Upload gallery images from the admin dashboard.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const item = docSnap.data();

      grid.innerHTML += `
        <div class="experience-card">
          <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title || "Mauritius")}" loading="lazy" />
        </div>
      `;
    });

  } catch (error) {
    console.error("Load gallery error:", error);
  }
}

async function loadExperiences() {
  const grid = $("homeExperiencesGrid");
  if (!grid) return;

  try {
    const q = query(
      collection(db, "experiences"),
      where("active", "==", true),
      orderBy("createdAt", "desc"),
      limit(6)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    grid.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const exp = docSnap.data();

      grid.innerHTML += `
        <div class="service-card">
          ${escapeHtml(exp.icon || "✨")}
          <h3>${escapeHtml(exp.title || "")}</h3>
          <p>${escapeHtml(exp.description || "")}</p>
        </div>
      `;
    });

  } catch (error) {
    console.error("Load experiences error:", error);
  }
}

async function loadTestimonials() {
  const grid = $("homeReviewsGrid");
  if (!grid) return;

  try {
    const q = query(
      collection(db, "testimonials"),
      where("active", "==", true),
      orderBy("createdAt", "desc"),
      limit(3)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    grid.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const review = docSnap.data();
      const stars = "⭐".repeat(Number(review.rating || 5));

      grid.innerHTML += `
        <div class="service-card">
          ${stars}
          <h3>${escapeHtml(review.name || "Guest")}</h3>
          <p>${escapeHtml(review.country || "")}</p>
          <p>${escapeHtml(review.review || "")}</p>
        </div>
      `;
    });

  } catch (error) {
    console.error("Load testimonials error:", error);
  }
}

loadSettings();
loadHomepageContent();
loadFeaturedTrips();
loadGallery();
loadExperiences();
loadTestimonials();

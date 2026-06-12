import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc
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

function getDocTime(data) {
  if (data.createdAt && typeof data.createdAt.toMillis === "function") {
    return data.createdAt.toMillis();
  }

  if (data.updatedAt && typeof data.updatedAt.toMillis === "function") {
    return data.updatedAt.toMillis();
  }

  return 0;
}

function formatPrice(trip) {
  const price = Number(trip.price || 0);

  if (price <= 0 || trip.priceType === "Custom Quote") return "Custom Quote";
  if (trip.priceType === "Fixed") return `Rs ${price.toLocaleString()}`;

  return `${trip.priceType || "Starting From"} Rs ${price.toLocaleString()}`;
}

function setWhatsappButtons(link) {
  const ids = [
    "heroWhatsappBtn",
    "ctaWhatsappBtn",
    "floatingWhatsappBtn",
    "contactWhatsappBtn"
  ];

  ids.forEach((id) => {
    const el = $(id);
    if (el) el.href = link;
  });
}

function startReviewSlider() {
  const slides = document.querySelectorAll(".review-slide");
  const dots = document.querySelectorAll(".review-dot");

  if (slides.length === 0) return;

  let currentReview = 0;
  let timer = null;

  function showReview(index) {
    slides.forEach((slide) => slide.classList.remove("active"));
    dots.forEach((dot) => dot.classList.remove("active"));

    currentReview = index;

    if (slides[currentReview]) slides[currentReview].classList.add("active");
    if (dots[currentReview]) dots[currentReview].classList.add("active");
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const index = Number(dot.dataset.review || 0);
      showReview(index);

      if (timer) clearInterval(timer);

      timer = setInterval(() => {
        const next = currentReview + 1 >= slides.length ? 0 : currentReview + 1;
        showReview(next);
      }, 5000);
    });
  });

  timer = setInterval(() => {
    const next = currentReview + 1 >= slides.length ? 0 : currentReview + 1;
    showReview(next);
  }, 5000);
}

async function loadSettings() {
  try {
    const snap = await getDoc(doc(db, "siteContent", "settings"));

    if (!snap.exists()) {
      setWhatsappButtons(whatsappLink("23059066404"));
      return;
    }

    const data = snap.data();

    setText("siteBusinessName", data.businessName || "Mautour Holidays");
    setText("footerBusinessName", data.businessName || "Mautour Holidays");
    setText("contactEmail", data.businessEmail || "mautourholidays@gmail.com");
    setText(
      "contactPhone",
      data.whatsappNumber ? `+${data.whatsappNumber}` : "+230 5906 6404"
    );
    setText(
      "contactMobile",
      data.mobileNumber ? `+${data.mobileNumber}` : "+230 5254 2792"
    );
    setText(
      "contactRegions",
      data.servedRegions || "UAE 🇦🇪 Saudi Arabia 🇸🇦 Qatar 🇶🇦 Kuwait 🇰🇼"
    );

    setWhatsappButtons(whatsappLink(data.whatsappNumber || "23059066404"));
  } catch (error) {
    console.error("Load settings error:", error);
    setWhatsappButtons(whatsappLink("23059066404"));
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
      setText("contactWhatsappBtn", data.ctaText);
    }

    if (data.heroImageUrl) {
      const hero = $("homeHero");

      if (hero) {
        hero.style.background = `
          linear-gradient(to bottom, rgba(7,24,39,.35), rgba(7,24,39,.86)),
          url("${data.heroImageUrl}") center/cover no-repeat
        `;
      }

      const video = $("heroVideo");
      if (video) video.style.display = "none";
    }
  } catch (error) {
    console.error("Load homepage error:", error);
  }
}

async function loadFeaturedTrips() {
  const grid = $("homeTripsGrid");
  if (!grid) return;

  grid.innerHTML = `
    <div class="loading-card">
      <h3>Loading Featured Packages...</h3>
      <p>Please wait while we load selected packages.</p>
    </div>
  `;

  try {
    const snapshot = await getDocs(collection(db, "trips"));

    const trips = [];

    snapshot.forEach((docSnap) => {
      const trip = docSnap.data();

      if (trip.active === false) return;
      if (trip.featured !== true) return;

      trips.push({
        id: docSnap.id,
        ...trip
      });
    });

    trips.sort((a, b) => getDocTime(b) - getDocTime(a));

    const featuredTrips = trips.slice(0, 3);

    if (featuredTrips.length === 0) {
      grid.innerHTML = `
        <div class="loading-card">
          <h3>No Featured Packages Selected</h3>
          <p>Go to Admin → Packages and tick “Show this package on homepage Featured Packages”.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = "";

    featuredTrips.forEach((trip) => {
      const galleryCount = Array.isArray(trip.galleryImages)
        ? trip.galleryImages.length
        : 0;

      grid.innerHTML += `
        <div class="experience-card clickable-card" onclick="window.location.href='package-details.html?id=${trip.id}'">
          <img
            src="${escapeHtml(trip.imageUrl || "assets/ile.jpg")}"
            alt="${escapeHtml(trip.title || "Mauritius package")}"
            loading="lazy"
          />

          <div>
            <span>${escapeHtml(trip.category || "Package")}</span>
            <h3>${escapeHtml(trip.title || "Luxury Experience")}</h3>

            <p>${escapeHtml(trip.description || "")}</p>

            <p>
              <strong>${escapeHtml(formatPrice(trip))}</strong>
            </p>

            <p>
              ${trip.duration ? `Duration: ${escapeHtml(trip.duration)}` : ""}
              ${galleryCount > 0 ? ` • ${galleryCount + 1} photos` : ""}
            </p>

            <a href="package-details.html?id=${trip.id}" class="card-link">
              View Details →
            </a>
          </div>
        </div>
      `;
    });
  } catch (error) {
    console.error("Load featured trips error:", error);

    grid.innerHTML = `
      <div class="loading-card">
        <h3>Could Not Load Featured Packages</h3>
        <p>${escapeHtml(error.message || "Please try again later.")}</p>
      </div>
    `;
  }
}

async function loadGallery() {
  const grid = $("homeGalleryGrid");
  if (!grid) return;

  grid.innerHTML = `
    <div class="loading-card">
      <h3>Loading Gallery...</h3>
      <p>Please wait while we load the latest images.</p>
    </div>
  `;

  try {
    const snapshot = await getDocs(collection(db, "gallery"));

    const images = [];

    snapshot.forEach((docSnap) => {
      const item = docSnap.data();

      if (item.active === false) return;

      images.push({
        id: docSnap.id,
        ...item
      });
    });

    images.sort((a, b) => getDocTime(b) - getDocTime(a));

    const latestImages = images.slice(0, 6);

    if (latestImages.length === 0) {
      grid.innerHTML = `
        <div class="loading-card">
          <h3>No Gallery Images Yet</h3>
          <p>Upload gallery images from the admin dashboard.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = "";

    latestImages.forEach((item) => {
      grid.innerHTML += `
        <div class="experience-card clickable-card" onclick="window.location.href='booking.html'">
          <img
            src="${escapeHtml(item.imageUrl || "assets/ile.jpg")}"
            alt="${escapeHtml(item.title || "Mauritius")}"
            loading="lazy"
          />
        </div>
      `;
    });
  } catch (error) {
    console.error("Load gallery error:", error);

    grid.innerHTML = `
      <div class="loading-card">
        <h3>Could Not Load Gallery</h3>
        <p>${escapeHtml(error.message || "Please try again later.")}</p>
      </div>
    `;
  }
}

async function loadExperiences() {
  const grid = $("homeExperiencesGrid");
  if (!grid) return;

  try {
    const snapshot = await getDocs(collection(db, "experiences"));

    const experiences = [];

    snapshot.forEach((docSnap) => {
      const exp = docSnap.data();

      if (exp.active === false) return;

      experiences.push({
        id: docSnap.id,
        ...exp
      });
    });

    experiences.sort((a, b) => getDocTime(b) - getDocTime(a));

    const latestExperiences = experiences.slice(0, 6);

    if (latestExperiences.length === 0) return;

    grid.innerHTML = "";

    latestExperiences.forEach((exp) => {
      grid.innerHTML += `
        <div class="service-card clickable-card" onclick="window.location.href='booking.html'">
          ${escapeHtml(exp.icon || "✨")}

          <h3>${escapeHtml(exp.title || "")}</h3>

          <p>${escapeHtml(exp.description || "")}</p>

          <span class="card-action">See Packages →</span>
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
    const snapshot = await getDocs(collection(db, "testimonials"));

    const testimonials = [];

    snapshot.forEach((docSnap) => {
      const review = docSnap.data();

      if (review.active === false) return;

      testimonials.push({
        id: docSnap.id,
        ...review
      });
    });

    testimonials.sort((a, b) => getDocTime(b) - getDocTime(a));

    const latestTestimonials = testimonials.slice(0, 5);

    if (latestTestimonials.length === 0) {
      startReviewSlider();
      return;
    }

    const slides = latestTestimonials
      .map((review, index) => {
        const rating = Math.max(1, Math.min(5, Number(review.rating || 5)));
        const stars = "★".repeat(rating);

        return `
          <div class="review-slide ${index === 0 ? "active" : ""}">
            <div class="review-stars">${stars}</div>
            <h3>${escapeHtml(review.name || "Guest")}</h3>
            <p>${escapeHtml(review.country || "")}</p>
            <p>${escapeHtml(review.review || "")}</p>
          </div>
        `;
      })
      .join("");

    const dots = latestTestimonials
      .map((_, index) => {
        return `<button class="review-dot ${index === 0 ? "active" : ""}" type="button" data-review="${index}"></button>`;
      })
      .join("");

    grid.innerHTML = `
      <div class="review-slider">
        ${slides}
        <div class="review-dots">${dots}</div>
      </div>
    `;

    startReviewSlider();
  } catch (error) {
    console.error("Load testimonials error:", error);
    startReviewSlider();
  }
}

loadSettings();
loadHomepageContent();
loadFeaturedTrips();
loadGallery();
loadExperiences();
loadTestimonials();

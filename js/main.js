/* ===== NAVBAR HAMBURGER ===== */
const hamburger = document.querySelector(".hamburger");
const nav = document.querySelector(".nav");

if (hamburger && nav) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    nav.classList.toggle("open");
  });
}

/* ===== 3D CAROUSEL CONTROL ===== */
const carousel = document.querySelector(".carousel");
const totalItems = document.querySelectorAll(".carousel-item").length;
const rotationPerItem = 360 / totalItems;
let currentAngle = 0;

// Auto-rotate every 10 seconds
let autoRotate = setInterval(() => {
  currentAngle -= rotationPerItem;
  carousel.style.transform = `rotateY(${currentAngle}deg)`;
}, 10000);

// Pause on hover
const container = document.querySelector(".carousel-container");
container.addEventListener("mouseenter", () => clearInterval(autoRotate));
container.addEventListener("mouseleave", () => {
  autoRotate = setInterval(() => {
    currentAngle -= rotationPerItem;
    carousel.style.transform = `rotateY(${currentAngle}deg)`;
  }, 10000);
});

// Manual buttons
const nextBtn = document.querySelector(".next");
const prevBtn = document.querySelector(".prev");

if (nextBtn && prevBtn) {
  nextBtn.addEventListener("click", () => {
    currentAngle -= rotationPerItem;
    carousel.style.transform = `rotateY(${currentAngle}deg)`;
  });

  prevBtn.addEventListener("click", () => {
    currentAngle += rotationPerItem;
    carousel.style.transform = `rotateY(${currentAngle}deg)`;
  });
}

/* ===== FADE-IN ANIMATION ===== */
const fadeElems = document.querySelectorAll(".fade-in");
window.addEventListener("scroll", () => {
  fadeElems.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) el.classList.add("visible");
  });
});

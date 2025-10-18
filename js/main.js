// ===== Responsive Navbar =====
const hamburger = document.getElementById("hamburger");
const nav = document.getElementById("nav");

if (hamburger) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    nav.classList.toggle("open");
  });
}

// ===== Fade-in Animation =====
const fadeElements = document.querySelectorAll(".fade-in");
window.addEventListener("scroll", () => {
  fadeElements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) el.classList.add("visible");
  });
});

// ===== 3D Carousel Manual + Auto Rotation =====
const carousel = document.getElementById("carousel");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
let angle = 0;
let autoRotate;

// Rotate carousel manually
function rotateCarousel(deg) {
  angle += deg;
  carousel.style.transform = `rotateY(${angle}deg)`;
}

// Button listeners
nextBtn.addEventListener("click", () => rotateCarousel(-90));
prevBtn.addEventListener("click", () => rotateCarousel(90));

// Auto rotation every 6s
function startAutoRotate() {
  autoRotate = setInterval(() => rotateCarousel(-90), 6000);
}
function stopAutoRotate() {
  clearInterval(autoRotate);
}

// Pause on hover
carousel.parentElement.addEventListener("mouseenter", stopAutoRotate);
carousel.parentElement.addEventListener("mouseleave", startAutoRotate);

startAutoRotate();

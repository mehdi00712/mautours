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

// ===== Auto Sliding Loved Experiences =====
let currentSlide = 0;
const lovedCards = document.getElementById("lovedCards");
if (lovedCards) {
  const totalSlides = lovedCards.children.length;
  function showNextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    const offset = -currentSlide * 100;
    lovedCards.style.transform = `translateX(${offset}%)`;
  }
  setInterval(showNextSlide, 10000); // every 10 s
}

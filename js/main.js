/* ===== Navbar Toggle ===== */
const hamburger = document.querySelector('.hamburger');
const nav = document.querySelector('.nav');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  nav.classList.toggle('open');
});

/* ===== Fade-in Animation on Scroll ===== */
const fadeElements = document.querySelectorAll('.fade-in');
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
});
fadeElements.forEach(el => observer.observe(el));

/* ===== 3D Carousel Control ===== */
const carousel = document.querySelector('.carousel');
const prevBtn = document.querySelector('.carousel-btn.prev');
const nextBtn = document.querySelector('.carousel-btn.next');

let angle = 0;
const totalItems = document.querySelectorAll('.carousel-item').length;
const rotationPerItem = 360 / totalItems;
let autoRotate;

/* Rotate Carousel Function */
function rotateCarousel(direction) {
  angle += rotationPerItem * direction;
  carousel.style.transform = `rotateY(${angle}deg)`;
}

/* Auto Rotation */
function startAutoRotate() {
  autoRotate = setInterval(() => rotateCarousel(-1), 4000);
}
function stopAutoRotate() {
  clearInterval(autoRotate);
}

/* Buttons */
prevBtn.addEventListener('click', () => {
  stopAutoRotate();
  rotateCarousel(1);
  setTimeout(startAutoRotate, 5000);
});

nextBtn.addEventListener('click', () => {
  stopAutoRotate();
  rotateCarousel(-1);
  setTimeout(startAutoRotate, 5000);
});

/* Pause rotation on hover */
carousel.parentElement.addEventListener('mouseenter', stopAutoRotate);
carousel.parentElement.addEventListener('mouseleave', startAutoRotate);

/* Start automatically */
startAutoRotate();

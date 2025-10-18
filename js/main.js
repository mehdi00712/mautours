// js/main.js

// ===== Hamburger Menu =====
const hamburger = document.getElementById("hamburger");
const nav = document.getElementById("nav");

if (hamburger && nav) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    nav.classList.toggle("open");
  });

  // Close menu when clicking a link
  const navLinks = nav.querySelectorAll("a");
  navLinks.forEach((link) =>
    link.addEventListener("click", () => {
      hamburger.classList.remove("active");
      nav.classList.remove("open");
    })
  );
}

// ===== Scroll Fade-in Animation =====
const faders = document.querySelectorAll(".fade-in");
const appearOptions = {
  threshold: 0.15,
  rootMargin: "0px 0px -20px 0px",
};

const appearOnScroll = new IntersectionObserver(function (
  entries,
  appearOnScroll
) {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("visible");
    appearOnScroll.unobserve(entry.target);
  });
},
appearOptions);

faders.forEach((fader) => {
  appearOnScroll.observe(fader);
});

// ===== Smooth Scroll for Anchor Links =====
const smoothLinks = document.querySelectorAll('a[href^="#"]');
smoothLinks.forEach((link) => {
  link.addEventListener("click", function (e) {
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

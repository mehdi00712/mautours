// Hamburger menu
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("navMenu");

hamburger?.addEventListener("click", () => {
  navMenu.classList.toggle("open");
  hamburger.classList.toggle("active");
});

// Scroll fade animation
const faders = document.querySelectorAll(".fade-in");

const appear = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

faders.forEach((el) => appear.observe(el));

// Contact form (mock)
document.getElementById("contactForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  alert("Thank you! We'll get back to you soon.");
});

// ===== Safe Navbar Toggle =====
const hamburger = document.getElementById("hamburger");
const nav = document.getElementById("nav");

if (hamburger && nav) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    nav.classList.toggle("open");
  });
}

// ===== Scroll Fade-in Animations =====
const faders = document.querySelectorAll(".fade-in");

if (faders.length > 0) {
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
}

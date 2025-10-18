// ========== Mautours Main Script ==========

// Ensure the DOM is loaded before running
document.addEventListener("DOMContentLoaded", () => {

  // ===== Navbar & Hamburger =====
  const hamburger = document.getElementById("hamburger");
  const nav = document.getElementById("nav");

  if (hamburger && nav) {
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("active");
      nav.classList.toggle("open");
    });
  }

  // ===== Close nav when clicking outside (mobile) =====
  document.addEventListener("click", (e) => {
    if (
      nav &&
      hamburger &&
      !nav.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      nav.classList.remove("open");
      hamburger.classList.remove("active");
    }
  });

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

  // ===== Smooth Scroll for Anchor Links =====
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach((link) => {
    link.addEventListener("click", function (e) {
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
});

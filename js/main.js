// main.js — controls the navigation and interactive UI

document.addEventListener("DOMContentLoaded", () => {
  // Hamburger toggle
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("navMenu");

  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      navMenu.classList.toggle("active");
      hamburger.classList.toggle("open");
    });
  }

  // Highlight the current page in navbar
  const currentPage = window.location.pathname.split("/").pop();
  document.querySelectorAll(".nav a").forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    }
  });

  // Smooth scroll (optional for contact/about pages)
  const scrollLinks = document.querySelectorAll('a[href^="#"]');
  scrollLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href").substring(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        window.scrollTo({
          top: target.offsetTop - 80,
          behavior: "smooth",
        });
        navMenu.classList.remove("active");
        hamburger.classList.remove("open");
      }
    });
  });

  console.log("Mautours site loaded successfully ✅");
});

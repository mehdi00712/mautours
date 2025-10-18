// Modern Booking Modal System
document.addEventListener("DOMContentLoaded", () => {
  const bookButtons = document.querySelectorAll(".book-btn");
  const modal = document.getElementById("bookingModal");
  const closeBtn = document.querySelector(".modal .close");
  const modalTitle = document.getElementById("modalTitle");
  const form = document.getElementById("bookingForm");

  let selectedPackage = null;

  // Open modal when clicking "Book Now"
  bookButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedPackage = btn.dataset.package;
      modalTitle.textContent = `Book: ${selectedPackage}`;
      modal.classList.add("show");
      document.body.style.overflow = "hidden";
    });
  });

  // Close modal
  closeBtn.addEventListener("click", () => {
    modal.classList.remove("show");
    document.body.style.overflow = "auto";
  });

  // Submit booking form
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const bookingData = {
      package: selectedPackage,
      name: form.name.value,
      email: form.email.value,
      date: form.date.value,
      people: form.people.value,
    };

    console.log("Booking Data:", bookingData);

    // Redirect to ABSA or success page
    window.location.href = "success.html";
  });

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("show");
      document.body.style.overflow = "auto";
    }
  });
});

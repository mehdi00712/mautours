// js/payment-link.js
// Adds a "Pay Online" button under the booking note on package pages and in
// the booking form. It always leads to the payment portal (payment.html),
// which uses the bank's payment link once it is saved in Admin → Settings,
// and asks customers to arrange payment on WhatsApp until then.

function injectPaymentStyles() {
  if (document.getElementById("paymentLinkStyles")) return;

  const style = document.createElement("style");
  style.id = "paymentLinkStyles";
  style.textContent = `
    .pay-online-btn {
      display: inline-block;
      margin-top: 12px;
      padding: 12px 22px;
      border-radius: 999px;
      background: var(--gold, #c9a227);
      color: #fff;
      font-weight: 800;
      text-decoration: none;
    }
    .pay-online-btn:hover { opacity: 0.9; }
  `;
  document.head.appendChild(style);
}

// db and packageLink are kept for compatibility with existing callers.
export function applyPaymentLink(db, packageLink = "", packageId = "") {
  const notes = document.querySelectorAll(".whatsapp-booking-note");
  if (!notes.length) return;

  injectPaymentStyles();

  const href = packageId
    ? `payment.html?id=${encodeURIComponent(packageId)}`
    : "payment.html";

  notes.forEach((note) => {
    if (!note.dataset.originalHtml) note.dataset.originalHtml = note.innerHTML;

    note.innerHTML = `
      <strong>Book on WhatsApp, then pay online.</strong>
      <span>
        Send your request on WhatsApp first. Once we confirm availability and the final price,
        you can pay using our secure payment page.
      </span>
      <a class="pay-online-btn"></a>
    `;

    const btn = note.querySelector(".pay-online-btn");
    btn.href = href;
    btn.textContent = "Pay Online";
  });
}

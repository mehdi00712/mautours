// js/pay-watch.js
// Absa payment-link flow: the customer pays on Absa's secure page (new tab) while this
// page asks the server (checkPayment) every few seconds. As soon as Absa approves the
// payment, the customer is taken to the receipt page.

import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/**
 * @param {object} o
 * @param {import("firebase/functions").Functions} o.functions
 * @param {HTMLElement} o.box      element to render the panel into
 * @param {string} o.url          Absa payment page (https)
 * @param {string} o.bookingRef
 * @param {string} [o.email]      needed when the customer is not signed in
 * @param {string} [o.amountText]
 */
export function watchPayment({ functions, box, url, bookingRef, email = "", amountText = "" }) {
  const checkPayment = httpsCallable(functions, "checkPayment");
  let stopped = false;
  let timer = null;

  box.innerHTML = `
    <div class="pay-watch">
      <strong>Your booking ${esc(bookingRef)} is ready to pay${amountText ? ` – ${esc(amountText)}` : ""}.</strong>
      <p>Click the button to open <b>Absa's secure payment page</b> and enter your card there. Keep this page open – it updates automatically when your payment is approved.</p>
      <a class="btn pay-watch-btn" href="${esc(url)}" target="_blank" rel="noopener">Open Absa secure payment</a>
      <p class="pay-watch-status" aria-live="polite"><span class="pay-watch-dot"></span> Waiting for your payment…</p>
    </div>`;
  box.style.display = "block";
  box.scrollIntoView({ behavior: "smooth", block: "center" });

  const statusEl = box.querySelector(".pay-watch-status");
  const started = Date.now();

  const stop = () => {
    stopped = true;
    clearTimeout(timer);
  };

  async function poll() {
    if (stopped) return;
    try {
      const { data } = await checkPayment({ bookingRef, email });
      if (data?.status === "accept" && data.receipt) {
        stop();
        statusEl.textContent = "Payment approved – opening your receipt…";
        location.href = `success.html?${new URLSearchParams({ status: "accept", ref: bookingRef, receipt: data.receipt })}`;
        return;
      }
      if (data?.status === "decline") {
        stop();
        statusEl.innerHTML = `<strong>The payment was not approved.</strong> You can <a href="${esc(url)}" target="_blank" rel="noopener">try again with another card</a> or contact us on WhatsApp with reference ${esc(bookingRef)}.`;
        // keep watching in case the customer retries on the same link
        stopped = false;
      }
      if (data?.status === "review") {
        statusEl.innerHTML = `<strong>Your payment is being checked by the bank.</strong> We will confirm booking ${esc(bookingRef)} as soon as it clears.`;
      }
    } catch (error) {
      console.warn("Payment check failed – retrying", error);
    }
    const elapsed = Date.now() - started;
    if (elapsed > 45 * 60 * 1000) {
      statusEl.innerHTML = `Still waiting. If you have already paid, your receipt will appear in <a href="my-bookings.html">My bookings</a>.`;
      return;
    }
    timer = setTimeout(poll, elapsed < 10 * 60 * 1000 ? 5000 : 15000);
  }

  timer = setTimeout(poll, 4000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !stopped) {
      clearTimeout(timer);
      poll();
    }
  });

  return { stop };
}

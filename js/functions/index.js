// functions/index.js
/**
 * Before deploy, set your ABSA config:
 *  firebase functions:config:set absa.url="https://<ABSA-ENDPOINT>" \
 *    absa.merchant_id="YOUR_MERCHANT_ID" \
 *    absa.secret="YOUR_BEARER_OR_SECRET" \
 *    absa.amount_mode="major" \
 *    absa.mock="false"
 *
 * To test redirects without ABSA, set absa.mock="true"
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// Node 18+ has global fetch available; if on older runtime, add node-fetch@2.
const cfg = functions.config();
const REGION         = "us-central1"; // keep consistent with your deployed region
const ABSA_API_URL   = cfg.absa?.url || "";
const ABSA_MERCHANT  = cfg.absa?.merchant_id || "";
const ABSA_SECRET    = cfg.absa?.secret || "";
const AMOUNT_MODE    = (cfg.absa?.amount_mode || "major").toLowerCase(); // "major" or "minor"
const MOCK_MODE      = String(cfg.absa?.mock || "false").toLowerCase() === "true";

const allowOrigin = (res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
};

exports.createAbsaPaymentSession = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    allowOrigin(res);
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST")  return res.status(405).send("Method Not Allowed");

    try {
      const { bookingId, amount, currency, successUrl, cancelUrl } = req.body || {};
      if (!bookingId || !amount || !currency || !successUrl || !cancelUrl) {
        functions.logger.error("Missing fields", { body: req.body });
        return res.status(400).json({ error: "Missing fields" });
      }

      // Validate booking exists & status
      const snap = await db.collection("bookings").doc(bookingId).get();
      if (!snap.exists) {
        functions.logger.error("Booking not found", { bookingId });
        return res.status(404).json({ error: "Booking not found" });
      }
      const booking = snap.data();
      if (booking.status !== "pending_payment") {
        functions.logger.error("Invalid booking status", { bookingId, status: booking.status });
        return res.status(400).json({ error: "Invalid booking status" });
      }

      // Mock mode: immediately return successUrl so you can test end-to-end
      if (MOCK_MODE) {
        functions.logger.info("MOCK_MODE enabled, returning successUrl", { bookingId });
        return res.json({ paymentUrl: successUrl });
      }

      // Ensure ABSA config exists
      if (!ABSA_API_URL || !ABSA_MERCHANT || !ABSA_SECRET) {
        functions.logger.error("ABSA gateway not configured");
        return res.status(500).json({ error: "Gateway not configured" });
      }

      // Convert amount if gateway expects minor units
      const gatewayAmount = AMOUNT_MODE === "minor"
        ? Math.round(Number(amount) * 100)
        : Number(amount);

      // Build payload — ADAPT to your ABSA product schema
      const payload = {
        merchantId: ABSA_MERCHANT,
        amount: gatewayAmount,          // may be minor or major units based on AMOUNT_MODE
        currency,                        // "MUR"
        reference: bookingId,            // your reference
        successUrl,
        cancelUrl
      };

      // Make request to ABSA (change headers/body if ABSA requires form-encoded)
      const resp = await fetch(ABSA_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ABSA_SECRET}`
        },
        body: JSON.stringify(payload)
      });

      const text = await resp.text();
      if (!resp.ok) {
        functions.logger.error("ABSA create error", { status: resp.status, text });
        return res.status(502).json({ error: "ABSA session error", status: resp.status, detail: text });
      }

      let data;
      try { data = JSON.parse(text); } catch (e) {
        functions.logger.error("ABSA response parse error", { text });
        return res.status(502).json({ error: "ABSA response parse error" });
      }

      // Map to real field your ABSA returns
      const paymentUrl = data.redirectUrl || data.paymentUrl || data.url;
      if (!paymentUrl) {
        functions.logger.error("No redirect URL in ABSA response", { data });
        return res.status(502).json({ error: "No redirect URL from gateway" });
      }

      await db.collection("bookings").doc(bookingId).update({
        gateway: { provider: "absa", orderRef: data.orderId || data.reference || null }
      });

      return res.json({ paymentUrl });

    } catch (err) {
      functions.logger.error("createAbsaPaymentSession error", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

exports.absaWebhook = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    try {
      // TODO: verify signature per ABSA docs (HMAC, etc.)
      const event = req.body || {};
      const bookingId = event.reference || event.bookingId || event.orderId;
      const status = (event.status || event.result || "").toUpperCase();

      if (!bookingId) {
        functions.logger.error("Webhook missing reference", { event });
        return res.status(400).send("Missing reference");
      }

      const paid = ["SUCCESS", "APPROVED", "PAID"].includes(status);
      await db.collection("bookings").doc(bookingId).update({
        status: paid ? "paid" : "payment_failed",
        paidAt: paid ? admin.firestore.FieldValue.serverTimestamp() : null,
        gateway: admin.firestore.FieldValue.arrayUnion({ type: "webhook", ts: Date.now(), raw: event })
      });

      res.status(200).send("OK");
    } catch (e) {
      functions.logger.error("Webhook error", e);
      res.status(500).send("Webhook error");
    }
  });

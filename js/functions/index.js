// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch"); // npm i node-fetch@2
admin.initializeApp();
const db = admin.firestore();

// CORS helper (allow your site)
const allowOrigin = (res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
};

exports.createAbsaPaymentSession = functions.region("YOUR_REGION").https.onRequest(async (req, res) => {
  allowOrigin(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { bookingId, amount, currency, successUrl, cancelUrl } = req.body;
    if (!bookingId || !amount || !currency || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // 1) (Optional) Validate booking exists and is pending
    const snap = await db.collection("bookings").doc(bookingId).get();
    if (!snap.exists) return res.status(404).json({ error: "Booking not found" });
    const booking = snap.data();
    if (booking.status !== "pending_payment") {
      return res.status(400).json({ error: "Invalid booking status" });
    }

    // 2) Create a payment order/session via ABSA (PSEUDO CODE!)
    // Replace with ABSA hosted checkout / API:
    // Docs vary across ABSA regions; typical flow: POST order with amount & return URLs → get redirect link
    const ABSA_API_URL = "https://absa.example.com/payments/create"; // placeholder
    const ABSA_MERCHANT_ID = "YOUR_MERCHANT_ID";
    const ABSA_SECRET     = "YOUR_SECRET_OR_BEARER";

    // Example payload – adapt to ABSA spec:
    const payload = {
      merchantId: ABSA_MERCHANT_ID,
      amount: amount,           // e.g., in MUR
      currency: currency,       // "MUR"
      reference: bookingId,     // your reference
      successUrl,
      cancelUrl,
      // ... any additional fields required by ABSA
    };

    const resp = await fetch(ABSA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ABSA_SECRET}`
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("ABSA create error:", text);
      return res.status(500).json({ error: "ABSA session error" });
    }

    const result = await resp.json();
    // Suppose ABSA returns { redirectUrl: "https://absa..." }
    const paymentUrl = result.redirectUrl; // map to real field
    if (!paymentUrl) return res.status(500).json({ error: "No redirect URL" });

    // Optional: store gateway order id
    await db.collection("bookings").doc(bookingId).update({
      gateway: { provider: "absa", orderRef: result.orderId || null }
    });

    return res.json({ paymentUrl });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Webhook for ABSA to confirm payments
exports.absaWebhook = functions.region("YOUR_REGION").https.onRequest(async (req, res) => {
  // Verify signature if ABSA signs webhooks
  try {
    const event = req.body; // shape depends on ABSA
    const bookingId = event.reference || event.bookingId; // map to ABSA field for your reference
    const paid = event.status === "SUCCESS" || event.result === "APPROVED"; // map exactly

    if (!bookingId) return res.status(400).send("Missing reference");

    if (paid) {
      await db.collection("bookings").doc(bookingId).update({
        status: "paid",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        gateway: admin.firestore.FieldValue.arrayUnion({
          type: "webhook",
          ts: Date.now(),
          raw: event
        })
      });
    } else {
      await db.collection("bookings").doc(bookingId).update({
        status: "payment_failed",
        gateway: admin.firestore.FieldValue.arrayUnion({
          type: "webhook",
          ts: Date.now(),
          raw: event
        })
      });
    }

    res.status(200).send("OK");
  } catch (e) {
    console.error(e);
    res.status(500).send("Webhook error");
  }
});

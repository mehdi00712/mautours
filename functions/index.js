/**
 * Mautour Holidays – Absa / CyberSource Secure Acceptance (Hosted Checkout)
 *
 * createAbsaPayment   (callable)  – checks the booking, signs the payment request
 *                                   and returns the fields the browser posts to CyberSource.
 * absaPaymentResponse (HTTP POST) – CyberSource sends the result here. The signature is
 *                                   verified, the booking is marked Paid and a receipt
 *                                   number is issued, then the customer is redirected
 *                                   to success.html.
 * getPaymentStatus    (callable)  – lets success.html show a verified receipt.
 *
 * Secrets (never put these in the code or on GitHub):
 *   firebase functions:secrets:set ABSA_PROFILE_ID
 *   firebase functions:secrets:set ABSA_ACCESS_KEY
 *   firebase functions:secrets:set ABSA_SECRET_KEY
 * Parameters (asked at deploy time, or set in functions/.env):
 *   ABSA_ENV       test | live          (default test)
 *   ABSA_CURRENCY  EUR | MUR | USD …    (must match your Absa merchant account)
 *   SITE_URL       https://mautours.com
 */

const crypto = require("crypto");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret, defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({
  region: "us-central1",
  serviceAccount: "mautours-functions-runtime@mautours-60318.iam.gserviceaccount.com"
});

const ABSA_PROFILE_ID = defineSecret("ABSA_PROFILE_ID");
const ABSA_ACCESS_KEY = defineSecret("ABSA_ACCESS_KEY");
const ABSA_SECRET_KEY = defineSecret("ABSA_SECRET_KEY");

const ABSA_ENV = defineString("ABSA_ENV", { default: "test" });
const ABSA_CURRENCY = defineString("ABSA_CURRENCY", { default: "EUR" });
const SITE_URL = defineString("SITE_URL", { default: "https://mautours.com" });
// Website prices are in EUR. If your Absa account charges in another currency,
// set ABSA_CURRENCY (e.g. MUR) and ABSA_EUR_RATE (e.g. 53.00 = Rs per €1).
const ABSA_EUR_RATE = defineString("ABSA_EUR_RATE", { default: "1" });

const { pricePackageItem, priceVehicleItem, roundMoney } = require("./pricing");

const ENDPOINTS = {
  test: "https://testsecureacceptance.cybersource.com/pay",
  live: "https://secureacceptance.cybersource.com/pay"
};

const RESPONSE_URL =
  "https://us-central1-mautours-60318.cloudfunctions.net/absaPaymentResponse";

/* ---------------- helpers ---------------- */

function sign(fields, secretKey) {
  const names = String(fields.signed_field_names || "").split(",");
  const data = names.map((n) => `${n}=${fields[n] ?? ""}`).join(",");
  return crypto.createHmac("sha256", secretKey).update(data, "utf8").digest("base64");
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function cybersourceDate() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function clean(value, max = 60) {
  // CyberSource rejects some characters; keep it simple and short.
  return String(value || "")
    .replace(/[^\p{L}\p{N} .,'@\-_/]/gu, "")
    .trim()
    .slice(0, max);
}

function makeReceiptNumber(bookingRef) {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
  const rnd = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `RC${ymd}-${rnd}`;
}

/* ---------------- shared: sign a payment for a booking ---------------- */

function chargeAmount(amountEur) {
  const currency = ABSA_CURRENCY.value();
  if (currency === "EUR") return { amount: roundMoney(amountEur), currency };
  const rate = Number(ABSA_EUR_RATE.value() || 0);
  if (!(rate > 0)) throw new HttpsError("failed-precondition", "Payment currency is not configured. Please contact us.");
  return { amount: roundMoney(amountEur * rate), currency };
}

async function signPayment({ bookingRef, amountEur, email, name, amountSource }) {
  const { amount, currency } = chargeAmount(amountEur);
  const nameParts = clean(name, 80).split(/\s+/).filter(Boolean);
  const forename = nameParts.shift() || "Guest";
  const surname = nameParts.join(" ") || forename;

  const transactionUuid = crypto.randomUUID();
  const fields = {
    access_key: ABSA_ACCESS_KEY.value(),
    profile_id: ABSA_PROFILE_ID.value(),
    transaction_uuid: transactionUuid,
    signed_date_time: cybersourceDate(),
    locale: "en",
    transaction_type: "sale",
    reference_number: bookingRef,
    amount: amount.toFixed(2),
    currency,
    bill_to_forename: forename,
    bill_to_surname: surname,
    bill_to_email: email,
    override_custom_receipt_page: RESPONSE_URL,
    override_custom_cancel_page: RESPONSE_URL,
    unsigned_field_names: ""
  };
  fields.signed_field_names = [...Object.keys(fields), "signed_field_names"].join(",");
  fields.signature = sign(fields, ABSA_SECRET_KEY.value());

  await db.collection("payments").doc(transactionUuid).set({
    bookingRef,
    amount,
    currency,
    amountEur: roundMoney(amountEur),
    amountSource,
    status: "Initiated",
    environment: ABSA_ENV.value(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await db.collection("bookings").doc(bookingRef).set(
    {
      paymentStatus: "Payment started",
      lastTransactionUuid: transactionUuid,
      paymentGateway: "Absa / CyberSource",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return { endpoint: ENDPOINTS[ABSA_ENV.value()] || ENDPOINTS.test, fields };
}

/* ---------------- 1. create & sign payment ---------------- */

exports.createAbsaPayment = onCall(
  { secrets: [ABSA_PROFILE_ID, ABSA_ACCESS_KEY, ABSA_SECRET_KEY] },
  async (request) => {
    const bookingRef = String(request.data?.bookingRef || "").trim().toUpperCase();
    const email = String(request.data?.email || "").trim().toLowerCase();
    const requestedAmount = Number(request.data?.amount || 0);

    if (!bookingRef || !email) {
      throw new HttpsError("invalid-argument", "Please enter your booking reference and email.");
    }

    const bookingDoc = db.collection("bookings").doc(bookingRef);
    const snap = await bookingDoc.get();

    if (!snap.exists) {
      throw new HttpsError("not-found", "We could not find this booking reference. Please check it or contact us.");
    }

    const booking = snap.data();

    if (String(booking.email || "").trim().toLowerCase() !== email) {
      throw new HttpsError("permission-denied", "The email does not match this booking.");
    }

    if (booking.paymentStatus === "Paid") {
      throw new HttpsError("failed-precondition", "This booking has already been paid.");
    }

    if (booking.bookingStatus === "Rejected") {
      throw new HttpsError("failed-precondition", "This booking is not available for payment. Please contact us.");
    }

    // The amount confirmed by Mautour Holidays (Admin → Bookings) always wins.
    const confirmed = Number(booking.confirmedAmount || 0);
    const amount = confirmed > 0 ? confirmed : requestedAmount;

    if (!(amount >= 1 && amount <= 100000)) {
      throw new HttpsError("invalid-argument", "Please enter the amount confirmed by our team.");
    }

    return signPayment({
      bookingRef,
      amountEur: amount,
      email,
      name: booking.name || request.data?.name || "",
      amountSource: confirmed > 0 ? "confirmedAmount" : "customer"
    });
  }
);

/* ---------------- 1b. cart checkout ---------------- */

function makeBookingRef() {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  crypto.randomBytes(5).forEach((n) => (code += alphabet[n % alphabet.length]));
  return `MT${ymd}-${code}`;
}

const text = (v, max = 200) => String(v ?? "").trim().slice(0, max);

exports.createCartCheckout = onCall(
  { secrets: [ABSA_PROFILE_ID, ABSA_ACCESS_KEY, ABSA_SECRET_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Please sign in to pay for your cart.");
    }

    const email = String(request.auth.token.email || "").toLowerCase();
    if (!email) throw new HttpsError("failed-precondition", "Your account needs an email address to pay.");

    const items = Array.isArray(request.data?.items) ? request.data.items.slice(0, 20) : [];
    const contact = request.data?.contact || {};
    const t = request.data?.traveller || {};
    const traveller = {
      address: text(t.address),
      nationality: text(t.nationality, 60),
      idType: text(t.idType, 20),
      idNumber: text(t.idNumber, 40),
      age: Number(t.age || 0),
      gender: text(t.gender, 30)
    };

    if (!items.length) throw new HttpsError("invalid-argument", "Your cart is empty.");
    if (!text(contact.name) || !text(contact.phone)) throw new HttpsError("invalid-argument", "Please enter your name and phone number.");
    if (!traveller.address || !traveller.nationality || !traveller.idNumber || !(traveller.age > 0) || !traveller.gender) {
      throw new HttpsError("invalid-argument", "Please complete the lead traveller details.");
    }

    const today = new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 10); // Mauritius date
    const priced = [];

    for (const raw of items) {
      const date = text(raw.date, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) {
        throw new HttpsError("invalid-argument", "Every item needs a travel date of today or later.");
      }

      if (raw.type === "vehicle") {
        const snap = await db.collection("vehicles").doc(text(raw.refId, 64)).get();
        const vehicle = snap.exists ? snap.data() : null;
        const passengers = Math.floor(Number(raw.passengers || 0));
        if (!(passengers >= 1)) throw new HttpsError("invalid-argument", "Please enter the number of passengers.");
        if (vehicle?.capacity && passengers > Number(vehicle.capacity)) {
          throw new HttpsError("invalid-argument", `${vehicle.name} takes up to ${vehicle.capacity} passengers.`);
        }
        const r = priceVehicleItem({ service: raw.service }, vehicle);
        if (!r.ok) throw new HttpsError("failed-precondition", `${vehicle?.name || "Vehicle"}: ${r.error}`);
        priced.push({
          type: "vehicle",
          refId: snap.id,
          title: r.lines[0].label,
          service: text(raw.service, 20),
          date,
          time: text(raw.time, 5),
          pickup: text(raw.pickup),
          dropoff: text(raw.dropoff),
          passengers,
          bags: Math.max(0, Math.floor(Number(raw.bags || 0))),
          flight: text(raw.flight, 20),
          notes: text(raw.notes, 500),
          lines: r.lines,
          total: r.total
        });
      } else {
        const snap = await db.collection("trips").doc(text(raw.refId, 64)).get();
        const trip = snap.exists ? { id: snap.id, ...snap.data() } : null;
        const people = Math.floor(Number(raw.people || 0));
        if (!(people >= 1 && people <= 50)) throw new HttpsError("invalid-argument", "Please enter the number of people.");
        let vehicle = null;
        if (raw.vehicleId) {
          const vs = await db.collection("vehicles").doc(text(raw.vehicleId, 64)).get();
          vehicle = vs.exists ? vs.data() : null;
        }
        const activities = (Array.isArray(raw.activities) ? raw.activities : []).slice(0, 20).map((a) => text(a, 120));
        const r = pricePackageItem({ people, activities, vehicleId: raw.vehicleId }, trip, vehicle);
        if (!r.ok) throw new HttpsError("failed-precondition", `${trip?.title || "Package"}: ${r.error}`);
        priced.push({
          type: "package",
          refId: snap.id,
          title: trip.title,
          date,
          people,
          activities,
          vehicleId: raw.vehicleId ? text(raw.vehicleId, 64) : "",
          vehicleName: vehicle?.name || "",
          notes: text(raw.notes, 500),
          lines: r.lines,
          total: r.total
        });
      }
    }

    const total = roundMoney(priced.reduce((s, p) => s + p.total, 0));
    if (!(total >= 1 && total <= 100000)) throw new HttpsError("invalid-argument", "The cart total is not valid.");

    const expected = Number(request.data?.expectedTotal || 0);
    if (expected && Math.abs(expected - total) > 0.009) {
      throw new HttpsError(
        "failed-precondition",
        `Prices have changed since you added these items. The new total is € ${total}. Please review your cart.`
      );
    }

    const bookingRef = makeBookingRef();
    await db.collection("bookings").doc(bookingRef).set({
      bookingRef,
      type: "cart",
      source: "website-cart",
      userId: request.auth.uid,
      name: text(contact.name, 100),
      email,
      phone: text(contact.phone, 40),
      ...traveller,
      items: priced,
      package: priced.map((p) => p.title).join(" + "),
      date: priced.map((p) => p.date).sort()[0],
      people: Math.max(...priced.map((p) => p.people || p.passengers || 0)),
      vehicleName: priced.filter((p) => p.type === "vehicle").map((p) => p.title).join(", "),
      totalPrice: total,
      confirmedAmount: total,
      estimatedFrom: total,
      currency: "EUR",
      bookingStatus: "Pending",
      paymentStatus: "Unpaid",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const payment = await signPayment({
      bookingRef,
      amountEur: total,
      email,
      name: contact.name,
      amountSource: "cart"
    });

    return { ...payment, bookingRef, total };
  }
);

/* ---------------- 2. CyberSource response ---------------- */

exports.absaPaymentResponse = onRequest(
  { secrets: [ABSA_SECRET_KEY] },
  async (req, res) => {
    const site = SITE_URL.value().replace(/\/$/, "");
    const body = req.body || {};

    const back = (params) =>
      res.redirect(303, `${site}/success.html?${new URLSearchParams(params).toString()}`);

    if (req.method !== "POST" || !body.signed_field_names) {
      return back({ status: "error" });
    }

    const expected = sign(body, ABSA_SECRET_KEY.value());
    if (!safeEqual(expected, body.signature)) {
      logger.warn("Invalid CyberSource signature", { ref: body.req_reference_number });
      return back({ status: "error" });
    }

    const decision = String(body.decision || "ERROR").toUpperCase();
    const bookingRef = String(body.req_reference_number || "").toUpperCase();
    const transactionUuid = String(body.req_transaction_uuid || "");
    const paymentDoc = transactionUuid ? db.collection("payments").doc(transactionUuid) : null;
    const bookingDoc = bookingRef ? db.collection("bookings").doc(bookingRef) : null;

    let receiptNumber = "";

    try {
      await db.runTransaction(async (tx) => {
        const pay = paymentDoc ? await tx.get(paymentDoc) : null;
        const already = pay?.exists && pay.data().receiptNumber;

        receiptNumber = decision === "ACCEPT" ? already || makeReceiptNumber(bookingRef) : "";

        const result = {
          status: decision,
          reasonCode: body.reason_code || "",
          message: String(body.message || "").slice(0, 300),
          transactionId: body.transaction_id || "",
          authAmount: Number(body.auth_amount || body.req_amount || 0),
          currency: body.req_currency || "",
          cardType: body.req_card_type || "",
          cardLast4: String(body.req_card_number || "").slice(-4),
          receiptNumber,
          respondedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (paymentDoc) tx.set(paymentDoc, result, { merge: true });

        if (bookingDoc) {
          const update =
            decision === "ACCEPT"
              ? {
                  paymentStatus: "Paid",
                  paidAmount: result.authAmount,
                  paidCurrency: result.currency,
                  receiptNumber,
                  transactionId: result.transactionId,
                  paidAt: admin.firestore.FieldValue.serverTimestamp()
                }
              : decision === "CANCEL"
              ? { paymentStatus: "Unpaid" }
              : { paymentStatus: decision === "REVIEW" ? "Payment under review" : "Payment failed" };

          tx.set(bookingDoc, { ...update, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }
      });
    } catch (error) {
      logger.error("Payment response processing failed", error);
      return back({ status: "error", ref: bookingRef });
    }

    return back({
      status: decision.toLowerCase(),
      ref: bookingRef,
      ...(receiptNumber ? { receipt: receiptNumber } : {})
    });
  }
);

/* ---------------- 3. verified receipt for success.html ---------------- */

exports.getPaymentStatus = onCall(async (request) => {
  const bookingRef = String(request.data?.bookingRef || "").trim().toUpperCase();
  const receipt = String(request.data?.receipt || "").trim().toUpperCase();

  if (!bookingRef || !receipt) {
    throw new HttpsError("invalid-argument", "Missing booking reference or receipt.");
  }

  const snap = await db.collection("bookings").doc(bookingRef).get();
  if (!snap.exists || String(snap.data().receiptNumber || "").toUpperCase() !== receipt) {
    throw new HttpsError("not-found", "Receipt not found.");
  }

  const b = snap.data();
  return {
    bookingRef,
    receiptNumber: b.receiptNumber,
    name: b.name || "",
    item: b.package || "",
    date: b.date || "",
    amount: b.paidAmount || 0,
    currency: b.paidCurrency || "",
    transactionId: b.transactionId || "",
    paidAt: b.paidAt && typeof b.paidAt.toDate === "function" ? b.paidAt.toDate().toISOString() : ""
  };
});

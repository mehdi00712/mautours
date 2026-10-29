/**
 * Mautour Holidays – Absa payment gateway (Fiserv IPG "Checkouts" API)
 *
 * createCartCheckout  (callable) – signed-in customer pays the cart. Every price is
 *                                  re-read from the database and recalculated.
 * createAbsaPayment   (callable) – pay an existing booking by reference + email
 *                                  (price set in Admin → Bookings).
 * fiservReturn        (HTTP GET) – customer comes back from the payment page; the status
 *                                  is checked with Fiserv, then the customer is sent to
 *                                  success.html with a receipt number.
 * fiservWebhook       (HTTP POST)– Fiserv's server notification; the status is always
 *                                  re-checked with Fiserv before anything is marked Paid.
 * getPaymentStatus    (callable) – verified receipt for success.html.
 *
 * Secrets (Firebase Secret Manager – never in code, GitHub or the admin page):
 *   firebase functions:secrets:set FISERV_API_KEY
 *   firebase functions:secrets:set FISERV_API_SECRET
 * Settings (functions/.env):
 *   FISERV_STORE_ID   your Store ID
 *   ABSA_ENV          test | live
 *   ABSA_CURRENCY     EUR | MUR | …   (must be allowed on your Absa store)
 *   ABSA_EUR_RATE     only if currency is not EUR (units per €1)
 *   SITE_URL          https://mautours.com
 *   FISERV_BASE_URL   optional – only if Absa gives you a different API address
 */

const crypto = require("crypto");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret, defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

setGlobalOptions({
  region: "us-central1",
  serviceAccount: "mautours-functions-runtime@mautours-60318.iam.gserviceaccount.com"
});

const FISERV_API_KEY = defineSecret("FISERV_API_KEY");
const FISERV_API_SECRET = defineSecret("FISERV_API_SECRET");

const FISERV_STORE_ID = defineString("FISERV_STORE_ID", { default: "" });
const FISERV_BASE_URL = defineString("FISERV_BASE_URL", { default: "" });
const ABSA_ENV = defineString("ABSA_ENV", { default: "test" });
const ABSA_CURRENCY = defineString("ABSA_CURRENCY", { default: "EUR" });
const SITE_URL = defineString("SITE_URL", { default: "https://mautours.com" });
// Website prices are in EUR. If your Absa store charges in another currency,
// set ABSA_CURRENCY (e.g. MUR) and ABSA_EUR_RATE (e.g. 53.00 = Rs per €1).
const ABSA_EUR_RATE = defineString("ABSA_EUR_RATE", { default: "1" });

const { pricePackageItem, priceVehicleItem, roundMoney } = require("./pricing");

const API_BASES = {
  test: "https://prod.emea.api.fiservapps.com/sandbox/exp/v1",
  live: "https://prod.emea.api.fiservapps.com/exp/v1"
};

const FUNCTIONS_URL = "https://us-central1-mautours-60318.cloudfunctions.net";
const SECRETS = [FISERV_API_KEY, FISERV_API_SECRET];

/* ---------------- helpers ---------------- */

function apiBase() {
  const custom = FISERV_BASE_URL.value().trim().replace(/\/$/, "");
  return custom || API_BASES[ABSA_ENV.value()] || API_BASES.test;
}

// Fiserv message signature: Base64( HMAC-SHA256( secret, apiKey + clientRequestId + timestamp + body ) )
function fiservSignature(apiKey, secret, clientRequestId, timestamp, body) {
  return crypto
    .createHmac("sha256", secret)
    .update(apiKey + clientRequestId + timestamp + body, "utf8")
    .digest("base64");
}

async function fiservRequest(method, path, payload) {
  const apiKey = FISERV_API_KEY.value();
  const secret = FISERV_API_SECRET.value();
  const clientRequestId = crypto.randomUUID();
  const timestamp = String(Date.now());
  const body = payload ? JSON.stringify(payload) : "";

  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Api-Key": apiKey,
      "Client-Request-Id": clientRequestId,
      Timestamp: timestamp,
      "Message-Signature": fiservSignature(apiKey, secret, clientRequestId, timestamp, body)
    },
    body: method === "GET" ? undefined : body
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 500) };
  }

  if (!res.ok) {
    logger.error("Fiserv API error", { status: res.status, path, data });
    throw new HttpsError("unavailable", "The payment gateway is not available right now. Please try again in a few minutes.");
  }
  return data;
}

function clean(value, max = 60) {
  return String(value || "")
    .replace(/[^\p{L}\p{N} .,'@\-_/]/gu, "")
    .trim()
    .slice(0, max);
}

function makeReceiptNumber() {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
  return `RC${ymd}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

/* ---------------- shared: create a Fiserv checkout for a booking ---------------- */

function chargeAmount(amountEur) {
  const currency = ABSA_CURRENCY.value();
  if (currency === "EUR") return { amount: roundMoney(amountEur), currency };
  const rate = Number(ABSA_EUR_RATE.value() || 0);
  if (!(rate > 0)) throw new HttpsError("failed-precondition", "Payment currency is not configured. Please contact us.");
  return { amount: roundMoney(amountEur * rate), currency };
}

async function signPayment({ bookingRef, amountEur, email, name, amountSource }) {
  const storeId = FISERV_STORE_ID.value().trim();
  if (!storeId) throw new HttpsError("failed-precondition", "Online payment is not configured yet. Please contact us.");

  const { amount, currency } = chargeAmount(amountEur);
  const attempt = crypto.randomBytes(3).toString("hex").toUpperCase();
  const merchantTransactionId = `${bookingRef}-${attempt}`;
  const back = (result) =>
    `${FUNCTIONS_URL}/fiservReturn?ref=${encodeURIComponent(bookingRef)}&t=${encodeURIComponent(merchantTransactionId)}&result=${result}`;

  const response = await fiservRequest("POST", "/checkouts", {
    storeId,
    merchantTransactionId,
    transactionOrigin: "ECOM",
    transactionType: "SALE",
    transactionAmount: { total: amount, currency },
    order: {
      orderDetails: { customerId: clean(email, 60), invoiceNumber: bookingRef }
    },
    checkoutSettings: {
      locale: "en_GB",
      webHooksUrl: `${FUNCTIONS_URL}/fiservWebhook`,
      redirectBackUrls: { successUrl: back("success"), failureUrl: back("failure") }
    }
  });

  const checkoutId = response?.checkout?.checkoutId;
  const redirectUrl = response?.checkout?.redirectionUrl;
  if (!checkoutId || !redirectUrl) {
    logger.error("Unexpected Fiserv checkout response", response);
    throw new HttpsError("unavailable", "The payment gateway is not available right now. Please try again in a few minutes.");
  }

  await db.collection("payments").doc(merchantTransactionId).set({
    bookingRef,
    checkoutId,
    merchantTransactionId,
    customerName: clean(name, 80),
    amount,
    currency,
    amountEur: roundMoney(amountEur),
    amountSource,
    status: "Initiated",
    environment: ABSA_ENV.value(),
    createdAt: FieldValue.serverTimestamp()
  });

  await db.collection("bookings").doc(bookingRef).set(
    {
      paymentStatus: "Payment started",
      lastCheckoutId: checkoutId,
      lastPaymentId: merchantTransactionId,
      paymentGateway: "Absa / Fiserv",
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return { redirectUrl };
}

/* ---------------- shared: ask Fiserv for the real status and update the booking ---------------- */

async function syncPayment(paymentId) {
  const payRef = db.collection("payments").doc(paymentId);
  const paySnap = await payRef.get();
  if (!paySnap.exists) return { status: "error" };

  const pay = paySnap.data();
  if (pay.receiptNumber) return { status: "accept", receipt: pay.receiptNumber, bookingRef: pay.bookingRef };

  const details = await fiservRequest("GET", `/checkouts/${encodeURIComponent(pay.checkoutId)}`);
  const status = String(
    details?.transactionStatus || details?.ipgTransactionDetails?.transactionStatus || ""
  ).toUpperCase();
  const approved = details?.approvedAmount || {};
  const approvedTotal = Number(approved.total ?? 0);
  const approvedCurrency = approved.currency || pay.currency;
  const storeOk = !details?.storeId || String(details.storeId) === FISERV_STORE_ID.value().trim();
  const amountOk = Math.abs(approvedTotal - Number(pay.amount)) < 0.01 && approvedCurrency === pay.currency;

  let result;
  let receiptNumber = "";

  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(payRef);
    if (fresh.data().receiptNumber) {
      receiptNumber = fresh.data().receiptNumber;
      result = "accept";
      return;
    }

    const bookingDoc = db.collection("bookings").doc(pay.bookingRef);
    const base = {
      gatewayStatus: status,
      ipgTransactionId: details?.ipgTransactionDetails?.ipgTransactionId || "",
      approvalCode: details?.ipgTransactionDetails?.approvalCode || "",
      checkedAt: FieldValue.serverTimestamp()
    };

    if (status === "APPROVED" && storeOk && amountOk) {
      receiptNumber = makeReceiptNumber();
      result = "accept";
      tx.set(payRef, { ...base, status: "Paid", receiptNumber }, { merge: true });
      tx.set(
        bookingDoc,
        {
          paymentStatus: "Paid",
          paidAmount: approvedTotal,
          paidCurrency: approvedCurrency,
          receiptNumber,
          transactionId: base.ipgTransactionId,
          paidAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    } else if (status === "APPROVED") {
      result = "review";
      logger.error("Approved payment does not match booking", { paymentId, approvedTotal, approvedCurrency, storeOk });
      tx.set(payRef, { ...base, status: "Check amount" }, { merge: true });
      tx.set(bookingDoc, { paymentStatus: "Payment under review" }, { merge: true });
    } else if (status === "WAITING" || status === "") {
      result = "review";
      tx.set(payRef, { ...base, status: "Waiting" }, { merge: true });
    } else {
      result = "decline";
      tx.set(payRef, { ...base, status: "Failed" }, { merge: true });
      tx.set(bookingDoc, { paymentStatus: "Payment failed", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  });

  return { status: result, receipt: receiptNumber, bookingRef: pay.bookingRef };
}

/* ---------------- 1. create & sign payment ---------------- */

exports.createAbsaPayment = onCall(
  { secrets: SECRETS },
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
  { secrets: SECRETS },
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
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
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

/* ---------------- 2. customer returns from the payment page ---------------- */

exports.fiservReturn = onRequest({ secrets: SECRETS }, async (req, res) => {
  const site = SITE_URL.value().replace(/\/$/, "");
  const ref = String(req.query.ref || "").toUpperCase();
  const paymentId = String(req.query.t || "");
  const back = (params) => res.redirect(303, `${site}/success.html?${new URLSearchParams(params).toString()}`);

  if (!paymentId) return back({ status: "error", ref });

  try {
    const r = await syncPayment(paymentId);
    if (r.bookingRef && r.bookingRef !== ref) return back({ status: "error" });
    return back({ status: r.status, ref, ...(r.receipt ? { receipt: r.receipt } : {}) });
  } catch (error) {
    logger.error("fiservReturn failed", error);
    return back({ status: req.query.result === "failure" ? "decline" : "review", ref });
  }
});

/* ---------------- 2b. Fiserv server notification (webhook) ---------------- */

exports.fiservWebhook = onRequest({ secrets: SECRETS }, async (req, res) => {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const checkoutId = String(body.checkoutId || "");
    const merchantId = String(body.merchantTransactionId || "");

    let paymentId = merchantId;
    if (!paymentId && checkoutId) {
      const q = await db.collection("payments").where("checkoutId", "==", checkoutId).limit(1).get();
      paymentId = q.empty ? "" : q.docs[0].id;
    }

    // Never trust the notification itself – syncPayment asks Fiserv for the real status.
    if (paymentId) await syncPayment(paymentId);
  } catch (error) {
    logger.error("fiservWebhook failed", error);
  }
  res.status(200).send("OK");
});

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

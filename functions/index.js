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

    const nameParts = clean(booking.name || request.data?.name, 80).split(/\s+/);
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
      currency: ABSA_CURRENCY.value(),
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
      amount: Number(fields.amount),
      currency: fields.currency,
      amountSource: confirmed > 0 ? "confirmedAmount" : "customer",
      status: "Initiated",
      environment: ABSA_ENV.value(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await bookingDoc.update({
      paymentStatus: "Payment started",
      lastTransactionUuid: transactionUuid,
      paymentGateway: "Absa / CyberSource",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      endpoint: ENDPOINTS[ABSA_ENV.value()] || ENDPOINTS.test,
      fields
    };
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

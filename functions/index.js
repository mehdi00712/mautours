const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();

setGlobalOptions({
  region: "us-central1",
  serviceAccount: "mautours-functions-runtime@mautours-60318.iam.gserviceaccount.com"
});

exports.createAbsaPayment = onCall(async (request) => {
  const {
    bookingId,
    amount,
    customerName,
    customerEmail,
    packageName
  } = request.data;

  if (!bookingId || !amount || !customerName || !customerEmail || !packageName) {
    throw new HttpsError(
      "invalid-argument",
      "Missing required payment details."
    );
  }

  const paymentUrl =
    `https://secureacceptance.cybersource.com/pay?bookingId=${bookingId}&amount=${amount}`;

  await admin.firestore().collection("bookings").doc(bookingId).update({
    paymentRequestCreated: true,
    paymentGateway: "Absa/CyberSource",
    paymentAmount: amount,
    paymentPackage: packageName,
    paymentCustomerEmail: customerEmail,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    success: true,
    paymentUrl
  };
});
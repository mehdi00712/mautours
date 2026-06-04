const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createAbsaPayment = functions.https.onCall(async (data, context) => {
  const {
    bookingId,
    amount,
    customerName,
    customerEmail,
    packageName
  } = data;

  if (!bookingId || !amount || !customerName || !customerEmail || !packageName) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required payment details."
    );
  }

  /*
    IMPORTANT:
    Replace this part with the official Absa/CyberSource request
    once Absa gives the client the merchant credentials.

    Do NOT put merchant ID, access key, or secret key in frontend JS.
  */

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

# Absa / CyberSource payment – setup (Mautour Holidays)

The website code is ready. Card payments start working after the 5 steps below.
**Never put the Secret Key in the code, on GitHub, in WhatsApp or in a chat.** It goes only into Firebase Secret Manager (step 3).

## What you need
- From Absa (CyberSource Business Center → Payment Configuration → Secure Acceptance Settings → your profile):
  **Profile ID**, **Access Key**, **Secret Key**. Test and live profiles have *different* keys.
- Your Firebase project **mautours-60318** on the **Blaze (pay-as-you-go)** plan. Cloud Functions require it; at your volumes the cost is normally €0.
- A computer with **Node.js 20** installed.

## 1. Install the Firebase tools (once)
```bash
npm install -g firebase-tools
firebase login            # sign in with the Google account that owns mautours-60318
```

## 2. Get the code
```bash
git clone https://github.com/mehdi00712/mautours.git
cd mautours/functions
npm install
cd ..
firebase use mautours-60318
```

## 3. Store your Absa keys as secrets (paste each one when asked)
```bash
firebase functions:secrets:set ABSA_PROFILE_ID
firebase functions:secrets:set ABSA_ACCESS_KEY
firebase functions:secrets:set ABSA_SECRET_KEY
```

## 4. Settings file
Create `functions/.env` with:
```
ABSA_ENV=test
ABSA_CURRENCY=EUR
SITE_URL=https://mautours.com
```
- `ABSA_ENV`: `test` while testing, `live` when you go live (and use the live profile keys in step 3).
- `ABSA_CURRENCY`: must be a currency your Absa merchant account accepts (ask Absa: EUR, MUR or USD). The website shows prices in EUR – if Absa only allows MUR, tell us and we will convert at checkout.

## 5. Deploy the payment functions and the security rules
```bash
firebase deploy --only functions,firestore:rules
```
If you see a permission error about secrets, open Google Cloud Console → IAM and give the service account
`mautours-functions-runtime@mautours-60318.iam.gserviceaccount.com` the roles **Secret Manager Secret Accessor** and **Cloud Datastore User**, then deploy again.

## 6. In the CyberSource Business Center (Secure Acceptance profile)
- **Customer Response → Transaction Response Page**: choose "Hosted by you" and enter
  `https://us-central1-mautours-60318.cloudfunctions.net/absaPaymentResponse`
- **Custom Cancel Response Page**: same address.
- (The website also sends this address with every payment.)
- Make sure the profile is **Active / Promoted**.

## 7. Test
1. Make a test booking on the website (package or vehicle) – note the reference, e.g. `MT261028-AB3CD`.
2. In **Admin → Bookings**, type the price in the "Set €" box and click **Save**.
3. Go to **Pay Online**, enter the reference + email, pay with the CyberSource test card `4111 1111 1111 1111`, any future expiry, CVV `123`.
4. You should land on the receipt page with a receipt number, and Admin → Bookings shows **Paid** + the receipt.

When the test works: set `ABSA_ENV=live`, replace the 3 secrets with your **live** keys (step 3), and run step 5 again.

## How it works (for your records)
- `createAbsaPayment` – checks the booking reference and email, uses the price you saved in Admin (or the amount the customer entered if you haven't set one), signs the request with HMAC-SHA256 and sends the customer to Absa's secure page.
- `absaPaymentResponse` – receives the bank's answer, verifies its signature, marks the booking **Paid**, creates a **receipt number** and redirects the customer to `success.html`.
- `getPaymentStatus` – shows the verified receipt on `success.html`.
- Card numbers never touch the website or Firebase.

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
ABSA_EUR_RATE=1
SITE_URL=https://mautours.com
```
- `ABSA_ENV`: `test` while testing, `live` when you go live (and use the live profile keys in step 3).
- `ABSA_CURRENCY`: must be a currency your Absa merchant account accepts (ask Absa: EUR, MUR or USD).
- `ABSA_EUR_RATE`: only if the currency is **not** EUR. Website prices are in euros; this is how many units of your currency equal €1 (e.g. `53.00` for MUR). Update it when the rate changes and redeploy.

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
**Cart checkout (main way customers pay)**
1. Create a customer account on the website (Sign in → Create account).
2. Add a package and a vehicle to the cart, open the cart, fill in the checkout form and click **Pay € … securely**.
3. Pay with the CyberSource test card `4111 1111 1111 1111`, any future expiry, CVV `123`.
4. You land on the receipt page with a receipt number; the booking shows **Paid** in Admin → Bookings and in the customer's **My account**.

**Pay by reference (for prices agreed on WhatsApp)**
1. In **Admin → Bookings**, type the agreed price in the "Set €" box and click **Save**.
2. The customer goes to **Pay Online** (or "Pay" in My account), enters the reference + email and pays.

When the test works: set `ABSA_ENV=live`, replace the 3 secrets with your **live** keys (step 3), and run step 5 again.

## How it works (for your records)
- `createCartCheckout` – customer must be signed in. Re-reads every price from the database, recalculates the total with the same calculator the cart uses (`functions/pricing.js`), creates the booking with all items, and signs the payment for exactly that total.
- `createAbsaPayment` – checks the booking reference and email, uses the price you saved in Admin (or the amount the customer entered if you haven't set one), signs the request with HMAC-SHA256 and sends the customer to Absa's secure page.
- `absaPaymentResponse` – receives the bank's answer, verifies its signature, marks the booking **Paid**, creates a **receipt number** and redirects the customer to `success.html`.
- `getPaymentStatus` – shows the verified receipt on `success.html`.
- Card numbers never touch the website or Firebase.

# Absa payment gateway (Fiserv IPG) – setup for Mautour Holidays

Absa's online payments run on **Fiserv IPG** ("Checkouts" API). Absa gave you three values:

| From Absa | What it is | Where it goes |
|---|---|---|
| **Store ID** | your shop number (not secret) | `functions/.env` → `FISERV_STORE_ID` |
| **API Key** | identifies your website (keep private) | Firebase secret `FISERV_API_KEY` |
| **Secret Key** | signs every payment (**keep secret**) | Firebase secret `FISERV_API_SECRET` |

**Never put the API Key or Secret Key in the website, the admin page, GitHub, WhatsApp, email or a chat.** They go only into Firebase Secret Manager (step 3).
The UAT keys Absa sent are for **testing**. You will receive different keys for **live** payments.

## What you need
- Your Firebase project **mautours-60318** on the **Blaze (pay-as-you-go)** plan (required for Cloud Functions; normally €0 at your volume).
- A computer with **Node.js 20**.

## 1. Install the Firebase tools (once)
```bash
npm install -g firebase-tools
firebase login            # Google account that owns mautours-60318
```

## 2. Get the code
```bash
git clone https://github.com/mehdi00712/mautours.git
cd mautours/functions
npm install
cd ..
firebase use mautours-60318
```

## 3. Store the two keys as secrets (paste each one when asked – nothing shows on screen)
```bash
firebase functions:secrets:set FISERV_API_KEY
firebase functions:secrets:set FISERV_API_SECRET
```

## 4. Settings file
Create the file `functions/.env` (it is ignored by GitHub) with:
```
FISERV_STORE_ID=your-store-id-here
ABSA_ENV=test
ABSA_CURRENCY=EUR
ABSA_EUR_RATE=1
SITE_URL=https://mautours.com
```
- `ABSA_ENV`: `test` with the UAT keys, `live` when Absa gives you the live keys.
- `ABSA_CURRENCY`: a currency your Absa store accepts – **ask Absa** (EUR, MUR or USD).
- `ABSA_EUR_RATE`: only if the currency is not EUR. Website prices are in euros; this is how many units equal €1 (e.g. `53.00` for MUR).
- If Absa gives you a different API address than the standard Fiserv one, add `FISERV_BASE_URL=...` (e.g. `https://prod.emea.api.fiservapps.com/sandbox/exp/v1`).

## 5. Deploy the payment functions and the security rules
```bash
firebase deploy --only functions,firestore:rules
```
If you see a permission error about secrets, open Google Cloud Console → IAM and give the service account
`mautours-functions-runtime@mautours-60318.iam.gserviceaccount.com` the roles **Secret Manager Secret Accessor** and **Cloud Datastore User**, then deploy again.

## 6. Tell Absa these two addresses (if they ask)
- Webhook / notification URL: `https://us-central1-mautours-60318.cloudfunctions.net/fiservWebhook`
- Return URL: `https://us-central1-mautours-60318.cloudfunctions.net/fiservReturn`
(The website already sends both with every payment.)

## 7. Test (UAT)
**Cart checkout**
1. Create a customer account on the website (Sign in → Create account) – not the admin account.
2. Add a package and a vehicle, open the cart, fill in checkout, click **Pay € … securely**.
3. On the Absa/Fiserv test page use the **test card numbers from Absa's integration guide**.
4. You come back to the receipt page with a receipt number; Admin → Bookings shows **Paid**; you can also see it in the Absa virtual terminal (test.ipg-online.com).

**Pay by reference** (price agreed on WhatsApp)
1. Admin → Bookings → type the price in "Set €" → Save.
2. Customer: Pay Online → reference + email → pay.

**Going live:** put the live keys in step 3, set `ABSA_ENV=live` (and the live Store ID), run step 5 again.

## Two Absa routes (automatic)
The website first tries Fiserv's **Checkouts** page. If Absa's store is not enabled for it, it automatically uses the
**Absa payment link** (IPG REST API, `test.ipg-online.com` / `www.ipg-online.com`) with the same API Key and Secret:
the customer clicks **Open Absa secure payment**, pays in a new tab, and the website shows the receipt as soon as
Absa approves the payment. Optional settings in `functions/.env`:
- `ABSA_ROUTE=auto` (default), `checkouts` or `paymenturl` – force one route.
- `IPG_BASE_URL=...` – only if Absa gives you a different IPG REST API address.

## How it works
- `createCartCheckout` – customer must be signed in; every price is re-read from the database and recalculated (`functions/pricing.js`); a Fiserv checkout is created for exactly that total.
- `createAbsaPayment` – pays an existing booking using the price you set in Admin.
- Each request to Fiserv is signed: Base64(HMAC-SHA256(Secret Key, API Key + Client-Request-Id + Timestamp + body)).
- `fiservReturn` / `fiservWebhook` – when the customer comes back or Fiserv notifies us, the server **asks Fiserv for the real status** and only marks the booking **Paid** if the status is APPROVED and the amount and currency match. A receipt number is created once.
- Card numbers are entered only on the bank's page – never on the website or in Firebase.

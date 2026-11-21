# KaamDaar payment collection setup

The app has no payment gateway or payment backend configured. Until one is connected, cash can be recorded only after the worker explicitly confirms receipt. UPI and In-App Wallet remain **Payment Pending**; the app does not display a generated/fake QR or mark them received.

## Frontend configuration

Set `VITE_PAYMENT_API_URL` to the HTTPS origin of your payment API in `.env.local` and in the Vercel project environment variables, then redeploy. This variable is an API URL, not a secret. Do not expose gateway keys or webhook secrets in any `VITE_*` variable.

## Required authenticated API

All endpoints must require `Authorization: Bearer <Firebase ID token>`. Verify the token on the server with Firebase Admin, confirm the authenticated worker owns the job, and calculate the payable amount from trusted job/payment records instead of trusting the client amount.

### Create a UPI or wallet payment

`POST /v1/payment-intents`

Request JSON:

```json
{
  "jobId": "job-id",
  "amount": 1200,
  "currency": "INR",
  "method": "upi"
}
```

`method` is `upi` or `wallet`. Return a gateway-backed intent:

```json
{
  "id": "server-payment-intent-id",
  "status": "pending",
  "upiUrl": "upi://pay?...",
  "qrCodeDataUrl": "data:image/png;base64,...",
  "reference": "gateway-reference"
}
```

Return `upiUrl` for UPI and a real `qrCodeDataUrl` generated from the gateway intent for In-App Wallet. Do not return a QR containing arbitrary text or mark the intent paid on creation.

### Verify payment

`GET /v1/payment-intents/{id}`

Return the gateway-verified state, for example `{ "id": "...", "status": "paid", "reference": "..." }`. The server must update payment state from a verified gateway callback/webhook (signature checked with a server-only secret) and enforce idempotency. Client-side redirects and screenshots are not proof of payment.

The UI polls only when the worker taps **Verify payment**. A `pending`, `failed`, or `expired` response never marks payment as received. Cash confirmation is a worker attestation because cash has no automatic digital verification.

## Provider setup still needed

Choose and configure an RBI-compliant payment provider that supports the intended UPI collection/QR flow and settlement to worker balances. Implement the two endpoints above, Firebase token verification, provider webhook signature verification, job ownership/amount validation, idempotency, and reconciliation. Store provider keys and webhook secrets only in server-side environment variables. Configure API CORS for the KaamDaar production origin and use HTTPS.

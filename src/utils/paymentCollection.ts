import { PaymentCollectionMethod } from '../types';
import { getFirebaseIdToken } from './firebaseAuth';

export interface PaymentIntent {
  id: string;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  qrCodeDataUrl?: string;
  upiUrl?: string;
  reference?: string;
}

const paymentApiBase = (import.meta.env.VITE_PAYMENT_API_URL as string | undefined)?.replace(/\/$/, '');

async function paymentApiRequest(path: string, init: RequestInit = {}) {
  if (!paymentApiBase) throw new Error('Payment collection is not configured. Add VITE_PAYMENT_API_URL and configure the payment backend.');
  const token = await getFirebaseIdToken();
  const response = await fetch(`${paymentApiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message || `Payment service returned ${response.status}.`);
  }
  return response.json() as Promise<PaymentIntent>;
}

export const isPaymentCollectionConfigured = () => Boolean(paymentApiBase);

export function createPaymentIntent(input: {
  jobId: string;
  amount: number;
  method: Exclude<PaymentCollectionMethod, 'cash'>;
}) {
  return paymentApiRequest('/v1/payment-intents', {
    method: 'POST',
    body: JSON.stringify({ ...input, currency: 'INR' }),
  });
}

export function checkPaymentIntent(paymentIntentId: string) {
  return paymentApiRequest(`/v1/payment-intents/${encodeURIComponent(paymentIntentId)}`);
}

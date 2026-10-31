import type { PaymentFailure, RazorpayOrderOptions, RazorpaySuccess } from '../api/types';

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

interface RazorpayInstance {
  open(): void;
  on(event: 'payment.failed', handler: (resp: { error: PaymentFailure }) => void): void;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let loading: Promise<RazorpayConstructor> | null = null;

/** Loads Razorpay Checkout once, only when the member reaches the pay step. */
export function loadRazorpay(): Promise<RazorpayConstructor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () =>
      window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Razorpay failed to load'));
    script.onerror = () => {
      loading = null;
      reject(new Error('Could not load the payment window. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export type CheckoutResult =
  | { outcome: 'success'; payment: RazorpaySuccess }
  | { outcome: 'failed'; error: PaymentFailure }
  | { outcome: 'dismissed' };

/** Opens Razorpay Checkout and resolves when the member pays, fails or closes it. */
export async function openCheckout(
  options: RazorpayOrderOptions,
  prefill: { contact?: string | null } = {},
): Promise<CheckoutResult> {
  const Razorpay = await loadRazorpay();
  return new Promise((resolve) => {
    let settled = false;
    const settle = (result: CheckoutResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    // Razorpay keeps its window open after a failed attempt so the member can retry
    // inside it; the failure is reported only if they then close the window.
    let lastError: PaymentFailure | null = null;

    const rzp = new Razorpay({
      key: options.keyId,
      order_id: options.orderId,
      amount: options.amount,
      currency: options.currency,
      name: options.name,
      description: options.description,
      prefill: { ...options.prefill, contact: prefill.contact ?? undefined },
      notes: options.notes,
      theme: { color: '#C8102E' },
      handler: (payment: RazorpaySuccess) => settle({ outcome: 'success', payment }),
      modal: {
        confirm_close: true,
        ondismiss: () =>
          settle(lastError ? { outcome: 'failed', error: lastError } : { outcome: 'dismissed' }),
      },
    });
    rzp.on('payment.failed', (resp) => {
      lastError = resp.error;
    });
    rzp.open();
  });
}

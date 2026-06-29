/**
 * Razorpay Checkout (web) loader. Used by the owner subscription flow only —
 * customer payments are UPI-intent + manual verification and never touch this.
 */

const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let loadPromise = null;

/** Lazily inject the Razorpay Checkout script. Resolves true when ready. */
export function loadRazorpayCheckout() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => {
        loadPromise = null;
        resolve(false);
      });
      if (window.Razorpay) resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      loadPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return loadPromise;
}

/**
 * Open Razorpay Checkout for a subscription created on the backend.
 *
 * `order` is the `/subscriptions/create` payload
 * ({ subscription_id, key_id, amount, currency, customer_id }).
 * Resolves with the Razorpay handler response (payment id + signature) on
 * success, or rejects with an Error when the script can't load / user dismisses.
 */
export async function openSubscriptionCheckout(order, { name, email, contact } = {}) {
  const ready = await loadRazorpayCheckout();
  if (!ready || !window.Razorpay) {
    throw new Error('RAZORPAY_SCRIPT_UNAVAILABLE');
  }

  return new Promise((resolve, reject) => {
    const options = {
      key: order.key_id,
      subscription_id: order.subscription_id,
      name: 'TrimiT Pro',
      description: 'TrimiT Pro — monthly subscription',
      currency: order.currency || 'INR',
      handler: (response) => resolve(response),
      prefill: {
        name: name || undefined,
        email: email || undefined,
        contact: contact || undefined,
      },
      theme: { color: '#9a3412' },
      modal: {
        ondismiss: () => reject(new Error('RAZORPAY_CHECKOUT_DISMISSED')),
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (resp) => {
      reject(new Error(resp?.error?.description || 'RAZORPAY_PAYMENT_FAILED'));
    });
    rzp.open();
  });
}

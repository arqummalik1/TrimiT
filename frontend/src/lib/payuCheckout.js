/**
 * payuCheckout.js — build and auto-submit the PayU hosted-checkout form.
 * ─────────────────────────────────────────────────────────────────────────────
 * PayU hosted checkout is an HTML form POSTed to PayU's `_payment` endpoint with
 * the signed params returned by the backend. The browser is redirected to PayU's
 * secure capture UI — no card data ever touches TrimiT (Req 13.1).
 *
 * TODO(PayU): the hosted-checkout URL (test vs live) defaults to `test` because
 * the backend does not return the mode in the order params. Confirm/inject the
 * live URL once PayU split settlement is activated.
 *
 * Requirements: 4.5, 17.4
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** PayU hosted-checkout form endpoints (auto-POST target). */
export const PAYU_CHECKOUT_URL = {
  test: 'https://test.payu.in/_payment',
  live: 'https://secure.payu.in/_payment',
};

/** sessionStorage key holding the booking id awaiting a PayU result. */
export const PAYU_PENDING_BOOKING_KEY = 'trimit.payu.pendingBookingId';

/**
 * Build a detached <form> for the PayU params, attach it to <body>, and submit.
 * This navigates the browser away to PayU. Only string params are forwarded.
 *
 * @param {Record<string, string>} payuParams signed params from create-order.
 * @param {'test'|'live'} [mode='test']
 */
export function submitPayuCheckout(payuParams, mode = 'test') {
  const action = PAYU_CHECKOUT_URL[mode] || PAYU_CHECKOUT_URL.test;

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.style.display = 'none';

  Object.entries(payuParams || {}).forEach(([name, value]) => {
    if (typeof value !== 'string') return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

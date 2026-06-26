/**
 * payment.ts — client types for the PayU online-payment path (Layer B).
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirrors the additive backend contract:
 *   POST /api/v1/payments/create-order  (auth + Idempotency-Key)
 *   GET  /api/v1/payments/status?booking_id=...
 *
 * Everything here is additive and flag-gated server-side
 * (`PAYU_PAYOUTS_ENABLED`, OFF by default). While the flag is OFF the
 * create-order endpoint returns 403 `ONLINE_PAYMENT_DISABLED`; the client
 * treats that as "online payments unavailable" and falls back to pay-at-salon.
 *
 * No `any` types. Sensitive card data never touches the client — PayU hosts
 * capture; we only ever forward the signed `payu` form params to PayU.
 *
 * Requirements: 4.4, 4.5, 17.4, 17.5
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Backend structured-error code returned when the server flag is OFF (Req 4.4, 4.5). */
export const ONLINE_PAYMENT_DISABLED_CODE = 'ONLINE_PAYMENT_DISABLED' as const;

/** PayU hosted-checkout environment. Backend default is "test" until split is live. */
export type PayuMode = 'test' | 'live';

/** PayU hosted-checkout form endpoints (auto-POST target). */
export const PAYU_CHECKOUT_URL: Record<PayuMode, string> = {
  test: 'https://test.payu.in/_payment',
  live: 'https://secure.payu.in/_payment',
};

/**
 * The signed PayU `_payment` form parameters returned by the backend. These are
 * POSTed verbatim to the PayU hosted checkout. `hash` is computed server-side
 * (SHA-512) — the client never computes or alters it.
 *
 * Known fields are typed explicitly; the index signature keeps additive PayU
 * fields (e.g. `splitInfo`, future `udf*`) forwardable without `any`.
 */
export interface PayuParams {
  key: string;
  txnid: string;
  /** Rupee string with 2 decimals, e.g. "100.00" (PayU expects rupees, not paise). */
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  /** Success URL — supplied by the backend, points at the backend callback. */
  surl: string;
  /** Failure URL — supplied by the backend, points at the backend callback. */
  furl: string;
  hash: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  /** Split-settlement payload (JSON string) when present. */
  splitInfo?: string;
  [field: string]: string | undefined;
}

/** Successful `POST /payments/create-order` response (Req 6.1, 6.2, 17.4). */
export interface CreateOrderResponse {
  payment_id: string;
  booking_id: string;
  /** Total payable, integer paise (₹ = amount_paise / 100). */
  amount_paise: number;
  currency: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  payu: PayuParams;
}

/** Lifecycle of a payment as reported by `GET /payments/status`. */
export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

/** Settlement lifecycle (a `paid` payment is NOT yet settled money — Req 16.4). */
export type SettlementStatus = 'pending' | 'settled' | 'failed';

/**
 * `GET /payments/status` response. The backend returns `{status: "unknown"}`
 * (legacy-compatible) when the caller has no matching payment yet, otherwise the
 * full status payload. Modeled as a discriminated union so callers handle both
 * without `any`.
 */
export interface PaymentStatusKnown {
  status?: undefined;
  payment_status: PaymentStatus;
  settlement_status: SettlementStatus | null;
  booking_id: string;
  amount_paise: number | null;
  attempt_count: number | null;
  /** Server-derived retry eligibility (Req 9.5). */
  can_retry: boolean;
}

export interface PaymentStatusUnknown {
  status: 'unknown';
}

export type PaymentStatusResponse = PaymentStatusKnown | PaymentStatusUnknown;

/** Type guard: did the caller already have a payment row? */
export function isKnownPaymentStatus(
  resp: PaymentStatusResponse | undefined | null
): resp is PaymentStatusKnown {
  return !!resp && (resp as PaymentStatusUnknown).status !== 'unknown';
}

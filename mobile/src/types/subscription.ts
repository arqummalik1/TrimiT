export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'payment_failed'
  | 'past_due'
  | 'grace_period';

export interface Subscription {
  id: string;
  owner_id: string;
  salon_id: string | null;
  plan: string;
  status: SubscriptionStatus;
  has_access: boolean;
  is_trial: boolean;
  trial_days_remaining: number;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_renewal_at: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  amount: number; // paise
  currency: string;
  razorpay_subscription_id: string | null;
  created_at: string | null;
}

export interface SubscriptionStatusView {
  status: SubscriptionStatus;
  has_access: boolean;
  is_trial: boolean;
  trial_days_remaining: number;
  next_renewal_at: string | null;
  enforcement_enabled: boolean;
}

export interface SubscriptionPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  razorpay_payment_id: string | null;
  razorpay_invoice_id: string | null;
  paid_at: string | null;
  created_at: string | null;
}

export interface PaymentHistory {
  total_paid: number;
  currency: string;
  payments: SubscriptionPayment[];
}

export interface CreateSubscriptionResponse {
  subscription_id: string;
  key_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  customer_id: string | null;
  already_active?: boolean;
  /** ISO timestamp when the first paid cycle starts (trial stacking). */
  billing_starts_at?: string | null;
}

export interface VerifySubscriptionPayload {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

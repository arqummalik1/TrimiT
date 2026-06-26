/**
 * Payments Help Center content (single source of truth for web).
 *
 * Plain, India-first language. Mirrors the disclosure already shown on the
 * owner Payout Details page (5% TrimiT + 2% gateway = ~7% total, owner nets
 * ~93%). Keep these numbers in sync with:
 *   frontend/src/pages/owner/BankAccountPage.js  (TRIMIT_PERCENT / GATEWAY_PERCENT)
 *   backend/services/commission.py               (commission_percent)
 *
 * Structure:
 *   TOPICS  → grouped help sections rendered on /help/payments
 *   FAQ     → quick question/answer list (also good for SEO + support)
 */

export const PAYMENTS_FEES = {
  trimitPercent: 5,
  gatewayPercent: 2,
  get totalPercent() {
    return this.trimitPercent + this.gatewayPercent;
  },
  get netPercent() {
    return 100 - this.trimitPercent - this.gatewayPercent;
  },
};

export const PAYMENTS_TOPICS = [
  {
    id: 'how-it-works',
    icon: 'flow',
    title: 'How payments work on TrimiT',
    points: [
      'You can pay online while booking, or pay directly at the salon — your choice.',
      'When you pay online, your money is processed securely by our payment partner (PayU).',
      'Once your payment succeeds, your booking is confirmed instantly.',
      'The salon receives the money directly in their own bank account — TrimiT never holds it.',
    ],
  },
  {
    id: 'online-vs-salon',
    icon: 'wallet',
    title: 'Pay online or pay at the salon',
    points: [
      'Pay at salon: book now, pay by cash or card when you visit. Nothing is charged online.',
      'Pay online: pay securely while booking using UPI, cards, net banking, or wallets.',
      'Both options confirm your slot. Pick whatever is convenient for you.',
    ],
  },
  {
    id: 'payment-failed',
    icon: 'warning',
    title: 'My payment failed or money was deducted',
    points: [
      'If a payment fails, your booking is not confirmed and you are not charged.',
      'If money was deducted but the booking did not confirm, do not worry — failed-payment amounts are auto-reversed by your bank, usually within 5–7 working days.',
      'You can simply try booking again, or choose "Pay at salon" instead.',
      'Still seeing an issue after 7 days? Contact us with your booking date and the amount, and we will trace it for you.',
    ],
  },
  {
    id: 'refunds',
    icon: 'refund',
    title: 'Refunds and cancellations',
    points: [
      'If you cancel an eligible booking, your refund is processed back to the same method you paid with.',
      'Refunds typically reach your account within 5–7 working days after they are approved.',
      'Refund eligibility depends on the salon’s cancellation policy and how close to the appointment you cancel.',
      'You will get a notification when your refund is initiated.',
    ],
  },
  {
    id: 'owner-payouts',
    icon: 'bank',
    title: 'For salon owners — getting paid',
    points: [
      'Listing your salon and taking bookings is completely free. There is no monthly subscription.',
      'When a customer pays online, the money is settled directly to your registered bank account.',
      `We only deduct a small commission of about ${PAYMENTS_FEES.totalPercent}% per online booking (${PAYMENTS_FEES.trimitPercent}% TrimiT + ${PAYMENTS_FEES.gatewayPercent}% payment gateway). You keep about ${PAYMENTS_FEES.netPercent}%.`,
      'Add your bank and KYC details once in Payout Details to activate automatic settlements.',
    ],
  },
  {
    id: 'fees',
    icon: 'receipt',
    title: 'Fees and charges',
    points: [
      'For customers: there are no extra TrimiT charges. You pay the salon’s listed price.',
      `For salon owners: free to join, no monthly fees. A ~${PAYMENTS_FEES.totalPercent}% commission applies only on online payments you actually receive.`,
      'No hidden charges. The deduction is shown clearly on your Payout Details screen.',
    ],
  },
  {
    id: 'security',
    icon: 'shield',
    title: 'Is paying on TrimiT safe?',
    points: [
      'Yes. Online payments are handled by PCI-DSS compliant payment partners.',
      'TrimiT never stores your full card number or banking credentials.',
      'Every transaction is encrypted and verified before your booking is confirmed.',
    ],
  },
];

export const PAYMENTS_FAQ = [
  {
    q: 'Do I have to pay online to book?',
    a: 'No. You can always choose "Pay at salon" and pay by cash or card at the salon. Online payment is optional.',
  },
  {
    q: 'My money was deducted but the booking failed. What now?',
    a: 'You are not charged for failed bookings. Any deducted amount is automatically reversed by your bank, usually within 5–7 working days. If it does not, contact us with the date and amount.',
  },
  {
    q: 'How long do refunds take?',
    a: 'Approved refunds typically reach your original payment method within 5–7 working days.',
  },
  {
    q: 'Is it free for salon owners?',
    a: `Yes — listing and taking bookings is free with no monthly subscription. We only take about a ${PAYMENTS_FEES.totalPercent}% commission on online payments (${PAYMENTS_FEES.trimitPercent}% TrimiT + ${PAYMENTS_FEES.gatewayPercent}% gateway), so you keep about ${PAYMENTS_FEES.netPercent}%.`,
  },
  {
    q: 'When do salon owners get their money?',
    a: 'Online payments settle directly to the salon’s own bank account. TrimiT never holds your money.',
  },
  {
    q: 'Which payment methods are supported?',
    a: 'UPI, debit and credit cards, net banking, and popular wallets through our secure payment partner.',
  },
];

export const PAYMENTS_HELP_META = {
  title: 'Payments Help Center',
  subtitle:
    'Everything about paying on TrimiT — how it works, failed payments, refunds, fees, and how salon owners get paid.',
};

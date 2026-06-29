/**
 * Payments Help Center content (single source of truth for web).
 *
 * v1 model: TrimiT never collects customer money. Customers pay the salon
 * directly — either cash at the salon, or by UPI to the salon's own UPI ID.
 * The salon owner verifies the UPI payment, then the booking is confirmed.
 *
 * Structure:
 *   TOPICS  → grouped help sections rendered on /help/payments
 *   FAQ     → quick question/answer list (also good for SEO + support)
 */

export const PAYMENTS_TOPICS = [
  {
    id: 'how-it-works',
    icon: 'flow',
    title: 'How payments work on TrimiT',
    points: [
      'You pay the salon directly — TrimiT never holds your money.',
      'Choose "Cash at Salon" to pay in person, or "Pay with UPI" to pay the salon’s UPI ID from any UPI app.',
      'For UPI, the salon confirms your booking once they see your payment — usually within a few minutes.',
      'You will get a notification the moment your booking is confirmed.',
    ],
  },
  {
    id: 'cash-vs-upi',
    icon: 'wallet',
    title: 'Cash at salon or pay with UPI',
    points: [
      'Cash at salon: book now, pay by cash when you visit.',
      'Pay with UPI: open your UPI app (Google Pay, PhonePe, Paytm, BHIM…) and pay the salon’s UPI ID directly.',
      'After paying by UPI, we show "Waiting for the salon to verify your payment" — the salon confirms shortly.',
    ],
  },
  {
    id: 'after-upi',
    icon: 'warning',
    title: 'I paid by UPI — what happens next?',
    points: [
      'Returning from the UPI app does not instantly confirm your booking.',
      'The salon checks their UPI app and verifies your payment using your booking reference.',
      'Once verified, your booking is confirmed and you get a notification — usually within 2–5 minutes.',
      'If the salon cannot find your payment, they may reject it — you can try again or contact the salon.',
    ],
  },
  {
    id: 'owner-payouts',
    icon: 'bank',
    title: 'For salon owners — getting paid',
    points: [
      'Listing your salon and taking bookings is free.',
      'Customers pay you directly to your UPI ID — the money lands straight in your account.',
      'TrimiT never holds or touches your money. There is no payment commission.',
      'Add your UPI ID once in Payout Details to start accepting UPI bookings.',
    ],
  },
  {
    id: 'security',
    icon: 'shield',
    title: 'Is paying on TrimiT safe?',
    points: [
      'You pay the salon directly through your own trusted UPI app.',
      'TrimiT never stores your card or banking credentials.',
      'Every UPI booking carries a unique reference so the salon can match your payment.',
    ],
  },
];

export const PAYMENTS_FAQ = [
  {
    q: 'How do I pay for a booking?',
    a: 'Choose "Cash at Salon" to pay in person, or "Pay with UPI" to pay the salon’s UPI ID directly from any UPI app.',
  },
  {
    q: 'I paid by UPI but my booking is not confirmed yet. Why?',
    a: 'UPI payments are verified by the salon. Once they see your payment (matched by your booking reference), they confirm the booking — usually within 2–5 minutes.',
  },
  {
    q: 'The salon could not verify my payment. What now?',
    a: 'Please try paying again, or contact the salon directly. TrimiT never holds your money, so any UPI payment is between you and the salon.',
  },
  {
    q: 'Is it free for salon owners?',
    a: 'Yes — listing and taking bookings is free, and customers pay you directly via UPI or cash. TrimiT takes no commission on payments.',
  },
  {
    q: 'When do salon owners get their money?',
    a: 'Immediately — customers pay your UPI ID directly, so the money reaches your account at the time of payment.',
  },
  {
    q: 'Which payment methods are supported?',
    a: 'Cash at the salon, or UPI (Google Pay, PhonePe, Paytm, BHIM, and any UPI app).',
  },
];

export const PAYMENTS_HELP_META = {
  title: 'Payments Help Center',
  subtitle:
    'How paying on TrimiT works — cash or UPI, paid directly to the salon, and how salon owners get paid.',
};

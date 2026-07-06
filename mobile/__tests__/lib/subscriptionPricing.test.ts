import {
  formatMonthlySubscriptionAmount,
  formatMonthlySubscriptionLabel,
  formatSubscribeCta,
} from '../../src/lib/subscriptionPricing';

describe('subscriptionPricing', () => {
  it('formats paise as rupee labels', () => {
    expect(formatMonthlySubscriptionAmount(29900)).toBe('₹299');
    expect(formatMonthlySubscriptionAmount(500)).toBe('₹5');
    expect(formatMonthlySubscriptionLabel(29900)).toBe('₹299 / month');
    expect(formatSubscribeCta(500)).toBe('Subscribe ₹5/month');
  });
});

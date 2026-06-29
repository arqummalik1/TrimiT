/**
 * Unit tests for src/types/payment.ts — isPendingVerification.
 * This drives whether the PaymentWaiting screen keeps polling.
 */
import {
  isPendingVerification,
  PaymentVerificationStatus,
} from '../../src/types/payment';

describe('isPendingVerification', () => {
  it('is true while the payment is still in-flight', () => {
    expect(isPendingVerification('initiated')).toBe(true);
    expect(isPendingVerification('waiting_verification')).toBe(true);
  });

  it('is false once the payment reaches a final state', () => {
    const finals: PaymentVerificationStatus[] = [
      'verified',
      'rejected',
      'timeout',
      'not_required',
    ];
    finals.forEach((s) => expect(isPendingVerification(s)).toBe(false));
  });

  it('is false for null/undefined', () => {
    expect(isPendingVerification(undefined)).toBe(false);
    expect(isPendingVerification(null)).toBe(false);
  });
});

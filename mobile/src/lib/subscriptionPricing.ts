/** Subscription display helpers — amounts are always in paise from the API. */

export function formatMonthlySubscriptionAmount(amountPaise: number): string {
  const rupees = Math.round(amountPaise / 100);
  return `₹${rupees}`;
}

export function formatMonthlySubscriptionLabel(amountPaise: number): string {
  return `${formatMonthlySubscriptionAmount(amountPaise)} / month`;
}

export function formatSubscribeCta(amountPaise: number): string {
  return `Subscribe ${formatMonthlySubscriptionAmount(amountPaise)}/month`;
}

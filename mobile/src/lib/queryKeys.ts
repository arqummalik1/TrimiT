export const queryKeys = {
  ownerSalon: ['ownerSalon'] as const,
  ownerAnalytics: (period: string, salonId?: string) =>
    ['ownerAnalytics', period, salonId] as const,
  ownerBookings: ['ownerBookings'] as const,
  recentBookings: ['recentBookings'] as const,
};

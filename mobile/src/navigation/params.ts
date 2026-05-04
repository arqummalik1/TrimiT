import { z } from 'zod';

export const BookingParamsSchema = z.object({
  salonId: z.string().uuid(),
  serviceId: z.string().uuid(),
});

export const PaymentParamsSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().positive(),
  salonName: z.string(),
  serviceName: z.string(),
  bookingDate: z.string(),
  timeSlot: z.string(),
});

export const SalonDetailParamsSchema = z.object({
  salonId: z.string().uuid(),
});

export type BookingParams = z.infer<typeof BookingParamsSchema>;
export type PaymentParams = z.infer<typeof PaymentParamsSchema>;
export type SalonDetailParams = z.infer<typeof SalonDetailParamsSchema>;

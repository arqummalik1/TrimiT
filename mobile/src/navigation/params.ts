import { z } from 'zod';

export const BookingParamsSchema = z.object({
  salonId: z.string().uuid(),
  serviceId: z.string().uuid(),
});

export const SalonDetailParamsSchema = z.object({
  salonId: z.string().uuid(),
});

export type BookingParams = z.infer<typeof BookingParamsSchema>;
export type SalonDetailParams = z.infer<typeof SalonDetailParamsSchema>;

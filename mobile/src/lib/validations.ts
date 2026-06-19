import { z } from 'zod';

// Phone regex (Indian 10-digit)
export const phoneRegex = /^(?:\+91|91)?[6-9]\d{9}$/;
// Time regex (HH:MM 24-hour)
export const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const salonSchema = z.object({
  name: z.string().min(1, 'Salon name is required').trim(),
  address: z.string().min(1, 'Address is required').trim(),
  city: z.string().min(1, 'City is required').trim(),
  phone: z.string().regex(phoneRegex, 'Please enter a valid 10-digit Indian phone number').trim(),
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180),
  opening_time: z.string().regex(timeRegex, 'Opening time must be in HH:MM format'),
  closing_time: z.string().regex(timeRegex, 'Closing time must be in HH:MM format'),
}).refine(data => {
  const [openH, openM] = data.opening_time.split(':').map(Number);
  const [closeH, closeM] = data.closing_time.split(':').map(Number);
  return (closeH * 60 + closeM) > (openH * 60 + openM);
}, {
  message: 'Closing time must be after opening time',
  path: ['closing_time'],
});

export const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required').trim(),
  price: z.number().positive('Price must be a positive number'),
  duration: z.number().int().positive('Duration must be a positive number of minutes'),
  is_on_offer: z.boolean().default(false),
  discount_percentage: z.number().int().min(1).max(100).optional().nullable(),
}).refine(data => {
  if (data.is_on_offer && (!data.discount_percentage || data.discount_percentage < 1)) {
    return false;
  }
  return true;
}, {
  message: 'Please specify a valid discount percentage between 1 and 100',
  path: ['discount_percentage'],
});

export const promoSchema = z.object({
  code: z.string().min(1, 'Promo code is required').regex(/^[A-Z0-9_-]+$/i, 'Promo code must be alphanumeric (allowing dashes/underscores)').trim(),
  discount_type: z.enum(['percent', 'flat']),
  discount_value: z.number().positive('Discount value must be a positive number'),
  max_discount: z.number().positive('Max discount must be a positive number').optional().nullable(),
  min_order_value: z.number().min(0, 'Minimum order value must be 0 or greater').optional().nullable(),
  max_uses: z.number().int().positive('Max uses must be a positive integer').optional().nullable(),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date must be in YYYY-MM-DD format').optional().nullable(),
}).refine(data => {
  if (data.discount_type === 'percent' && data.discount_value > 100) {
    return false;
  }
  return true;
}, {
  message: 'Percentage discount cannot exceed 100%',
  path: ['discount_value'],
}).refine(data => {
  if (data.expires_at) {
    const parsedDate = new Date(data.expires_at);
    if (Number.isNaN(parsedDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) return false;
  }
  return true;
}, {
  message: 'Expiry date is invalid or in the past',
  path: ['expires_at'],
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500, 'Comment is too long').optional().nullable(),
});

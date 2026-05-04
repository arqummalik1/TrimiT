/**
 * Staff Management Types
 * Comprehensive type definitions for staff selection system
 */

// =====================================================
// WORKING HOURS TYPES
// =====================================================

export interface WorkingHoursBreak {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

export interface WorkingHoursDay {
  enabled: boolean;
  start: string;  // HH:MM format
  end: string;    // HH:MM format
  breaks: WorkingHoursBreak[];
}

export interface WorkingHours {
  monday: WorkingHoursDay;
  tuesday: WorkingHoursDay;
  wednesday: WorkingHoursDay;
  thursday: WorkingHoursDay;
  friday: WorkingHoursDay;
  saturday: WorkingHoursDay;
  sunday: WorkingHoursDay;
}

// Default working hours template
export const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
  tuesday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
  wednesday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
  thursday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
  friday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
  saturday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
  sunday: { enabled: false, start: '09:00', end: '18:00', breaks: [] },
};

// =====================================================
// STAFF TYPES
// =====================================================

export interface Staff {
  id: string;
  salon_id: string;
  name: string;
  bio?: string;
  image_url?: string;
  phone?: string;
  email?: string;
  working_hours: WorkingHours;
  days_off: string[]; // ISO date strings
  is_active: boolean;
  average_rating: number;
  total_reviews: number;
  total_bookings: number;
  created_at: string;
  updated_at: string;
}

export interface StaffWithServices extends Staff {
  services: StaffService[];
}

export interface StaffService {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
  custom_price?: number;
  custom_duration?: number;
}

// =====================================================
// STAFF CREATION/UPDATE TYPES
// =====================================================

export interface StaffCreateInput {
  salon_id: string;
  name: string;
  bio?: string;
  phone?: string;
  email?: string;
  working_hours?: WorkingHours;
  days_off?: string[];
  is_active?: boolean;
}

export interface StaffUpdateInput {
  name?: string;
  bio?: string;
  phone?: string;
  email?: string;
  working_hours?: WorkingHours;
  days_off?: string[];
  is_active?: boolean;
}

// =====================================================
// STAFF SERVICE ASSIGNMENT TYPES
// =====================================================

export interface StaffServiceAssignment {
  staff_id: string;
  service_id: string;
  custom_price?: number;
  custom_duration?: number;
}

export interface BulkStaffServiceAssignment {
  staff_id: string;
  service_ids: string[];
}

// =====================================================
// STAFF AVAILABILITY TYPES
// =====================================================

export interface AvailableStaffMember {
  staff_id: string;
  staff_name: string;
  staff_image_url?: string;
  staff_bio?: string;
  average_rating: number;
  total_reviews: number;
  custom_price?: number;
  custom_duration?: number;
}

export interface AvailableStaffResponse {
  salon_id: string;
  service_id: string;
  booking_date: string;
  time_slot: string;
  available_staff: AvailableStaffMember[];
  any_available: boolean;
}

export interface StaffAvailabilityCheck {
  staff_id: string;
  service_id: string;
  booking_date: string;
  time_slot: string;
  duration?: number;
}

// =====================================================
// STAFF PERFORMANCE TYPES
// =====================================================

export interface StaffPerformance {
  staff_id: string;
  staff_name: string;
  total_bookings: number;
  total_reviews: number;
  average_rating: number;
  services_count: number;
  revenue_generated?: number;
}

export interface StaffStats {
  staff_id: string;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  total_revenue: number;
  average_rating: number;
  total_reviews: number;
  most_booked_service?: string;
  busiest_day?: string;
  busiest_time_slot?: string;
}

// =====================================================
// STAFF SELECTION UI TYPES
// =====================================================

export interface StaffSelectionOption {
  type: 'any' | 'specific';
  staff_id?: string;
  staff_name?: string;
  staff_image_url?: string;
  average_rating?: number;
  total_reviews?: number;
  custom_price?: number;
  custom_duration?: number;
}

// Special "Any Available" option
export const ANY_STAFF_OPTION: StaffSelectionOption = {
  type: 'any',
  staff_name: 'Any Available Staff',
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if a staff member is working on a specific day
 */
export function isStaffWorkingOnDay(
  staff: Staff,
  date: Date
): boolean {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WorkingHours;
  const daySchedule = staff.working_hours[dayName];
  
  // Check if day is enabled
  if (!daySchedule.enabled) {
    return false;
  }
  
  // Check if date is in days_off
  const dateString = date.toISOString().split('T')[0];
  if (staff.days_off.includes(dateString)) {
    return false;
  }
  
  return true;
}

/**
 * Get working hours for a specific day
 */
export function getWorkingHoursForDay(
  staff: Staff,
  date: Date
): WorkingHoursDay | null {
  if (!isStaffWorkingOnDay(staff, date)) {
    return null;
  }
  
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WorkingHours;
  return staff.working_hours[dayName];
}

/**
 * Format staff rating for display
 */
export function formatStaffRating(rating: number): string {
  return rating.toFixed(1);
}

/**
 * Get staff display name with rating
 */
export function getStaffDisplayName(staff: Staff | AvailableStaffMember): string {
  const name = 'name' in staff ? staff.name : staff.staff_name;
  const rating = 'average_rating' in staff ? staff.average_rating : 0;
  const reviews = 'total_reviews' in staff ? staff.total_reviews : 0;
  
  if (reviews > 0) {
    return `${name} (${formatStaffRating(rating)} ⭐)`;
  }
  
  return name;
}

/**
 * Get effective price for a service with staff
 */
export function getEffectivePrice(
  basePrice: number,
  customPrice?: number
): number {
  return customPrice ?? basePrice;
}

/**
 * Get effective duration for a service with staff
 */
export function getEffectiveDuration(
  baseDuration: number,
  customDuration?: number
): number {
  return customDuration ?? baseDuration;
}

/**
 * Calculate price difference for staff premium/discount
 */
export function getPriceDifference(
  basePrice: number,
  customPrice?: number
): { amount: number; percentage: number; type: 'premium' | 'discount' | 'same' } {
  if (!customPrice || customPrice === basePrice) {
    return { amount: 0, percentage: 0, type: 'same' };
  }
  
  const difference = customPrice - basePrice;
  const percentage = (difference / basePrice) * 100;
  
  return {
    amount: Math.abs(difference),
    percentage: Math.abs(percentage),
    type: difference > 0 ? 'premium' : 'discount',
  };
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate time format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Compare two time strings (HH:MM format)
 * Returns: -1 if time1 < time2, 0 if equal, 1 if time1 > time2
 */
export function compareTimeStrings(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  
  if (h1 < h2) return -1;
  if (h1 > h2) return 1;
  if (m1 < m2) return -1;
  if (m1 > m2) return 1;
  return 0;
}

/**
 * Get day name from date
 */
export function getDayName(date: Date): keyof WorkingHours {
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WorkingHours;
}

/**
 * Check if time is within working hours
 */
export function isTimeWithinWorkingHours(
  time: string,
  workingHours: WorkingHoursDay
): boolean {
  if (!workingHours.enabled) {
    return false;
  }
  
  return (
    compareTimeStrings(time, workingHours.start) >= 0 &&
    compareTimeStrings(time, workingHours.end) < 0
  );
}

/**
 * Cross-platform push / booking-alert constants.
 * Source of truth: shared/push-constants.json
 * Synced into mobile via scripts/sync-shared-json.cjs (Metro cannot import outside mobile/).
 */
import pushConstants from '../config/push-constants.json';

export const BOOKING_CHANNEL_ID = pushConstants.bookingChannelId;
export const UPDATES_CHANNEL_ID = pushConstants.updatesChannelId;
export const LEGACY_BOOKING_CHANNEL_IDS = pushConstants.legacyBookingChannelIds as readonly string[];
export const PROMOTIONS_CHANNEL_ID = pushConstants.promotionsChannelId;
/** iOS Expo Push / local notification sound (include extension). */
export const BOOKING_NOTIFICATION_SOUND = pushConstants.bookingSoundFile;
/** Android channel sound base name (no extension) — matches assets/sounds/notification.mp3. */
export const BOOKING_ANDROID_SOUND = pushConstants.bookingSoundAndroidBase;
export const IOS_BOOKING_INTERRUPTION_LEVEL = pushConstants.iosInterruptionLevel;

/** Interactive push categories (Accept/Reject, Verify/Reject payment). */
export const OWNER_BOOKING_CATEGORY_ID = pushConstants.ownerBookingCategoryId;
export const OWNER_PAYMENT_CATEGORY_ID = pushConstants.ownerPaymentCategoryId;
export const ACTION_ACCEPT_BOOKING = pushConstants.actionAcceptBooking;
export const ACTION_REJECT_BOOKING = pushConstants.actionRejectBooking;
export const ACTION_VERIFY_PAYMENT = pushConstants.actionVerifyPayment;
export const ACTION_REJECT_PAYMENT = pushConstants.actionRejectPayment;

/** Owner events that use the loud booking channel + in-app beep (shared JSON). */
export const OWNER_URGENT_PUSH_TYPES = pushConstants.ownerUrgentEventTypes as readonly string[];

export type OwnerUrgentPushType = (typeof OWNER_URGENT_PUSH_TYPES)[number];

export function isOwnerUrgentPushType(type: string | undefined | null): type is OwnerUrgentPushType {
  return typeof type === 'string' && OWNER_URGENT_PUSH_TYPES.includes(type);
}

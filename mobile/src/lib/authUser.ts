import type { User } from '../types';

type ProfileLike = {
  id?: string;
  email?: string;
  name?: string;
  phone?: string;
  role?: string;
  push_token?: string;
  push_enabled?: boolean;
  notify_bookings?: boolean;
  notify_booking_updates?: boolean;
  notify_promotional?: boolean;
  notify_reminders?: boolean;
  created_at?: string;
  profile?: ProfileLike;
};

/**
 * Normalize API auth payloads so `user.role` is always set from public.users.
 */
export function normalizeAuthUser(raw: ProfileLike | null | undefined): User | null {
  if (!raw) {
    return null;
  }

  const row = raw.profile ?? raw;
  if (!row.id) {
    return null;
  }

  const role: User['role'] = row.role === 'owner' ? 'owner' : 'customer';

  return {
    id: row.id,
    email: row.email ?? '',
    name: row.name ?? '',
    phone: row.phone,
    role,
    push_token: row.push_token,
    push_enabled: row.push_enabled,
    notify_bookings: row.notify_bookings,
    notify_booking_updates: row.notify_booking_updates,
    notify_promotional: row.notify_promotional,
    notify_reminders: row.notify_reminders,
    created_at: row.created_at ?? '',
  };
}

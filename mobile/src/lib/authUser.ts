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
  gender?: 'male' | 'female';
  discovery_audience?: 'auto' | 'men' | 'women' | 'all';
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

  const role: User['role'] =
    row.role === 'owner'
      ? 'owner'
      : row.role === 'employee'
        ? 'employee'
        : 'customer';

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
    gender: row.gender === 'male' || row.gender === 'female' ? row.gender : undefined,
    discovery_audience:
      row.discovery_audience === 'auto' ||
      row.discovery_audience === 'men' ||
      row.discovery_audience === 'women' ||
      row.discovery_audience === 'all'
        ? row.discovery_audience
        : undefined,
    created_at: row.created_at ?? '',
  };
}

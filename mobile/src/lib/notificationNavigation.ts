/**
 * Maps push notification payloads to in-app navigation.
 */

import { CommonActions, type NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { logger } from './logger';
import { z } from 'zod';

export type PushPayload = {
  type?: string;
  booking_id?: string;
  bookingId?: string;
  role_hint?: string;
  status?: string;
  audience?: string;
};

const uuidOrEmpty = z.string().uuid().or(z.literal('')).optional();
const pushPayloadSchema = z.object({
  type: z.string().optional(),
  booking_id: uuidOrEmpty,
  bookingId: uuidOrEmpty,
  role_hint: z.enum(['customer', 'owner']).optional(),
  status: z.string().optional(),
  audience: z.string().optional(),
});

export function handleNotificationNavigation(
  navigationRef: NavigationContainerRef<RootStackParamList> | null,
  data: PushPayload | undefined,
  userRole: 'customer' | 'owner' | undefined
): void {
  if (!navigationRef?.isReady() || !data) {
    return;
  }

  try {
    const result = pushPayloadSchema.safeParse(data);
    if (!result.success) {
      logger.warn('[PushNav] Invalid push notification payload structure', { error: result.error });
      return;
    }

    if (!userRole) {
      logger.warn('[PushNav] Ignoring push navigation payload: user is not authenticated.');
      return;
    }

    const bookingId = data.booking_id ?? data.bookingId;
    const type = data.type ?? '';
    // Use the authenticated user's role
    const role = userRole;

    logger.info('[PushNav] navigate', { type, bookingId, role });

    // Broadcast (Zomato/Blinkit-style) marketing pushes don't deep-link anywhere
    // by default — open the app on the role's home tab. If a future broadcast
    // wants to deep link, encode it in `data` and extend this branch.
    if (type === 'broadcast') {
      if (role === 'owner') {
        navigationRef.dispatch(
          CommonActions.navigate({
            name: 'OwnerTabs',
            params: { screen: 'Dashboard' },
          })
        );
      } else {
        navigationRef.dispatch(
          CommonActions.navigate({
            name: 'CustomerTabs',
            params: { screen: 'Discover', params: { screen: 'DiscoverMain' } },
          })
        );
      }
      return;
    }

    if (role === 'owner') {
      navigationRef.dispatch(
        CommonActions.navigate({
          name: 'OwnerTabs',
          params: {
            screen: 'Bookings',
          },
        })
      );
      return;
    }

    navigationRef.dispatch(
      CommonActions.navigate({
        name: 'CustomerTabs',
        params: {
          screen: 'Bookings',
        },
      })
    );
  } catch (err) {
    logger.error('[PushNav] Error handling push navigation', err);
  }
}

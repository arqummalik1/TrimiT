/**
 * Maps push notification payloads to in-app navigation.
 */

import { CommonActions, type NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { logger } from './logger';

export type PushPayload = {
  type?: string;
  booking_id?: string;
  bookingId?: string;
  role_hint?: string;
  status?: string;
};

export function handleNotificationNavigation(
  navigationRef: NavigationContainerRef<RootStackParamList> | null,
  data: PushPayload | undefined,
  userRole: 'customer' | 'owner' | undefined
): void {
  if (!navigationRef?.isReady() || !data) {
    return;
  }

  const bookingId = data.booking_id ?? data.bookingId;
  const type = data.type ?? '';
  const role = data.role_hint ?? userRole ?? 'customer';

  logger.info('[PushNav] navigate', { type, bookingId, role });

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
}

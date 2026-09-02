import { CommonActions, StackActions } from '@react-navigation/native';
import type { PendingAuthIntent } from '../store/pendingAuthIntentStore';
import type { RootStackParamList } from './types';

type AuthenticatedRole = 'customer' | 'owner' | 'employee';

export type PostAuthDestination =
  | {
      name: 'CustomerTabs';
      params: RootStackParamList['CustomerTabs'];
    }
  | {
      name: 'OwnerTabs';
      params: RootStackParamList['OwnerTabs'];
    };

export const AUTH_MODAL_OPTIONS = {
  presentation: 'fullScreenModal',
  animation: 'slide_from_bottom',
  // Authentication has an explicit close action. Native swipe dismissal can
  // bypass intent cleanup and leave the Auth route in an indeterminate state.
  gestureEnabled: false,
} as const;

/** Resolve a validated pending intent to an approved root destination. */
export function getPostAuthDestination(
  intent: PendingAuthIntent | null,
  role: AuthenticatedRole,
): PostAuthDestination {
  switch (intent?.kind) {
    case 'customer_booking':
      return {
        name: 'CustomerTabs',
        params: {
          screen: 'Discover',
          params: {
            screen: 'Booking',
            params: { salonId: intent.salonId, serviceId: intent.serviceId },
          },
        },
      };
    case 'my_bookings':
      return { name: 'CustomerTabs', params: { screen: 'Bookings' } };
    case 'reschedule_booking':
      return {
        name: 'CustomerTabs',
        params: {
          screen: 'Discover',
          params: { screen: 'RescheduleBooking', params: intent },
        },
      };
    case 'write_review':
      return {
        name: 'CustomerTabs',
        params: {
          screen: 'Discover',
          params: {
            screen: 'WriteReview',
            params: { salonId: intent.salonId, bookingId: intent.bookingId },
          },
        },
      };
    case 'profile':
      return {
        name: 'CustomerTabs',
        params: { screen: 'Profile', params: { screen: 'ProfileMain' } },
      };
    case 'owner_onboarding':
      return {
        name: 'OwnerTabs',
        params: {
          screen: 'Dashboard',
          params: { screen: 'ChooseBusinessType' },
        },
      };
    case 'employee_claim':
      return { name: 'OwnerTabs', params: undefined };
    default:
      return role === 'owner' || role === 'employee'
        ? { name: 'OwnerTabs', params: undefined }
        : { name: 'CustomerTabs', params: undefined };
  }
}

/**
 * Build one atomic root action for authentication completion.
 *
 * When the guest/customer workspace already exists below Auth, POP_TO removes
 * the entire Auth stack while preserving the original Discover history. The
 * nested params then replay the approved intent inside that preserved stack.
 * If the destination workspace does not exist (for example customer → owner),
 * RESET establishes one canonical root instead of leaving the wrong workspace
 * underneath it.
 */
export function buildPostAuthRootAction(
  rootRouteNames: readonly string[],
  destination: PostAuthDestination,
) {
  if (rootRouteNames.includes(destination.name)) {
    return StackActions.popTo(destination.name, destination.params);
  }

  return CommonActions.reset({
    index: 0,
    routes: [{ name: destination.name, params: destination.params }],
  });
}

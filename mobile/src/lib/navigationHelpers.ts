import {
  CommonActions,
  StackActions,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';

/**
 * Navigate to the customer Bookings tab.
 *
 * IMPORTANT: when this is called from a screen inside the Discover stack
 * (e.g. BookingScreen, PaymentScreen, RescheduleBookingScreen), we also pop
 * the Discover stack back to its root. Otherwise the previous flow's screen
 * stays "parked" inside the Discover stack and the next tap on the Discover
 * tab refocuses that stale screen instead of the salon list.
 */
export function navigateToCustomerBookings(
  navigation: NavigationProp<ParamListBase>
): void {
  // Pop the current stack (Discover stack) back to the first route. Safe no-op
  // if there is only one entry on the stack. We dispatch popToTop on the
  // current navigator before switching tabs.
  try {
    navigation.dispatch(StackActions.popToTop());
  } catch {
    // popToTop is only valid inside a stack navigator; fail silently if not.
  }

  const parent = navigation.getParent();
  if (parent) {
    parent.navigate('Bookings' as never);
    return;
  }
  navigation.dispatch(
    CommonActions.navigate({
      name: 'CustomerTabs',
      params: { screen: 'Bookings' },
    })
  );
}

/** Navigate to owner Bookings tab from dashboard or nested stacks. */
export function navigateToOwnerBookings(
  navigation: NavigationProp<ParamListBase>
): void {
  const parent = navigation.getParent();
  if (parent) {
    parent.navigate('Bookings' as never);
    return;
  }
  navigation.dispatch(
    CommonActions.navigate({
      name: 'OwnerTabs',
      params: { screen: 'Bookings' },
    })
  );
}

/**
 * Reset the Discover stack to its root and switch back to the Discover tab.
 *
 * Use this when the user finishes a flow that lives inside the Discover stack
 * (Booking success → "Back to Home", Payment success, Reschedule success) so
 * the next tap on the Discover tab actually shows the salon list rather than
 * the previous flow's confirmation screen.
 */
export function resetToCustomerDiscover(
  navigation: NavigationProp<ParamListBase>
): void {
  try {
    navigation.dispatch(StackActions.popToTop());
  } catch {
    // not in a stack navigator
  }
  const parent = navigation.getParent();
  if (parent) {
    parent.navigate('Discover' as never);
    return;
  }
  navigation.dispatch(
    CommonActions.navigate({
      name: 'CustomerTabs',
      params: { screen: 'Discover', params: { screen: 'DiscoverMain' } },
    })
  );
}

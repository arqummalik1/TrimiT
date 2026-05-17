import type { NavigationProp, ParamListBase } from '@react-navigation/native';

/** Navigate to customer Bookings tab from a nested discover stack screen. */
export function navigateToCustomerBookings(
  navigation: NavigationProp<ParamListBase>
): void {
  const parent = navigation.getParent();
  if (parent) {
    parent.navigate('Bookings' as never);
    return;
  }
  navigation.navigate('CustomerTabs' as never, { screen: 'Bookings' } as never);
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
  navigation.navigate('OwnerTabs' as never, { screen: 'Bookings' } as never);
}

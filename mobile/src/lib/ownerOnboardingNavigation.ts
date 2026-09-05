import { CommonActions, StackActions } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { navigationRef } from '../navigation/navigationRef';

const CUSTOMER_PROFILE_PARAMS = {
  screen: 'Profile',
  params: { screen: 'ProfileMain' },
} as const;

/** Exit a reversible owner setup and return to the customer's Profile tab. */
export function exitOwnerOnboarding(navigation: NavigationProp<ParamListBase>): boolean {
  let current: NavigationProp<ParamListBase> | undefined = navigation;

  while (current) {
    const names = current.getState?.().routeNames as string[] | undefined;
    if (names?.includes('CustomerTabs') && names.includes('OwnerOnboarding')) {
      current.dispatch(StackActions.popTo('CustomerTabs', CUSTOMER_PROFILE_PARAMS));
      return true;
    }
    current = current.getParent?.() as NavigationProp<ParamListBase> | undefined;
  }

  return false;
}

/** Replace customer/onboarding history only after atomic salon creation succeeds. */
export function completeOwnerOnboarding(): void {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'OwnerTabs',
          params: {
            screen: 'Services',
            params: { screen: 'ServicesMain', params: { openAddService: true } },
          },
        },
      ],
    }),
  );
}

/** Recover a legacy owner-without-salon account into the customer workspace. */
export function resetToCustomerProfile(): void {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'CustomerTabs', params: CUSTOMER_PROFILE_PARAMS }],
    }),
  );
}

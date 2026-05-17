import { CommonActions } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

function getOwnerTabNavigator(
  navigation: NavigationProp<ParamListBase>
): NavigationProp<ParamListBase> | undefined {
  let current: NavigationProp<ParamListBase> | undefined = navigation;

  while (current) {
    const state = current.getState?.();
    const routeNames = state?.routeNames as string[] | undefined;
    if (routeNames?.includes('Dashboard') && routeNames?.includes('Services')) {
      return current;
    }
    current = current.getParent?.() as NavigationProp<ParamListBase> | undefined;
  }

  return undefined;
}

/**
 * Ensure the Dashboard tab shows OwnerDashboardScreen, not a stale ManageSalon on the stack.
 */
export function resetOwnerDashboardToMain(navigation: NavigationProp<ParamListBase>): void {
  const tabs = getOwnerTabNavigator(navigation);
  if (tabs) {
    tabs.navigate('Dashboard', { screen: 'DashboardMain' });
    return;
  }

  const state = navigation.getState?.();
  const routeNames = state?.routeNames as string[] | undefined;
  if (routeNames?.includes('DashboardMain')) {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'DashboardMain' }],
      })
    );
  }
}

/**
 * From a nested owner stack screen, jump to the Services tab (optionally open add-service flow).
 */
export function navigateOwnerToServices(
  navigation: NavigationProp<ParamListBase>,
  params?: { openAddService?: boolean }
): boolean {
  let parent: NavigationProp<ParamListBase> | undefined = navigation.getParent();

  while (parent) {
    const state = parent.getState?.();
    const names = state?.routeNames as string[] | undefined;
    if (names?.includes('Services')) {
      (parent.navigate as (name: string, p?: { openAddService?: boolean }) => void)(
        'Services',
        params
      );
      return true;
    }
    parent = parent.getParent?.() as NavigationProp<ParamListBase> | undefined;
  }

  return false;
}

/**
 * Switch to Dashboard tab and show the home dashboard (not ManageSalon).
 */
export function navigateOwnerToDashboard(navigation: NavigationProp<ParamListBase>): boolean {
  const tabs = getOwnerTabNavigator(navigation);
  if (!tabs) {
    return false;
  }
  tabs.navigate('Dashboard', { screen: 'DashboardMain' });
  return true;
}

import type { NavigationProp, ParamListBase } from '@react-navigation/native';

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
      // Tab navigator — params typed on OwnerTabParamList.Services
      (parent.navigate as (name: string, p?: { openAddService?: boolean }) => void)(
        'Services',
        params
      );
      return true;
    }
    parent = parent.getParent?.();
  }

  return false;
}

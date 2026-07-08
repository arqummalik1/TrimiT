import type { Theme } from '../theme/tokens';

/** Native react-native-maps pin color — primary brand, darker when selected. */
export function getSalonMapPinColor(theme: Theme, selected = false): string {
  return selected ? theme.colors.primaryDark : theme.colors.primary;
}

/**
 * src/lib/utils.ts
 * Central utility barrel — formatters + theme token re-exports.
 *
 * For dynamic theming inside components use:
 *   import { useTheme } from '../theme/ThemeContext';
 *
 * The static exports below (`colors`, `fonts`, etc.) are kept for backward
 * compatibility and point to the dark palette.
 */

// =============================================================================
// FORMATTERS
// =============================================================================

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(price);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// =============================================================================
// THEME RE-EXPORTS (backward compat + convenience)
// =============================================================================

export {
  colors,
  fonts,
  spacing,
  typography,
  borderRadius,
  shadows,
  layout,
  DEFAULT_SALON_IMAGE,
  getStatusColor,
  getPaymentStatusColor,
  // Theme objects
  lightTheme,
  darkTheme,
  // Palettes
  lightPalette,
  darkPalette,
  // Status color helpers (theme-aware)
  getLightStatusColors,
  getDarkStatusColors,
  getLightPaymentColors,
  getDarkPaymentColors,
} from '../theme';

// Hook re-export for convenience
export { useTheme } from '../theme/ThemeContext';
export type { Theme, ThemeColors } from '../theme/tokens';

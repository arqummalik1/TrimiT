/**
 * src/theme/index.ts
 * Single source of truth for the TrimiT theme system.
 *
 * BACKWARD COMPATIBILITY:
 *   The named exports `colors`, `fonts`, etc. still work as before — they now
 *   point to the DARK theme palette so all un-migrated files continue compiling.
 *   Migrate each screen to use `useTheme()` for live switching.
 */

// Re-export theme objects
export { lightTheme } from './lightTheme';
export { darkTheme }  from './darkTheme';

// Re-export context + hook
export { ThemeProvider, useTheme } from './ThemeContext';
export type { ThemeContextValue, ThemeMode } from './ThemeContext';

// Re-export token types
export type { Theme, ThemeColors } from './tokens';
export {
  fonts,
  typography,
  spacing,
  layout,
  borderRadius,
  shadows,
  DEFAULT_SALON_IMAGE,
  getLightStatusColors,
  getDarkStatusColors,
  getLightPaymentColors,
  getDarkPaymentColors,
} from './tokens';

// Re-export raw palettes
export { lightPalette, darkPalette } from './colors';

// =============================================================================
// BACKWARD-COMPAT STATIC EXPORTS
// These still refer to the DARK palette so any remaining code that hasn't
// been migrated to useTheme() continues to compile and run.
// They will be removed once all screens are migrated.
// =============================================================================
import { darkPalette } from './colors';
import { getDarkStatusColors, getDarkPaymentColors } from './tokens';

/** @deprecated Use useTheme().theme.colors inside components */
export const colors = darkPalette;

/** @deprecated Use getDarkStatusColors() or getLightStatusColors() */
export const getStatusColor = (status: string) =>
  getDarkStatusColors()[status] ?? { bg: '#1A1C19', text: '#F5F5F5' };

/** @deprecated Use getDarkPaymentColors() or getLightPaymentColors() */
export const getPaymentStatusColor = (status: string) =>
  getDarkPaymentColors()[status] ?? { bg: '#1A1C19', text: '#F5F5F5' };

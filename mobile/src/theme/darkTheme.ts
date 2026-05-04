/**
 * darkTheme.ts
 * Luxury dark theme — gold + obsidian system (existing palette, unchanged values).
 */

import { darkPalette } from './colors';
import { fonts, typography, spacing, layout, borderRadius, shadows, Theme } from './tokens';

export const darkTheme: Theme = {
  colors:       darkPalette,
  fonts,
  typography,
  spacing,
  layout,
  borderRadius,
  shadows,
  isDark:       true,
};

/**
 * darkTheme.ts
 * TrimiT Luxury & Editorial (Champagne Gold on Deep Obsidian).
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

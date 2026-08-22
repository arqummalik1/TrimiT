/**
 * lightTheme.ts
 * TrimiT Organic & Earthy (Terracotta & Emerald on Warm Stone).
 */

import { lightPalette } from './colors';
import { fonts, typography, spacing, layout, borderRadius, shadows, Theme } from './tokens';

export const lightTheme: Theme = {
  colors:       lightPalette,
  fonts,
  typography,
  spacing,
  layout,
  borderRadius,
  shadows,
  isDark:       false,
};

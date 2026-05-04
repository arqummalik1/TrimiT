/**
 * lightTheme.ts
 * Clean, premium light theme matching the TrimiT web frontend.
 * Source of truth: frontend/tailwind.config.js + frontend/src/index.css
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

/**
 * tokens.ts
 * Shared type definitions for the theme system.
 * All themes must conform to these types.
 */

import { Platform, TextStyle, ViewStyle } from 'react-native';

// =============================================================================
// COLOR TOKEN TYPE
// =============================================================================
export type ThemeColors = {
  // Backgrounds
  background:       string;
  surface:          string;
  surfaceSecondary: string;
  surfaceRaised:    string;
  surfaceHighlight: string;

  // Text
  text:          string;
  textSecondary: string;
  textTertiary:  string;
  textInverse:   string;
  textAccent:    string;

  // Brand
  primary:      string;
  primaryDark:  string;
  primaryLight: string;

  // Secondary
  secondary:      string;
  secondaryDark:  string;
  secondaryLight: string;

  // Borders
  border:      string;
  borderFocus: string;

  // Semantic
  error:        string;
  errorLight:   string;
  success:      string;
  successLight: string;
  warning:      string;
  warningLight: string;
  info:         string;
  infoLight:    string;
  star:         string;

  // Misc
  overlay:     string;
  shimmer:     string;
  white:       string;
  black:       string;
  transparent: string;
  tabBar:      string;
  tabBarBorder:string;
};

// =============================================================================
// TYPOGRAPHY (shared across themes)
// =============================================================================
export const fonts = {
  heading:         'CormorantGaramond_700Bold',
  headingMedium:   'CormorantGaramond_600SemiBold',
  headingRegular:  'CormorantGaramond_400Regular',
  body:            'Inter_400Regular',
  bodyMedium:      'Inter_500Medium',
  bodySemiBold:    'Inter_600SemiBold',
  bodyBold:        'Inter_700Bold',
  systemHeading:   Platform.select({ ios: 'Georgia', android: 'serif' }) ?? 'serif',
  systemBody:      Platform.select({ ios: 'System', android: 'sans-serif' }) ?? 'System',
} as const;

export const typography = {
  h1: {
    fontFamily: fonts.heading,
    fontSize: 36,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
    lineHeight: 44,
  },
  h2: {
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  h3: {
    fontFamily: fonts.heading,
    fontSize: 22,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 28,
  },
  h4: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  bodySemiBold: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
  },
  bodySmallMedium: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 20,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 16,
  },
  captionMedium: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 16,
  },
  overline: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    fontWeight: '700' as TextStyle['fontWeight'],
    textTransform: 'uppercase' as TextStyle['textTransform'],
    letterSpacing: 2,
  },
  button: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.5,
  },
  buttonSmall: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
} as const;

// =============================================================================
// SPACING (shared)
// =============================================================================
export const spacing = {
  xs:    4,
  sm:    8,
  md:    12,
  lg:    16,
  xl:    20,
  xxl:   24,
  xxxl:  32,
  xxxxl: 40,
} as const;

export const layout = {
  screenPaddingHorizontal: 20,
  cardPadding:             16,
  sectionGap:              24,
  itemGap:                 12,
} as const;

// =============================================================================
// BORDER RADIUS (shared)
// =============================================================================
export const borderRadius = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  xxl:  24,
  pill: 32,
  full: 999,
} as const;

// =============================================================================
// SHADOWS (shared)
// =============================================================================
export const shadows = {
  sm: Platform.select<ViewStyle>({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    android: { elevation: 1 },
  }) ?? {},
  md: Platform.select<ViewStyle>({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1,  shadowRadius: 8 },
    android: { elevation: 3 },
  }) ?? {},
  lg: Platform.select<ViewStyle>({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
    android: { elevation: 6 },
  }) ?? {},
} as const;

// =============================================================================
// STATUS BADGE HELPERS (theme-aware factories)
// =============================================================================
export type StatusColorMap = Record<string, { bg: string; text: string }>;

export const getLightStatusColors = (): StatusColorMap => ({
  pending:   { bg: '#FFFBEB', text: '#D97706' }, // amber
  confirmed: { bg: '#EFF6FF', text: '#2563EB' }, // blue
  completed: { bg: '#ECFDF5', text: '#059669' }, // emerald
  cancelled: { bg: '#FEF2F2', text: '#DC2626' }, // red
});

export const getDarkStatusColors = (): StatusColorMap => ({
  pending:   { bg: '#2D2D1A', text: '#F7DC6F' },
  confirmed: { bg: '#1A242D', text: '#85C1E9' },
  completed: { bg: '#1A2D22', text: '#82E0AA' },
  cancelled: { bg: '#2D1A1A', text: '#FF5F5F' },
});

export const getLightPaymentColors = (): StatusColorMap => ({
  pending:  { bg: '#FFFBEB', text: '#D97706' },
  paid:     { bg: '#ECFDF5', text: '#059669' },
  failed:   { bg: '#FEF2F2', text: '#DC2626' },
  refunded: { bg: '#F5F3FF', text: '#7C3AED' },
});

export const getDarkPaymentColors = (): StatusColorMap => ({
  pending:  { bg: '#2D2D1A', text: '#F7DC6F' },
  paid:     { bg: '#1A2D22', text: '#82E0AA' },
  failed:   { bg: '#2D1A1A', text: '#FF5F5F' },
  refunded: { bg: '#1A1A2D', text: '#BB8FCE' },
});

// =============================================================================
// FULL THEME TYPE
// =============================================================================
export type Theme = {
  colors:       ThemeColors;
  fonts:        typeof fonts;
  typography:   typeof typography;
  spacing:      typeof spacing;
  layout:       typeof layout;
  borderRadius: typeof borderRadius;
  shadows:      typeof shadows;
  isDark:       boolean;
};

// =============================================================================
// DEFAULT ASSET
// =============================================================================
export const DEFAULT_SALON_IMAGE =
  'https://images.unsplash.com/photo-1626383137804-ff908d2753a2?w=800';

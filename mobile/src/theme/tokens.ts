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
  surfaceElevated:  string;
  surfaceFloating:  string;
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

  // Booking Status Color System
  statusPending:       string;
  statusPendingBg:     string;
  statusConfirmed:     string;
  statusConfirmedBg:   string;
  statusCompleted:     string;
  statusCompletedBg:   string;
  statusCancelled:     string;
  statusCancelledBg:   string;
  statusRescheduled:   string;
  statusRescheduledBg: string;
  statusInProgress:    string;
  statusInProgressBg:  string;

  // Premium Orange Gradients
  gradientPrimary:   readonly string[];
  gradientPremium:   readonly string[];
  gradientHighlight: readonly string[];

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
  display: {
    fontFamily: fonts.heading,
    fontSize: 48,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.8,
    lineHeight: 56,
  },
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
  /** Customer tab screens: Discover, Bookings, Profile — h3 + 2px */
  tabTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  h4: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 24,
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
    lineHeight: 16,
  },
  button: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  buttonSmall: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 20,
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
  /** Tab-bar-aligned horizontal inset — use on Discover, Bookings, Profile, and tab bar. */
  floatingChromeInset:     16,
  screenPaddingHorizontal: 16,
  cardPadding:             16,
  sectionGap:              24,
  itemGap:                 12,
} as const;

// =============================================================================
// BORDER RADIUS (shared)
// Modernized to soft, premium curves.
// =============================================================================
export const borderRadius = {
  sm:   6,    // fine-grained tags, badges
  md:   10,   // text inputs, inner card elements
  lg:   16,   // salon cards, service cards, main CTA buttons
  xl:   24,   // bottom sheets, main modals, dialogs
  xxl:  32,   // outer containers / hero block wrappers
  pill: 40,   // segment controls / capsule pills
  full: 999,  // avatars, icons
} as const;

// =============================================================================
// SHADOWS (shared)
// Softened shadows for organic depth and cleaner flat design.
// =============================================================================
export const shadows = {
  sm: Platform.select<ViewStyle>({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 3 },
    android: { elevation: 1 },
  }) ?? {},
  md: Platform.select<ViewStyle>({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
    android: { elevation: 3 },
  }) ?? {},
  lg: Platform.select<ViewStyle>({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16 },
    android: { elevation: 6 },
  }) ?? {},
} as const;

// =============================================================================
// STATUS BADGE HELPERS (theme-aware factories)
// =============================================================================
export type StatusColorMap = Record<string, { bg: string; text: string }>;

export const getLightStatusColors = (): StatusColorMap => ({
  pending:     { bg: '#FEF3C7', text: '#B45309' }, // amber
  confirmed:   { bg: '#DBEAFE', text: '#1D4ED8' }, // blue
  completed:   { bg: '#D1FAE5', text: '#047857' }, // emerald
  cancelled:   { bg: '#FEE2E2', text: '#B91C1C' }, // red
  rescheduled: { bg: '#EDE9FE', text: '#6D28D9' }, // purple
  inProgress:  { bg: '#FFEDD5', text: '#C2410C' }, // orange
});

export const getDarkStatusColors = (): StatusColorMap => ({
  pending:     { bg: '#2D2D1A', text: '#F7DC6F' }, // gold
  confirmed:   { bg: '#1A242D', text: '#85C1E9' }, // blue
  completed:   { bg: '#1A2D22', text: '#82E0AA' }, // emerald
  cancelled:   { bg: '#2D1A1A', text: '#FF5F5F' }, // red
  rescheduled: { bg: '#1A1A2D', text: '#BB8FCE' }, // purple
  inProgress:  { bg: '#2E160D', text: '#F97316' }, // orange
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

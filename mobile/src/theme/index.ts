import { Platform, TextStyle, ViewStyle } from 'react-native';

// =============================================================================
// TRIMIT GLOBAL THEME — Single source of truth for all colors, typography,
// spacing, and styling tokens. Change this file to update the entire app.
// =============================================================================

// -- COLOR TYPES --------------------------------------------------------------
// Use a flexible type so dark colors can have different hex values
export type ColorScheme = { [K in keyof typeof lightColors]: string };

// -- LIGHT COLORS (default) ---------------------------------------------------
export const lightColors = {
  // Primary brand
  primary: '#9A3412',       // orange-800
  primaryLight: '#FFEDD5',  // orange-100
  primaryDark: '#7C2D12',   // orange-900

  // Secondary brand
  secondary: '#065F46',     // emerald-800
  secondaryLight: '#D1FAE5', // emerald-100

  // Backgrounds
  background: '#FAFAF9',    // stone-50
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F5F4', // stone-100
  inverse: '#1C1917',       // stone-900

  // Text
  text: '#1C1917',          // stone-900
  textSecondary: '#78716C', // stone-500
  textTertiary: '#A8A29E',  // stone-400
  textInverse: '#FAFAF9',   // stone-50
  textAccent: '#9A3412',    // orange-800

  // Borders
  border: '#E7E5E4',        // stone-200
  borderFocus: '#9A3412',   // orange-800

  // Semantic
  error: '#DC2626',
  errorLight: '#FEE2E2',
  success: '#059669',
  successLight: '#D1FAE5',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  info: '#2563EB',
  infoLight: '#DBEAFE',

  // Misc
  overlay: 'rgba(0,0,0,0.4)',
  shimmer: '#E7E5E4',
  star: '#FBBF24',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Tab bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#E7E5E4',
} as const;

// -- DARK COLORS --------------------------------------------------------------
export const darkColors: ColorScheme = {
  // Primary brand — slightly brighter for dark backgrounds
  primary: '#EA580C',       // orange-600
  primaryLight: '#431407',  // orange-950
  primaryDark: '#FB923C',   // orange-400

  // Secondary brand
  secondary: '#10B981',     // emerald-500
  secondaryLight: '#064E3B', // emerald-900

  // Backgrounds
  background: '#0C0A09',    // stone-950
  surface: '#1C1917',       // stone-900
  surfaceSecondary: '#292524', // stone-800
  inverse: '#FAFAF9',       // stone-50

  // Text
  text: '#FAFAF9',          // stone-50
  textSecondary: '#A8A29E', // stone-400
  textTertiary: '#78716C',  // stone-500
  textInverse: '#1C1917',   // stone-900
  textAccent: '#FB923C',    // orange-400

  // Borders
  border: '#44403C',        // stone-700
  borderFocus: '#EA580C',   // orange-600

  // Semantic
  error: '#EF4444',
  errorLight: '#450A0A',
  success: '#10B981',
  successLight: '#064E3B',
  warning: '#F59E0B',
  warningLight: '#451A03',
  info: '#3B82F6',
  infoLight: '#172554',

  // Misc
  overlay: 'rgba(0,0,0,0.6)',
  shimmer: '#44403C',
  star: '#FBBF24',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Tab bar
  tabBar: '#1C1917',
  tabBarBorder: '#44403C',
};

// -- DEFAULT EXPORT (light mode for backward compatibility) --------------------
export const colors = lightColors;

// -- STATUS BADGE COLORS ------------------------------------------------------
export const statusColors: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#FEF3C7', text: '#92400E' },
  confirmed: { bg: '#DBEAFE', text: '#1E40AF' },
  completed: { bg: '#D1FAE5', text: '#065F46' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

export const paymentStatusColors: Record<string, { bg: string; text: string }> = {
  pending:  { bg: '#FEF3C7', text: '#92400E' },
  paid:     { bg: '#D1FAE5', text: '#065F46' },
  failed:   { bg: '#FEE2E2', text: '#991B1B' },
  refunded: { bg: '#EDE9FE', text: '#5B21B6' },
};

export const getStatusColor = (status: string) =>
  statusColors[status] || { bg: '#F3F4F6', text: '#374151' };

export const getPaymentStatusColor = (status: string) =>
  paymentStatusColors[status] || { bg: '#F3F4F6', text: '#374151' };

// -- TYPOGRAPHY ---------------------------------------------------------------
// Font families — loaded via expo-google-fonts in App.tsx
// If fonts fail to load, system fonts are used as fallback.
export const fonts = {
  heading: 'Inter_700Bold',
  headingBlack: 'Inter_800ExtraBold',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemiBold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  // System fallbacks (used when custom fonts haven't loaded yet)
  systemHeading: Platform.select({ ios: 'System', android: 'sans-serif' }) ?? 'System',
  systemBody: Platform.select({ ios: 'System', android: 'sans-serif' }) ?? 'System',
} as const;

export const typography = {
  h1: {
    fontFamily: fonts.headingBlack,
    fontSize: 32,
    fontWeight: '800' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fonts.heading,
    fontSize: 24,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: '700' as TextStyle['fontWeight'],
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
  },
  buttonSmall: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
} as const;

// -- SPACING ------------------------------------------------------------------
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
} as const;

export const layout = {
  screenPaddingHorizontal: 20,
  cardPadding: 16,
  sectionGap: 24,
  itemGap: 12,
} as const;

// -- BORDER RADIUS ------------------------------------------------------------
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
} as const;

// -- SHADOWS ------------------------------------------------------------------
export const shadows = {
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 1,
    },
  }) ?? {},
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: 3,
    },
  }) ?? {},
  lg: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    android: {
      elevation: 6,
    },
  }) ?? {},
} as const;

// -- DEFAULT IMAGE ------------------------------------------------------------
export const DEFAULT_SALON_IMAGE = 'https://images.unsplash.com/photo-1626383137804-ff908d2753a2?w=800';

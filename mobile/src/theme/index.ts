import { Platform, TextStyle, ViewStyle } from 'react-native';

// =============================================================================
// TRIMIT GLOBAL THEME — Single source of truth for all colors, typography,
// spacing, and styling tokens. Change this file to update the entire app.
// =============================================================================

// -- COLOR TYPES --------------------------------------------------------------
// Use a flexible type so dark colors can have different hex values
export type ColorScheme = { [K in keyof typeof lightColors]: string };

// -- COLOR TYPES --------------------------------------------------------------
export type ColorScheme = { [K in keyof typeof lightColors]: string };

// -- LUXURY PALETTE (Quiet Confidence) ----------------------------------------
// Note: We use the same dark-first palette for both modes to maintain 
// the "Luxury Concierge" editorial aesthetic consistently.
export const luxuryColors = {
  // Primary brand (Gold Rule: Use with restraint)
  primary: '#f1d18d',       // Light Gold (Accents/Highlights)
  primaryDark: '#d4b574',   // Muted Gold (Interactive/Active)
  primaryLight: '#f9e8c4',  // Cream Gold (Soft accents)

  // Backgrounds (Obsidian Layers)
  background: '#121411',    // Deep Obsidian
  surface: '#1A1C19',       // Obsidian Elevate 1
  surfaceSecondary: '#242622', // Obsidian Elevate 2
  inverse: '#F5F5F5',       // Off-White

  // Text (High Contrast Editorial)
  text: '#F5F5F5',          // Primary White
  textSecondary: '#A1A1A1', // Muted Silver
  textTertiary: '#717171',  // Deep Grey
  textInverse: '#121411',   // Deep Obsidian
  textAccent: '#f1d18d',    // Gold highlight

  // Borders (Hairline depth)
  border: '#2A2C29',        // Tonal Divider
  borderFocus: '#f1d18d',   // Gold focus

  // Semantic (Muted luxury tones)
  error: '#FF5F5F',
  errorLight: '#2D1A1A',
  success: '#82E0AA',
  successLight: '#1A2D22',
  warning: '#F7DC6F',
  warningLight: '#2D2D1A',
  info: '#85C1E9',
  infoLight: '#1A242D',

  // Misc
  overlay: 'rgba(0,0,0,0.85)',
  shimmer: '#1A1C19',
  star: '#f1d18d',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Tab bar (Glassmorphism inspired)
  tabBar: '#121411',
  tabBarBorder: '#1A1C19',
} as const;

// For this premium experience, light/dark are both obsidian-based
export const lightColors = luxuryColors;
export const darkColors = luxuryColors;

// -- DEFAULT EXPORT -----------------------------------------------------------
export const colors = luxuryColors;

// -- STATUS BADGE COLORS ------------------------------------------------------
export const statusColors: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#2D2D1A', text: '#F7DC6F' },
  confirmed: { bg: '#1A242D', text: '#85C1E9' },
  completed: { bg: '#1A2D22', text: '#82E0AA' },
  cancelled: { bg: '#2D1A1A', text: '#FF5F5F' },
};

export const paymentStatusColors: Record<string, { bg: string; text: string }> = {
  pending:  { bg: '#2D2D1A', text: '#F7DC6F' },
  paid:     { bg: '#1A2D22', text: '#82E0AA' },
  failed:   { bg: '#2D1A1A', text: '#FF5F5F' },
  refunded: { bg: '#1A1A2D', text: '#BB8FCE' },
};

export const getStatusColor = (status: string) =>
  statusColors[status] || { bg: '#1A1C19', text: '#F5F5F5' };

export const getPaymentStatusColor = (status: string) =>
  paymentStatusColors[status] || { bg: '#1A1C19', text: '#F5F5F5' };

// -- TYPOGRAPHY ---------------------------------------------------------------
// Editorial Font Pairing: Cormorant Garamond (Serif) & Inter (Sans)
export const fonts = {
  heading: 'CormorantGaramond_700Bold',
  headingMedium: 'CormorantGaramond_600SemiBold',
  headingRegular: 'CormorantGaramond_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  // System fallbacks
  systemHeading: Platform.select({ ios: 'Georgia', android: 'serif' }) ?? 'serif',
  systemBody: Platform.select({ ios: 'System', android: 'sans-serif' }) ?? 'System',
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
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  pill: 32,
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

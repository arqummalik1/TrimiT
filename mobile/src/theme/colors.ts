/**
 * colors.ts
 * Raw color palettes — do NOT use directly in components.
 * Import from ThemeContext via useTheme() instead.
 */

// =============================================================================
// LIGHT PALETTE — Derived from web frontend (tailwind.config.js + index.css)
// Primary: orange-800 (#9A3412) | Background: stone-50 (#FAFAF9)
// =============================================================================
export const lightPalette = {
  // Backgrounds
  background:       '#FAFAF9', // stone-50 — page background
  surface:          '#FFFFFF', // white — card background
  surfaceSecondary: '#F5F5F4', // stone-100 — nested cards
  surfaceRaised:    '#FFFFFF', // white — elevated/modal
  surfaceHighlight: '#E2E8F0', // stone-200 — selector backgrounds

  // Text
  text:         '#1C1917', // stone-900 — primary text
  textSecondary:'#78716C', // stone-500 — muted text
  textTertiary: '#A8A29E', // stone-400 — dimmed text
  textInverse:  '#FFFFFF', // white — text on brand bg
  textAccent:   '#9A3412', // orange-800 — brand-tinted text

  // Brand — orange-800 system (matches web btn-primary)
  primary:      '#9A3412', // orange-800
  primaryDark:  '#C2410C', // orange-700 — pressed / hover
  primaryLight: '#FFF7ED', // orange-50 — tint background

  // Secondary — emerald system (matches web btn-secondary)
  secondary:      '#065F46', // emerald-800
  secondaryDark:  '#047857', // emerald-700
  secondaryLight: '#ECFDF5', // emerald-50

  // Borders
  border:      '#E7E5E4', // stone-200
  borderFocus: '#9A3412', // orange-800

  // Semantic
  error:        '#DC2626', // red-600
  errorLight:   '#FEF2F2', // red-50
  success:      '#059669', // emerald-600
  successLight: '#ECFDF5', // emerald-50
  warning:      '#D97706', // amber-600
  warningLight: '#FFFBEB', // amber-50
  info:         '#2563EB', // blue-600
  infoLight:    '#EFF6FF', // blue-50
  star:         '#F59E0B', // amber-400

  // Misc
  overlay:     'rgba(0,0,0,0.45)',
  shimmer:     '#F5F5F4',
  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',
  tabBar:      '#FFFFFF',
  tabBarBorder:'#E7E5E4',
} as const;

// =============================================================================
// DARK PALETTE — Luxury / Editorial (existing gold + obsidian system)
// Primary: light gold (#f1d18d) | Background: deep obsidian (#121411)
// =============================================================================
export const darkPalette = {
  // Backgrounds
  background:       '#121411', // Deep Obsidian
  surface:          '#1A1C19', // Obsidian Elevate 1
  surfaceSecondary: '#242622', // Obsidian Elevate 2
  surfaceRaised:    '#1A1C19', // Elevated / modal
  surfaceHighlight: '#2D2F2A', // Tonal Highlight

  // Text
  text:         '#F5F5F5', // Primary White
  textSecondary:'#A1A1A1', // Muted Silver
  textTertiary: '#717171', // Deep Grey
  textInverse:  '#121411', // Deep Obsidian (text on gold)
  textAccent:   '#f1d18d', // Gold highlight

  // Brand — gold system
  primary:      '#f1d18d', // Light Gold
  primaryDark:  '#d4b574', // Muted Gold
  primaryLight: '#f9e8c4', // Cream Gold (tint)

  // Secondary — Forest system
  secondary:      '#1A2D22', // Deep Forest
  secondaryDark:  '#111F17', // Darker Forest
  secondaryLight: '#243D2E', // Mighter Forest

  // Borders
  border:      '#2A2C29', // Tonal Divider
  borderFocus: '#f1d18d', // Gold focus

  // Semantic — muted luxury tones
  error:        '#FF5F5F',
  errorLight:   '#2D1A1A',
  success:      '#82E0AA',
  successLight: '#1A2D22',
  warning:      '#F7DC6F',
  warningLight: '#2D2D1A',
  info:         '#85C1E9',
  infoLight:    '#1A242D',
  star:         '#f1d18d',

  // Misc
  overlay:     'rgba(0,0,0,0.85)',
  shimmer:     '#1A1C19',
  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',
  tabBar:      '#121411',
  tabBarBorder:'#1A1C19',
} as const;

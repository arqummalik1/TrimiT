import { lightPalette, darkPalette } from '../../src/theme/colors';
import {
  typography,
  getLightStatusColors,
  getDarkStatusColors,
  getLightPaymentColors,
  getDarkPaymentColors,
  ThemeColors,
} from '../../src/theme/tokens';

// -----------------------------------------------------------------------------
// Color math helpers (WCAG 2.1 relative luminance + contrast)
// -----------------------------------------------------------------------------
const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
};

const luminance = (hex: string): number => {
  const [r, g, b] = rgb(hex)
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const mixHex = (a: string, b: string): string => {
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x
    .map((v, i) => Math.round((v + y[i]) / 2).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
};

/** Exhaustive at compile time: adding a ThemeColors key forces an update here. */
const THEME_COLOR_KEYS: Record<keyof ThemeColors, true> = {
  background: true, surface: true, surfaceSecondary: true, surfaceRaised: true,
  surfaceElevated: true, surfaceFloating: true, surfaceHighlight: true,
  text: true, textSecondary: true, textTertiary: true, textInverse: true, textAccent: true,
  primary: true, primaryDark: true, primaryLight: true, metallicAccent: true,
  editorialCanvas: true, editorialTerracotta: true, editorialInk: true,
  editorialMuted: true, editorialPaper: true, editorialActiveRing: true,
  secondary: true, secondaryDark: true, secondaryLight: true,
  border: true, borderFocus: true,
  error: true, errorLight: true, success: true, successLight: true,
  warning: true, warningLight: true, info: true, infoLight: true, star: true,
  statusPending: true, statusPendingBg: true, statusConfirmed: true, statusConfirmedBg: true,
  statusCompleted: true, statusCompletedBg: true, statusCancelled: true, statusCancelledBg: true,
  statusRescheduled: true, statusRescheduledBg: true, statusInProgress: true, statusInProgressBg: true,
  gradientPrimary: true, gradientPremium: true, gradientHighlight: true,
  overlay: true, shimmer: true, editorialShadow: true, editorialShadowStrong: true,
  white: true, black: true, transparent: true,
  tabBar: true, tabBarBorder: true,
};

const palettes: Array<[string, Record<string, unknown>]> = [
  ['light', lightPalette],
  ['dark', darkPalette],
];

describe('typography.tabTitle', () => {
  it('is slightly larger than h3 for customer tab screen headings', () => {
    expect(typography.tabTitle.fontSize).toBe(typography.h3.fontSize + 2);
    expect(typography.tabTitle.fontFamily).toBe(typography.h3.fontFamily);
  });
});

describe('ThemeColors contract', () => {
  it.each(palettes)('%s palette defines every ThemeColors key', (_name, palette) => {
    for (const key of Object.keys(THEME_COLOR_KEYS)) {
      expect(palette[key]).toBeDefined();
    }
  });

  it('light and dark palettes expose an identical key set', () => {
    expect(Object.keys(lightPalette).sort()).toEqual(Object.keys(darkPalette).sort());
  });

  it('gradients have at least two stops in both palettes', () => {
    for (const [, palette] of palettes) {
      for (const key of ['gradientPrimary', 'gradientPremium', 'gradientHighlight']) {
        expect((palette[key] as string[]).length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('TrimiT Brand Tokens', () => {
  it('Light mode uses Terracotta Orange-800 and Emerald-800', () => {
    expect(lightPalette.primary.toUpperCase()).toBe('#9A3412');
    expect(lightPalette.secondary.toUpperCase()).toBe('#065F46');
    expect(lightPalette.background.toUpperCase()).toBe('#FAFAF9');
  });

  it('Dark mode uses Champagne Gold and Deep Obsidian', () => {
    expect(darkPalette.primary.toLowerCase()).toBe('#f1d18d');
    expect(darkPalette.background.toUpperCase()).toBe('#121411');
    expect(darkPalette.secondary.toUpperCase()).toBe('#1A2D22');
  });

  it('uses warm neutrals in light mode', () => {
    const [r, , b] = rgb(lightPalette.background);
    expect(r).toBeGreaterThanOrEqual(b);
  });
});

describe('Contrast (WCAG 2.1)', () => {
  it('light palette meets AA for text and brand', () => {
    const p = lightPalette;
    expect(contrast(p.text, p.background)).toBeGreaterThanOrEqual(7);        // AAA body
    expect(contrast(p.textSecondary, p.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.textTertiary, p.background)).toBeGreaterThanOrEqual(2.0); // Tertiary/disabled text
    expect(contrast(p.primary, p.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.textInverse, p.primary)).toBeGreaterThanOrEqual(4.5);  // White text on orange CTA
    expect(contrast(p.primary, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.textInverse, p.secondary)).toBeGreaterThanOrEqual(4.5); // White text on emerald
  });

  it('dark palette meets AA for text and brand', () => {
    const p = darkPalette;
    expect(contrast(p.text, p.background)).toBeGreaterThanOrEqual(7);        // AAA body
    expect(contrast(p.textSecondary, p.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.textTertiary, p.background)).toBeGreaterThanOrEqual(2.0);
    expect(contrast(p.primary, p.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.textInverse, p.primary)).toBeGreaterThanOrEqual(4.5);  // Dark text on gold CTA
    expect(contrast(p.primary, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.text, p.secondary)).toBeGreaterThanOrEqual(4.5);        // White text on deep forest
  });

  it.each(palettes)('%s booking status badges are legible on their own tint', (_name, palette) => {
    const p = palette as unknown as ThemeColors;
    const pairs: Array<[string, string]> = [
      [p.statusPending, p.statusPendingBg],
      [p.statusConfirmed, p.statusConfirmedBg],
      [p.statusCompleted, p.statusCompletedBg],
      [p.statusCancelled, p.statusCancelledBg],
      [p.statusRescheduled, p.statusRescheduledBg],
      [p.statusInProgress, p.statusInProgressBg],
    ];
    for (const [fg, bg] of pairs) {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3.5);
      expect(contrast(bg, p.background)).toBeGreaterThanOrEqual(1.01);
    }
  });

  it.each(palettes)('%s gradientPrimary carries a white glyph', (_name, palette) => {
    const p = palette as unknown as ThemeColors;
    const mid = mixHex(p.gradientPrimary[0], p.gradientPrimary[p.gradientPrimary.length - 1]);
    expect(contrast(p.white, mid)).toBeGreaterThanOrEqual(3);
  });
});

describe('Status and payment maps mirror the palettes', () => {
  it('light status map matches lightPalette', () => {
    const m = getLightStatusColors();
    expect(m.pending).toEqual({ bg: lightPalette.statusPendingBg, text: lightPalette.statusPending });
    expect(m.confirmed).toEqual({ bg: lightPalette.statusConfirmedBg, text: lightPalette.statusConfirmed });
    expect(m.completed).toEqual({ bg: lightPalette.statusCompletedBg, text: lightPalette.statusCompleted });
    expect(m.cancelled).toEqual({ bg: lightPalette.statusCancelledBg, text: lightPalette.statusCancelled });
    expect(m.rescheduled).toEqual({ bg: lightPalette.statusRescheduledBg, text: lightPalette.statusRescheduled });
    expect(m.inProgress).toEqual({ bg: lightPalette.statusInProgressBg, text: lightPalette.statusInProgress });
  });

  it('dark status map matches darkPalette', () => {
    const m = getDarkStatusColors();
    expect(m.pending).toEqual({ bg: darkPalette.statusPendingBg, text: darkPalette.statusPending });
    expect(m.confirmed).toEqual({ bg: darkPalette.statusConfirmedBg, text: darkPalette.statusConfirmed });
    expect(m.completed).toEqual({ bg: darkPalette.statusCompletedBg, text: darkPalette.statusCompleted });
    expect(m.cancelled).toEqual({ bg: darkPalette.statusCancelledBg, text: darkPalette.statusCancelled });
    expect(m.rescheduled).toEqual({ bg: darkPalette.statusRescheduledBg, text: darkPalette.statusRescheduled });
    expect(m.inProgress).toEqual({ bg: darkPalette.statusInProgressBg, text: darkPalette.statusInProgress });
  });

  it('payment maps reuse the same semantic colors and stay legible', () => {
    const maps = [
      [getLightPaymentColors(), lightPalette] as const,
      [getDarkPaymentColors(), darkPalette] as const,
    ];
    for (const [map, palette] of maps) {
      expect(map.paid.text).toBe(palette.statusCompleted);
      expect(map.failed.text).toBe(palette.statusCancelled);
      expect(map.pending.text).toBe(palette.statusPending);
      expect(map.refunded.text).toBe(palette.statusRescheduled);
      for (const entry of Object.values(map)) {
        expect(contrast(entry.text, entry.bg)).toBeGreaterThanOrEqual(3.5);
      }
    }
  });
});

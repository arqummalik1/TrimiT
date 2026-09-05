# TrimiT Redesign Blueprint
## Champagne Noir · Editorial Layout · Liquid Glass

**Purpose:** This is the definitive, agent-ready implementation guide for redesigning the TrimiT app to match **Theme 1 (Champagne Noir)** with the **Editorial home layout**, the **Liquid Glass dock**, and **glass surfaces** across the Customer stack, Owner stack, and Auth — in **both light and dark mode**.

**Who consumes this:** Your AI coding agent (Google Antigravity / Cursor / Claude Code) and any developer. Every section contains production-ready React Native (Expo SDK 54 / RN 0.81 / React 19) code matching the V3 mockup file `TrimiT Theme 1 Champagne Noir.html` exactly.

**Golden rules for the implementing agent:**

1. **Presentation layer only.** Do not modify business logic, API clients, stores, or navigation *structure*. This redesign swaps visual components; routes and state stay identical.
2. **Tokens first.** Every color, radius, and shadow comes from `theme/colors.ts`. Zero hardcoded hex values in components.
3. **Glass is chrome-only.** Blur is expensive. GlassView is allowed on: the dock, floating summary bars, the confirm zone, UPI sheet, login card, and floating action buttons. Never inside scroll-list items.
4. **Both modes always.** Every component must be checked in light AND dark before a screen is considered done.
5. **Android parity.** Every glass surface has a solid translucent fallback (built into `GlassView`). Never ship blur-only.

---

## Table of Contents

| Chapter | Contents |
|---|---|
| 1 | Color tokens (light + dark) with WCAG data · `colors.ts` |
| 2 | Typography system (Cormorant Garamond + system stack) |
| 3 | Spacing, radius, elevation, vibe-art gradients |
| 4 | The Glass system — `GlassView` component + usage rules |
| 5 | Liquid Glass Dock — `FloatingTabBar.tsx` full rewrite |
| 6 | Shared components (11 building blocks) |
| 7 | Customer screens (7 full implementations) |
| 8 | Owner screens (4 full implementations) |
| 9 | Auth screen (Login — Editorial Calm) |
| 10 | Migration plan (6 phases, mapped to your repo) |
| 11 | Master agent prompt (copy-paste for Antigravity) |
| 12 | QA checklist |

**Packages required** (all Expo-compatible):

```bash
npx expo install expo-blur expo-linear-gradient react-native-svg expo-haptics
npx expo install @expo-google-fonts/cormorant-garamond expo-font
npx expo install react-native-reanimated   # most likely already installed
```

---

# Chapter 1 — Color Tokens

## 1.1 The Champagne Noir palette

Champagne Noir keeps the app warm and premium: ivory surfaces with espresso text in light mode, deep coffee-black surfaces with champagne-gold accents in dark mode. The **accent is brand gold** — used for CTAs, active states, prices, and links — never as a background wash.

### Light mode tokens

| Token | Hex | Used for |
|---|---|---|
| `background` | `#FAF8F4` | Screen background (warm ivory) |
| `surface` | `#FFFFFF` | Cards, sheets, inputs |
| `surface2` | `#F2EEE6` | Segmented track, icon chips, progress track |
| `text` | `#201B14` | Primary text (espresso) |
| `textMuted` | `#7A7163` | Secondary text, labels, inactive tabs |
| `border` | `#E6DFD2` | Hairlines, card outlines, input borders |
| `accent` | `#8A6524` | Buttons, links, active states, prices (bronze-gold) |
| `onAccent` | `#FFFFFF` | Text/icons on accent |
| `accentSoft` | `#F3EAD8` | Tinted chips, trust pills, trial banner, total band |
| `success` | `#178A50` | "Open", "Confirmed", availability dots |
| `successSoft` | `rgba(23,138,80,.12)` | Success chip backgrounds |
| `warning` | `#B45309` | Hold-timer amber, "Pending" |
| `warningSoft` | `rgba(180,83,9,.12)` | Pending chip backgrounds |
| `danger` | `#D43535` | Cancelled, decline, sign out |
| `dangerSoft` | `rgba(212,53,53,.12)` | Danger chip backgrounds |
| `goldStar` | `#E8A33D` | Star ratings, "Popular" tint |
| `glassFill` | `rgba(255,255,255,0.60)` | Translucent fill layered over blur |
| `glassFillAndroid` | `rgba(255,255,255,0.88)` | Android solid fallback |
| `glassBorder` | `rgba(32,27,20,0.09)` | Glass edge hairline |
| `glassHighlight` | `rgba(255,255,255,0.35)` | 1px inner top specular highlight |

### Dark mode tokens

| Token | Hex | Used for |
|---|---|---|
| `background` | `#13100C` | Screen background (coffee black) |
| `surface` | `#1B1712` | Cards, sheets, inputs |
| `surface2` | `#241E16` | Segmented track, icon chips |
| `text` | `#F2ECE0` | Primary text (champagne white) |
| `textMuted` | `#A79B87` | Secondary text |
| `border` | `#2E2820` | Hairlines, outlines |
| `accent` | `#E3C77F` | Buttons, links, active states (champagne gold) |
| `onAccent` | `#241B07` | Text/icons on accent (dark espresso) |
| `accentSoft` | `#2C2415` | Tinted chips, banners |
| `success` | `#2EAE6B` | Brighter for dark contrast |
| `successSoft` | `rgba(46,174,107,.16)` | |
| `warning` | `#D97A1F` | |
| `warningSoft` | `rgba(217,122,31,.16)` | |
| `danger` | `#E45757` | |
| `dangerSoft` | `rgba(228,87,87,.14)` | |
| `goldStar` | `#E8A33D` | |
| `glassFill` | `rgba(27,23,18,0.55)` | |
| `glassFillAndroid` | `rgba(27,23,18,0.90)` | |
| `glassBorder` | `rgba(242,236,224,0.10)` | |
| `glassHighlight` | `rgba(255,255,255,0.14)` | |

### WCAG audit (measured, not estimated)

| Combination | Ratio | Grade |
|---|---|---|
| Light `text` on `background` | 16.12:1 | AAA |
| Light `textMuted` on `background` | 4.53:1 | AA |
| Light `accent` on `background` (links/prices) | 4.99:1 | AA |
| Light `onAccent` on `accent` (buttons) | 5.29:1 | AA |
| Dark `text` on `background` | 16.12:1 | AAA |
| Dark `textMuted` on `background` | 6.94:1 | AA |
| Dark `accent` on `background` | 11.51:1 | AA |
| Dark `onAccent` on `accent` | 10.32:1 | AA |
| Light `success` on `background` | 4.14:1 | AA-large (use bold ≥14px — chips qualify) |
| Dark `success` on `background` | 6.67:1 | AA |
| Light `warning` / `danger` on `background` | 4.73 / 4.54:1 | AA |

Rule: status colors are always rendered **bold on their soft-tinted background** (e.g. `Confirmed` = bold 11.5px on `successSoft`), which satisfies AA-large everywhere.

## 1.2 `mobile/src/theme/colors.ts` — complete file

```ts
/**
 * TrimiT design system — Champagne Noir
 * Single source of truth for every color in the app.
 * Components must never hardcode hex values.
 */

export const lightPalette = {
  // Surfaces
  background: '#FAF8F4',
  surface: '#FFFFFF',
  surface2: '#F2EEE6',

  // Text
  text: '#201B14',
  textMuted: '#7A7163',

  // Lines
  border: '#E6DFD2',

  // Brand accent (bronze-gold in light)
  accent: '#8A6524',
  onAccent: '#FFFFFF',
  accentSoft: '#F3EAD8',

  // Status
  success: '#178A50',
  successSoft: 'rgba(23,138,80,0.12)',
  warning: '#B45309',
  warningSoft: 'rgba(180,83,9,0.12)',
  danger: '#D43535',
  dangerSoft: 'rgba(212,53,53,0.12)',

  // Misc
  goldStar: '#E8A33D',
  overlayScrim: 'rgba(10,6,3,0.45)',

  // Glass (chrome only — see GlassView)
  glassFill: 'rgba(255,255,255,0.60)',
  glassFillAndroid: 'rgba(255,255,255,0.88)',
  glassBorder: 'rgba(32,27,20,0.09)',
  glassHighlight: 'rgba(255,255,255,0.35)',
} as const;

export const darkPalette = {
  background: '#13100C',
  surface: '#1B1712',
  surface2: '#241E16',

  text: '#F2ECE0',
  textMuted: '#A79B87',

  border: '#2E2820',

  accent: '#E3C77F',
  onAccent: '#241B07',
  accentSoft: '#2C2415',

  success: '#2EAE6B',
  successSoft: 'rgba(46,174,107,0.16)',
  warning: '#D97A1F',
  warningSoft: 'rgba(217,122,31,0.16)',
  danger: '#E45757',
  dangerSoft: 'rgba(228,87,87,0.14)',

  goldStar: '#E8A33D',
  overlayScrim: 'rgba(0,0,0,0.55)',

  glassFill: 'rgba(27,23,18,0.55)',
  glassFillAndroid: 'rgba(27,23,18,0.90)',
  glassBorder: 'rgba(242,236,224,0.10)',
  glassHighlight: 'rgba(255,255,255,0.14)',
} as const;

export type Palette = typeof lightPalette;

/** Radii — "continuous corner" feel, larger than stock iOS defaults. */
export const radius = {
  sm: 12,    // chips, small inputs
  md: 16,    // rows, inner cards
  lg: 20,    // standard cards
  xl: 26,    // hero cards, confirm zone
  dock: 38,  // floating dock
  phone: 54, // (mockups only)
} as const;

/** Spacing scale — everything is a multiple of 4. */
export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 44,
} as const;

/** Soft elevation used across cards (light values; alpha-tint works on dark too). */
export const elevation = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  float: {
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;
```

## 1.3 `mobile/src/theme/ThemeProvider.tsx` — theme context

If you already have a theme provider, keep yours but expose the same shape: `{ C, mode, setMode }`.

```tsx
// mobile/src/theme/ThemeProvider.tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, type Palette } from './colors';

type Mode = 'light' | 'dark';

type ThemeCtx = {
  C: Palette;
  mode: Mode;
  isDark: boolean;
  setMode: (m: Mode | 'system') => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<Mode | 'system'>('system');

  const mode: Mode = override === 'system' ? (system === 'dark' ? 'dark' : 'light') : override;

  const setMode = useCallback((m: Mode | 'system') => setOverride(m), []);

  const value = useMemo<ThemeCtx>(
    () => ({ C: mode === 'dark' ? darkPalette : lightPalette, mode, isDark: mode === 'dark', setMode }),
    [mode, setMode],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
```

Wire it once, at the root (e.g. inside your existing providers in `App.tsx`):

```tsx
<ThemeProvider>
  {/* existing QueryClientProvider / NavigationContainer / etc. */}
</ThemeProvider>
```

---

# Chapter 2 — Typography

## 2.1 Strategy: Apple clarity × TrimiT warmth

- **UI text** = the system stack (SF Pro on iOS, Roboto on Android). Native feel, zero font cost.
- **Brand moments** = **Cormorant Garamond** (serif), used ONLY for: screen display titles ("Discover", "My Bookings"), the login headline, success headline, hero card titles, and the TRIMIT wordmark. Discipline keeps the editorial feel without turning the app into a fashion magazine.

### Type scale

| Role | Font | Size/Weight | Usage |
|---|---|---|---|
| `display` | Cormorant Garamond 600 | 34 / -0.02em | Screen titles (Discover, Bookings) |
| `displayItalic` | Cormorant Garamond 500 Italic | 28–32 | Hero card titles, login headline |
| `title` | System 700 | 22 | Section headers inside content |
| `sectionSerif` | Cormorant Garamond 600 | 26 | Home rail headings ("Top rated near you") |
| `headline` | System 700 | 16.5–17 | Card titles, row names, service names |
| `body` | System 500 | 15 | Content text |
| `sub` | System 500–600 | 13–13.5 | Metadata lines |
| `caption` | System 600 | 12 | Chips, helper text |
| `overline` | System 800 | 11–12, +0.08em tracking, UPPERCASE | Eyebrows, screen labels, group headers |
| `price` | System 800 | 17 | Prices (tabular-nums) |
| `big` | System 800 | 20–26 | KPI values, booking dates, totals |

## 2.2 Font loading — `App.tsx` (root)

```tsx
import { useFonts } from 'expo-font';
import {
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_500Medium_Italic,
} from '@expo-google-fonts/cormorant-garamond';

export default function App() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_500Medium_Italic,
  });
  if (!fontsLoaded) return null; // or your splash gate
  // ...existing providers
}
```

## 2.3 `mobile/src/theme/typography.ts`

```ts
import { TextStyle } from 'react-native';
import { useTheme } from './ThemeProvider';

/** Serif for brand moments only. System stack for everything else. */
export const fonts = {
  serif: 'CormorantGaramond_600SemiBold',
  serifMedium: 'CormorantGaramond_500Medium',
  serifItalic: 'CormorantGaramond_500Medium_Italic',
  ui: undefined as TextStyle['fontFamily'], // undefined = system font
};

/** Helper hook — returns ready-made text styles bound to the active palette. */
export function useType() {
  const { C } = useTheme();
  return {
    display: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 38, color: C.text, letterSpacing: -0.6 } as TextStyle,
    sectionSerif: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 30, color: C.text, letterSpacing: -0.3 } as TextStyle,
    displayItalic: { fontFamily: fonts.serifItalic, fontSize: 30, lineHeight: 34, color: C.text, letterSpacing: -0.2 } as TextStyle,
    title: { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.3 } as TextStyle,
    headline: { fontSize: 16.5, fontWeight: '700', color: C.text, letterSpacing: -0.2 } as TextStyle,
    body: { fontSize: 15, fontWeight: '500', color: C.text } as TextStyle,
    sub: { fontSize: 13, fontWeight: '600', color: C.textMuted } as TextStyle,
    caption: { fontSize: 12, fontWeight: '600', color: C.textMuted } as TextStyle,
    overline: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase', color: C.textMuted } as TextStyle,
    price: { fontSize: 17, fontWeight: '800', color: C.accent, fontVariant: ['tabular-nums'] } as TextStyle,
  };
}
```

---

# Chapter 3 — Structure Tokens & the Vibe System

## 3.1 Layout constants

```ts
// mobile/src/theme/layout.ts
export const layout = {
  screenHPadding: 24,     // every screen's horizontal gutter
  cardGap: 12,            // vertical gap between cards
  railGap: 14,            // horizontal rail gap
  railCardWidth: 286,     // salon card width in rails
  dockHeight: 76,
  dockBottom: 26,
  screenBottomInset: 130, // scroll content bottom padding so docks never cover content
} as const;
```

## 3.2 Vibe-art gradients — `VibeArt.tsx`

Every salon gets a **vibe color** — the gradient placeholder shown while (or instead of) photos. This is what gives cards their distinct personalities (gold champagne, blush, spa, slate, coral, noir). Add `vibe` to your Salon type: `'gold' | 'blush' | 'spa' | 'slate' | 'coral' | 'noir'`.

```tsx
// mobile/src/components/vibe/VibeArt.tsx
import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type Vibe = 'gold' | 'blush' | 'spa' | 'slate' | 'coral' | 'noir';

const VIBES: Record<Vibe, { colors: [string, string, string, string]; angle: { start: { x: number; y: number }; end: { x: number; y: number } } }> = {
  gold:  { colors: ['#F0D9A8', '#D4AF6E', '#8A6A38', '#4A3A20'], angle: { start: { x: 0.2, y: 0.15 }, end: { x: 0.9, y: 0.9 } } },
  blush: { colors: ['#F6DAD3', '#E0A8A0', '#A96A68', '#5E3838'], angle: { start: { x: 0.75, y: 0.2 }, end: { x: 0.1, y: 0.9 } } },
  spa:   { colors: ['#BFD8CC', '#6FA093', '#3A6357', '#1C3830'], angle: { start: { x: 0.3, y: 0.8 }, end: { x: 0.8, y: 0.1 } } },
  slate: { colors: ['#C4CBD4', '#8E99A8', '#4E5866', '#262D38'], angle: { start: { x: 0.7, y: 0.1 }, end: { x: 0.2, y: 0.95 } } },
  coral: { colors: ['#F6C89F', '#E89868', '#B45E44', '#63301F'], angle: { start: { x: 0.25, y: 0.2 }, end: { x: 0.85, y: 0.9 } } },
  noir:  { colors: ['#2A241C', '#17130E', '#0C0A07', '#0C0A07'], angle: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } },
};

type Props = {
  vibe: Vibe;
  radius?: number;
  style?: ViewStyle;
  /** Optional photo URL — rendered on top with a fade-in when loaded. */
  photoUrl?: string;
  children?: React.ReactNode;
};

export function VibeArt({ vibe, radius = 18, style, photoUrl, children }: Props) {
  const v = VIBES[vibe] ?? VIBES.gold;
  const [loaded, setLoaded] = React.useState(false);
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={v.colors}
        start={v.angle.start}
        end={v.angle.end}
        locations={[0, 0.4, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          onLoad={() => setLoaded(true)}
          style={[StyleSheet.absoluteFill, { opacity: loaded ? 1 : 0 }]}
          resizeMode="cover"
        />
      ) : null}
      {children}
    </View>
  );
}
```

Usage — every salon surface in the app:

```tsx
<VibeArt vibe={salon.vibe} photoUrl={salon.coverUrl} radius={radius.lg} style={{ aspectRatio: 16 / 9 }}>
  {/* badge / name overlay goes here */}
</VibeArt>
```

---

# Chapter 4 — The Glass System

## 4.1 How the mockup's glass works (and how we reproduce it)

The HTML mockup's glass is `backdrop-filter: blur(22px) saturate(1.5)` + a 60% translucent fill + a 1px border at 9% ink + a 1px **inner top highlight** at 22–35% white (the "specular" edge that sells the glass illusion). In React Native:

| Mockup layer | RN implementation |
|---|---|
| `backdrop-filter: blur(22px)` | `expo-blur` `<BlurView intensity={60}>` (iOS) |
| `saturate(1.5)` | Not available — compensate with the tinted fill below |
| 58–60% translucent fill | Absolute-fill `View` with `glassFill` over the blur |
| 1px border @ 9% ink | 1px border on the container, `glassBorder` |
| Inner top highlight | `borderTopColor: glassHighlight` (brighter than the other edges) |
| Outer float shadow | `elevation.float` shadow preset |
| Android | **No system blur guarantee** → solid `glassFillAndroid` fallback (always legible) |

## 4.2 `mobile/src/components/glass/GlassView.tsx` — the one glass primitive

```tsx
// mobile/src/components/glass/GlassView.tsx
import React from 'react';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { elevation } from '../../theme/colors';

type Props = ViewProps & {
  /** Blur strength. 60 ≈ the mockup's blur(22px). */
  intensity?: number;
  radius?: number;
  /** Add the floating shadow (dock, summary bars, sheets). */
  float?: boolean;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
};

/**
 * Liquid-glass surface. Chrome only — never inside scroll-list items.
 * iOS: real blur + translucent fill + specular top edge.
 * Android: solid translucent fallback (identical geometry, no GPU blur).
 */
export function GlassView({ intensity = 60, radius = 26, float = false, style, children, ...rest }: Props) {
  const { C, isDark } = useTheme();

  if (Platform.OS === 'android') {
    return (
      <View
        {...rest}
        style={[
          {
            borderRadius: radius,
            backgroundColor: C.glassFillAndroid,
            borderWidth: 1,
            borderColor: C.glassBorder,
            borderTopColor: C.glassHighlight,
            overflow: 'hidden',
          },
          float ? elevation.float : null,
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      {...rest}
      style={[{ borderRadius: radius, overflow: 'hidden' }, float ? elevation.float : null, style]}
    >
      <BlurView intensity={intensity} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      {/* translucent tint over the blur — the "saturate" stand-in */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.glassFill }]} />
      {/* specular edge: all sides faint ink, top edge bright */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            borderWidth: 1,
            borderColor: C.glassBorder,
            borderTopColor: C.glassHighlight,
          },
        ]}
      />
      {children}
    </View>
  );
}
```

## 4.3 Where glass is used (exhaustive list)

| Surface | Component | Radius | Notes |
|---|---|---|---|
| Bottom dock | `FloatingTabBar` | 38 | Chapter 5 |
| Service summary bar | `SummaryBar` | 22 | Slides up when services selected |
| Time confirm zone | `ConfirmZone` | 24 | Holds the hold-timer |
| UPI bottom sheet | `UPISheet` | top corners 28 | Modal presentation |
| Profile hero fabs | `GlassFab` | 999 | Back / Save buttons over hero |
| Login card (Glass Immersion variant) | `GlassView` | 24 | Auth chapter |
| Map "Near you" pill | `GlassView` | 14 | Discover map layout |

**Glass performance rules:**

1. Max **2 blurred surfaces visible** at once (dock + one floating bar).
2. Never blur inside `FlatList` items — cards use `surface` + `elevation.card`.
3. On Android the fallback is automatic — do not branch manually in screens.
4. If you later target iOS 26 system glass via a native module, `GlassView` is the single file to swap — no screen changes.

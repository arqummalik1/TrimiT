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

---

# Chapter 5 — Liquid Glass Dock (FloatingTabBar)

This replaces the existing `mobile/src/components/FloatingTabBar.tsx` in full. Same props contract as the current bar so both `CustomerTabs.tsx` and `OwnerTabs.tsx` keep working — only the visual internals change.

**Anatomy (matches the mockup exactly):**

```
┌──────────────────────────────────────────────┐
│  GlassView (radius 38, float shadow)         │
│  ┌─────────┬─────────┬─────────┐             │
│  │  ╭───╮  │         │         │  ← pill:    │
│  │  │ © │  │         │         │    accent   │
│  │  │icon│ │  icon   │  icon   │    @14%     │
│  │  │Home│ │ Bookings│ Profile │             │
│  │  ╰───╯  │         │         │             │
│  └─────────┴─────────┴─────────┘             │
└──────────────────────────────────────────────┘
```

- The **pill** is an absolutely-positioned rounded view, width = `100%/tabs.length`, that springs horizontally under the active tab (`withSpring`, slight overshoot for the liquid feel).
- Active tab: icon+label in `accent`; inactive in `textMuted`.
- Tap feedback: `expo-haptics` light impact (optional but recommended).
- The bar sits `absolute` at `bottom: 26`, `left/right: 18` — it floats over content; screens add `paddingBottom: layout.screenBottomInset` to their scroll views.

## 5.1 `mobile/src/components/FloatingTabBar.tsx` — full replacement

```tsx
// mobile/src/components/FloatingTabBar.tsx
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GlassView } from './glass/GlassView';
import { useTheme } from '../theme/ThemeProvider';
import { layout } from '../theme/layout';

export type DockTab = {
  key: string;
  label: string;
  /** Render the icon with the given color so active/inactive tint just works. */
  icon: (color: string, size: number) => React.ReactNode;
};

type Props = {
  tabs: DockTab[];
  activeIndex: number;
  onTabPress: (index: number) => void;
  style?: ViewStyle;
};

const SPRING = { damping: 16, stiffness: 200, mass: 0.9 };

export function FloatingTabBar({ tabs, activeIndex, onTabPress, style }: Props) {
  const { C } = useTheme();
  const n = tabs.length;
  const progress = useDerivedValue(() => withSpring(activeIndex, SPRING), [activeIndex]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${progress.value * 100}%` }],
  }));

  const handlePress = useCallback(
    (i: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onTabPress(i);
    },
    [onTabPress],
  );

  return (
    <GlassView
      radius={layout.dockHeight / 2}
      float
      intensity={60}
      style={[
        {
          position: 'absolute',
          bottom: layout.dockBottom,
          left: 18,
          right: 18,
          height: layout.dockHeight,
        },
        style,
      ]}
    >
      <View style={StyleSheet.absoluteFill}>
        {/* sliding pill — one cell wide, springs under the active tab */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 9,
              bottom: 9,
              left: 9,
              width: `${100 / n}%`,
              borderRadius: layout.dockHeight / 2 - 9,
              backgroundColor: `${C.accent}24`, // accent @ ~14%
            },
            pillStyle,
          ]}
        />
        {/* tab cells */}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
          {tabs.map((tab, i) => (
            <DockTabItem
              key={tab.key}
              tab={tab}
              index={i}
              activeIndex={activeIndex}
              progress={progress}
              accent={C.accent}
              muted={C.textMuted}
              onPress={() => handlePress(i)}
            />
          ))}
        </View>
      </View>
    </GlassView>
  );
}

type ItemProps = {
  tab: DockTab;
  index: number;
  activeIndex: number;
  progress: Animated.SharedValue<number>;
  accent: string;
  muted: string;
  onPress: () => void;
};

function DockTabItem({ tab, index, progress, accent, muted, onPress }: ItemProps) {
  // Interpolate icon/label color smoothly between muted → accent as the pill passes.
  const color = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [index - 1, index, index + 1], [muted, accent, muted]),
  }));

  return (
    <Pressable onPress={onPress} style={styles.cell} accessibilityRole="tab">
      <Animated.View style={[styles.inner, { opacity: 1 }]}>
        <Animated.View style={color}>
          {tab.icon(muted, 27) /* icon wrapper — see note below */}
        </Animated.View>
        <Animated.Text style={[styles.label, color]} numberOfLines={1}>
          {tab.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center', gap: 4 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});
```

**Icon tinting note (for the agent):** the simplest robust approach is to let each tab's `icon` closure read the theme and render the correct tint directly:

```tsx
const tabs: DockTab[] = [
  {
    key: 'discover',
    label: 'Home',
    icon: (color, size) => <Ionicons name="home-outline" size={size} color={color} />,
  },
  {
    key: 'bookings',
    label: 'Bookings',
    icon: (color, size) => <Ionicons name="calendar-outline" size={size} color={color} />,
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: (color, size) => <Ionicons name="person-outline" size={size} color={color} />,
  },
];
```

…and inside `DockTabItem`, render `tab.icon(isActive ? accent : muted, 27)` driven by `activeIndex === index` (a plain boolean re-render is fine; the color *animation* on the label is the polish). Keep the implementation pragmatic — the pill spring + label color animation are what create the liquid feel.

## 5.2 Wiring into the existing navigators

`CustomerTabs.tsx` — replace the current bar usage; nothing else changes:

```tsx
function CustomerTabs() {
  // ...existing <Tab.Navigator> or custom state — keep your navigation structure.
  // If you use react-navigation bottom tabs, set tabBar={(props) => <FloatingTabBar {...props} />}
  // with the same tabs array as before; the component maps index → route jump.
}
```

Acceptance: dock floats over content, pill springs with overshoot, works identically on `OwnerTabs` with 4 tabs, identical in dark mode (GlassView handles tint).

---

# Chapter 6 — Shared Components

All files go under `mobile/src/components/`. These are the building blocks every screen composes — build them first, screens become assembly work.

## 6.1 `SectionHeader.tsx` — serif section titles

```tsx
// mobile/src/components/SectionHeader.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useType } from '../theme/typography';
import { layout } from '../theme/layout';

export function SectionHeader({ title, actionLabel, onAction }: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { C } = useTheme();
  const t = useType();
  return (
    <View style={styles.wrap}>
      <Text style={t.sectionSerif}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: C.accent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenHPadding,
    marginTop: 26,
    marginBottom: 12,
  },
  action: { fontSize: 14, fontWeight: '700' },
});
```

## 6.2 `SalonCard.tsx` — the rail card (Top rated near you)

```tsx
// mobile/src/components/salon/SalonCard.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VibeArt, type Vibe } from '../vibe/VibeArt';
import { useTheme } from '../../theme/ThemeProvider';
import { layout } from '../../theme/layout';

export type SalonCardData = {
  id: string;
  name: string;
  rating: number;
  distanceKm: number;
  fromPrice: number;
  vibe: Vibe;
  photoUrl?: string;
  badge?: string; // "Top rated" | "Editor's pick" | "New"
};

export function SalonCard({ salon, onPress }: { salon: SalonCardData; onPress: () => void }) {
  const { C } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: C.surface, borderColor: C.border, width: layout.railCardWidth }, pressed && { transform: [{ scale: 0.965 }] }]}
    >
      <VibeArt vibe={salon.vibe} photoUrl={salon.photoUrl} radius={0} style={styles.image}>
        {salon.badge ? (
          <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.42)' }]}>
            <Text style={styles.badgeText}>{salon.badge}</Text>
          </View>
        ) : null}
      </VibeArt>
      <View style={styles.body}>
        <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>{salon.name}</Text>
        <View style={styles.meta}>
          <View style={styles.rating}>
            <Ionicons name="star" size={12} color={C.goldStar} />
            <Text style={[styles.ratingText, { color: C.text }]}>{salon.rating.toFixed(1)}</Text>
          </View>
          <Text style={[styles.dot, { color: C.textMuted }]}>·</Text>
          <Text style={[styles.metaText, { color: C.textMuted }]}>{salon.distanceKm.toFixed(1)} km</Text>
        </View>
        <Text style={[styles.price, { color: C.accent }]}>
          From <Text style={{ color: C.textMuted, fontWeight: '600' }}>₹{salon.fromPrice}</Text>
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  image: { aspectRatio: 16 / 9 },
  badge: {
    position: 'absolute', top: 10, left: 10,
    paddingHorizontal: 11, paddingVertical: 4, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  badgeText: { color: '#FFFDF9', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  body: { padding: 14 },
  name: { fontSize: 16.5, fontWeight: '700', letterSpacing: -0.2, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '700' },
  dot: { fontSize: 13 },
  metaText: { fontSize: 13, fontWeight: '600' },
  price: { marginTop: 7, fontSize: 14.5, fontWeight: '700' },
});
```

## 6.3 `Rail.tsx` — horizontal snap row

```tsx
// mobile/src/components/Rail.tsx
import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { layout } from '../theme/layout';

export function Rail<T extends { id: string }>({ data, renderItem }: {
  data: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(i) => i.id}
      showsHorizontalScrollIndicator={false}
      snapToInterval={layout.railCardWidth + layout.railGap}
      decelerationRate="fast"
      contentContainerStyle={styles.content}
      renderItem={({ item }) => renderItem(item)}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenHPadding, gap: layout.railGap },
});
```

## 6.4 `BentoCategories.tsx` — Browse by category (4-up grid)

```tsx
// mobile/src/components/home/BentoCategories.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { layout } from '../../theme/layout';

const CATEGORIES = [
  { key: 'hair', label: 'Hair', icon: 'cut-outline' },
  { key: 'skin', label: 'Skin', icon: 'water-outline' },
  { key: 'nails', label: 'Nails', icon: 'grid-outline' },
  { key: 'spa', label: 'Spa', icon: 'flower-outline' },
] as const;

export function BentoCategories({ onPress }: { onPress: (key: string) => void }) {
  const { C } = useTheme();
  return (
    <View style={styles.grid}>
      {CATEGORIES.map((c) => (
        <Pressable
          key={c.key}
          onPress={() => onPress(c.key)}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: C.surface, borderColor: C.border },
            pressed && { transform: [{ scale: 0.92 }] },
          ]}
        >
          <Ionicons name={c.icon} size={27} color={C.accent} />
          <Text style={[styles.label, { color: C.text }]}>{c.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: layout.screenHPadding,
    gap: 12,
  },
  tile: {
    flexBasis: '23%', flexGrow: 1,
    aspectRatio: 1 / 1.06,
    borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', gap: 9,
  },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
});
```

## 6.5 `SalonListItem.tsx` — the list row (Salons near you)

Row = vibe thumb + name/meta + right column (`Next slot` chip + from-price).

```tsx
// mobile/src/components/salon/SalonListItem.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VibeArt, type Vibe } from '../vibe/VibeArt';
import { useTheme } from '../../theme/ThemeProvider';
import { layout } from '../../theme/layout';

export type SalonRowData = {
  id: string; name: string; rating: number;
  bookingsCount?: string; distanceKm?: number;
  nextSlot?: string; fromPrice: number; vibe: Vibe; photoUrl?: string;
};

export function SalonListItem({ salon, onPress }: { salon: SalonRowData; onPress: () => void }) {
  const { C } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { paddingHorizontal: layout.screenHPadding }]}>
      <VibeArt vibe={salon.vibe} photoUrl={salon.photoUrl} radius={17} style={styles.thumb}>
        <Text style={styles.thumbLetter}>{salon.name[0]}</Text>
      </VibeArt>
      <View style={styles.mid}>
        <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>{salon.name}</Text>
        <View style={styles.meta}>
          <Ionicons name="star" size={12} color={C.goldStar} />
          <Text style={[styles.metaText, { color: C.text }]}>{salon.rating.toFixed(1)}</Text>
          {salon.distanceKm ? (
            <Text style={[styles.metaText, { color: C.textMuted }]}>· {salon.distanceKm.toFixed(1)} km</Text>
          ) : salon.bookingsCount ? (
            <Text style={[styles.metaText, { color: C.textMuted }]}>· {salon.bookingsCount} bookings</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>
        {salon.nextSlot ? (
          <View style={[styles.chip, { backgroundColor: C.successSoft }]}>
            <Ionicons name="time-outline" size={11} color={C.success} />
            <Text style={[styles.chipText, { color: C.success }]}>Next {salon.nextSlot}</Text>
          </View>
        ) : null}
        <Text style={[styles.price, { color: C.text }]}>
          <Text style={{ color: C.textMuted, fontWeight: '600' }}>from </Text>₹{salon.fromPrice}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  thumb: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  thumbLetter: { color: 'rgba(255,253,247,0.9)', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 27 },
  mid: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, marginBottom: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '800' },
  price: { fontSize: 14, fontWeight: '700' },
});
```

Insert hairline dividers between rows: `<View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginHorizontal: 24 }} />`.

## 6.6 `AddButton.tsx` — the morphing + / ✓ service button

The most-loved micro-interaction from the mockup. `+` rotates out, a check rotates in, with a spring overshoot.

```tsx
// mobile/src/components/services/AddButton.tsx
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, interpolate } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';

export function AddButton({ selected, onPress }: { selected: boolean; onPress: () => void }) {
  const { C } = useTheme();
  const sel = useSharedValue(selected ? 1 : 0);

  React.useEffect(() => {
    sel.value = withSpring(selected ? 1 : 0, { damping: 14, stiffness: 220 });
    if (selected) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [selected]);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(sel.value, [0, 1], [C.surface, C.accent]),
    borderColor: interpolateColor(sel.value, [0, 1], [C.border, C.accent]),
  }));
  const plusStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(sel.value, [0, 1], [0, 90])}deg` }, { scale: interpolate(sel.value, [0, 1], [1, 0.4]) }],
    opacity: interpolate(sel.value, [0, 1], [1, 0]),
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(sel.value, [0, 1], [-90, 0])}deg` }, { scale: interpolate(sel.value, [0, 1], [0.4, 1]) }],
    opacity: sel.value,
  }));

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Animated.View style={[styles.circle, bgStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, plusStyle]}>
          <Ionicons name="add" size={18} color={C.text} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, checkStyle]}>
          <Ionicons name="checkmark" size={18} color={C.onAccent} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
```

## 6.7 `ServiceRow.tsx` — a selectable service line

```tsx
// mobile/src/components/services/ServiceRow.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AddButton } from './AddButton';
import { useTheme } from '../../theme/ThemeProvider';

export type Service = {
  id: string; name: string; minutes: number; price: number; mrp?: number; popular?: boolean;
};

export function ServiceRow({ service, selected, onToggle }: {
  service: Service; selected: boolean; onToggle: () => void;
}) {
  const { C } = useTheme();
  return (
    <View style={[styles.row, { borderTopColor: C.border }]}>
      <View style={styles.left}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: C.text }]}>{service.name}</Text>
          {service.popular ? (
            <View style={[styles.pop, { backgroundColor: 'rgba(232,163,61,0.14)' }]}>
              <Text style={[styles.popText, { color: C.isDark ? '#E8C077' : '#9A6A15' }]}>Popular</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.meta}>
          <Ionicons name="time-outline" size={13} color={C.textMuted} />
          <Text style={[styles.metaText, { color: C.textMuted }]}>{service.minutes} min</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.price, { color: C.text }]}>
          ₹{service.price.toLocaleString('en-IN')}
          {service.mrp ? <Text style={styles.mrp}>  ₹{service.mrp.toLocaleString('en-IN')}</Text> : null}
        </Text>
        <AddButton selected={selected} onPress={onToggle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderTopWidth: 1 },
  left: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  name: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  pop: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  popText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13.5, fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: 8 },
  price: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  mrp: { fontSize: 13, color: '#7A7163', fontWeight: '600', textDecorationLine: 'line-through' },
});
```

## 6.8 `SummaryBar.tsx` — the glass checkout pill (service selection)

```tsx
// mobile/src/components/services/SummaryBar.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from '../glass/GlassView';
import { useTheme } from '../../theme/ThemeProvider';

export function SummaryBar({ count, total, visible, onContinue }: {
  count: number; total: number; visible: boolean; onContinue: () => void;
}) {
  const { C } = useTheme();
  const y = useSharedValue(150);
  React.useEffect(() => {
    y.value = withSpring(visible ? 0 : 150, { damping: 18, stiffness: 170 });
  }, [visible]);

  const barStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.wrap, barStyle]}>
      <GlassView radius={22} float intensity={65} style={styles.glass}>
        <View style={styles.info}>
          <Text style={[styles.count, { color: C.text }]}>
            <Text style={{ color: C.accent }}>{count}</Text> service{count === 1 ? '' : 's'} selected
          </Text>
          <Text style={[styles.total, { color: C.textMuted }]}>
            ₹{total.toLocaleString('en-IN')} · pay at salon
          </Text>
        </View>
        <Pressable onPress={onContinue} style={({ pressed }) => [styles.cta, { backgroundColor: C.accent }, pressed && { transform: [{ scale: 0.94 }] }]}>
          <Text style={[styles.ctaText, { color: C.onAccent }]}>Continue</Text>
          <Ionicons name="arrow-forward" size={16} color={C.onAccent} />
        </Pressable>
      </GlassView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 18, right: 18, bottom: 26 },
  glass: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 13, paddingLeft: 18 },
  info: { flex: 1 },
  count: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 },
  total: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16 },
  ctaText: { fontSize: 14.5, fontWeight: '800' },
});
```

## 6.9 `SegmentedControl.tsx` — sliding-pill tabs (Services/Reviews/Photos, Upcoming/Past, period picker)

```tsx
// mobile/src/components/ui/SegmentedControl.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';

export function SegmentedControl<T extends string>({ options, value, onChange, style }: {
  options: readonly T[]; value: T; onChange: (v: T) => void; style?: ViewStyle;
}) {
  const { C } = useTheme();
  const n = options.length;
  const idx = Math.max(0, options.indexOf(value));

  return (
    <View style={[styles.track, { backgroundColor: C.surface2 }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pill,
          { width: `${100 / n}%` },
          useAnimatedStyle(() => ({ transform: [{ translateX: `${idx * 100}%` }] })),
        ]}
      />
      {options.map((opt) => (
        <Pressable key={opt} onPress={() => onChange(opt)} style={styles.cell}>
          <Text style={[styles.label, { color: opt === value ? C.text : C.textMuted }, opt === value && { fontWeight: '700' }]}>
            {opt}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 15, padding: 5 },
  pill: { position: 'absolute', top: 5, bottom: 5, left: 5, borderRadius: 11, backgroundColor: '#fff' /* replaced at call site via theme — see note */ },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 14.5, fontWeight: '600' },
});
```

**Agent note:** the pill's white background must follow the theme — set `backgroundColor: C.surface` via a small `useAnimatedStyle` or pass it as a style prop; do not leave the literal `#fff`.

## 6.10 `Toggle.tsx` — iOS-style switch

```tsx
// mobile/src/components/ui/Toggle.tsx
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const { C } = useTheme();
  const pos = useSharedValue(on ? 1 : 0);
  React.useEffect(() => { pos.value = withSpring(on ? 1 : 0, { damping: 18, stiffness: 220 }); }, [on]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value * 19 }] }));
  return (
    <Pressable onPress={() => onChange(!on)} hitSlop={8}>
      <View style={[styles.track, { backgroundColor: on ? C.success : C.border }]}>
        <Animated.View style={[styles.knob, knob]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 50, height: 31, borderRadius: 999, padding: 2.5, justifyContent: 'center' },
  knob: { width: 26, height: 26, borderRadius: 999, backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
});
```

## 6.11 `StatusChip.tsx` — booking status

```tsx
// mobile/src/components/ui/StatusChip.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export type Status = 'confirmed' | 'pending' | 'completed' | 'cancelled';

export function StatusChip({ status }: { status: Status }) {
  const { C } = useTheme();
  const map = {
    confirmed: { label: 'Confirmed', fg: C.success, bg: C.successSoft },
    pending:   { label: 'Pending',   fg: C.warning, bg: C.warningSoft },
    completed: { label: 'Completed', fg: C.textMuted, bg: C.surface2 },
    cancelled: { label: 'Cancelled', fg: C.danger, bg: C.dangerSoft },
  } as const;
  const s = map[status];
  return (
    <View style={[styles.chip, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.3 },
});
```

---

# Chapter 7 — Customer Screens

All screens live under `mobile/src/screens/customer/`. Every screen: `SafeArea` top, `paddingBottom: layout.screenBottomInset` on the scroll view, horizontal gutter `layout.screenHPadding` (24). Replace the mockup data with your real hooks (TanStack Query) — the code below marks the seam with `// DATA:` comments.

## 7.1 `DiscoverScreen.tsx` — the Editorial home

Structure (top → bottom):

1. **Header row** — location eyebrow ("Koramangala, Bengaluru" with a gold pin), serif display "Discover", notification icon button.
2. **Search pill** (Editorial layout keeps the slim search bar).
3. **Hero card** — "The Bridal Edit" curated banner (vibe gold, editorial serif italic title, glass Explore chip). Rotate this content from a `featured` collection.
4. **Top rated near you** — `SectionHeader` + `Rail` of `SalonCard`s (snap scrolling).
5. **Browse by category** — `BentoCategories` 4-up.
6. **Salons near you** — `SectionHeader` + `SalonListItem` rows with hairlines + "Next" availability chips.

```tsx
// mobile/src/screens/customer/DiscoverScreen.tsx
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { SectionHeader } from '../../components/SectionHeader';
import { Rail } from '../../components/Rail';
import { SalonCard, type SalonCardData } from '../../components/salon/SalonCard';
import { BentoCategories } from '../../components/home/BentoCategories';
import { SalonListItem, type SalonRowData } from '../../components/salon/SalonListItem';
import { VibeArt } from '../../components/vibe/VibeArt';

export function DiscoverScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useType();

  // DATA: replace with useQuery hooks — topRated, nearby, featured
  const topRated: SalonCardData[] = MOCK_TOP_RATED;
  const nearby: SalonRowData[] = MOCK_NEARBY;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: layout.screenBottomInset }}>
        {/* 1. Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.locRow}>
              <Ionicons name="location-sharp" size={13} color={C.accent} />
              <Text style={[styles.locText, { color: C.textMuted }]}>Koramangala, Bengaluru</Text>
            </View>
            <Text style={t.display}>Discover</Text>
          </View>
          <Pressable style={[styles.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]} hitSlop={8}>
            <Ionicons name="notifications-outline" size={19} color={C.text} />
          </Pressable>
        </View>

        {/* 2. Search */}
        <Pressable style={[styles.search, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="search" size={19} color={C.textMuted} />
          <Text style={[styles.searchText, { color: C.textMuted }]}>Search salons, treatments, stylists…</Text>
        </Pressable>

        {/* 3. Hero — curated editorial banner */}
        <Pressable onPress={() => navigation.navigate('FeaturedCollection')}>
          <VibeArt vibe="gold" radius={26} style={styles.hero}>
            <View style={styles.heroOverlay}>
              <Text style={styles.heroKicker}>CURATED · BRIDAL SEASON '26</Text>
              <Text style={[t.displayItalic, styles.heroTitle]}>The Bridal Edit</Text>
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>Explore</Text>
                <Ionicons name="arrow-forward" size={13} color="#FFFDF9" />
              </View>
            </View>
          </VibeArt>
        </Pressable>

        {/* 4. Top rated */}
        <SectionHeader title="Top rated near you" actionLabel="See all" onAction={() => {}} />
        <Rail data={topRated} renderItem={(s) => <SalonCard salon={s} onPress={() => navigation.navigate('SalonProfile', { id: s.id })} />} />

        {/* 5. Categories */}
        <SectionHeader title="Browse by category" />
        <BentoCategories onPress={(key) => navigation.navigate('Category', { key })} />

        {/* 6. Nearby list */}
        <SectionHeader title="Salons near you" actionLabel="Map view" onAction={() => {}} />
        <View>
          {nearby.map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 ? <View style={[styles.hairline, { backgroundColor: C.border }]} /> : null}
              <SalonListItem salon={s} onPress={() => navigation.navigate('SalonProfile', { id: s.id })} />
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: layout.screenHPadding, paddingTop: 12, gap: 12 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  locText: { fontSize: 13, fontWeight: '700' },
  iconBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: layout.screenHPadding, marginTop: 18, marginBottom: 18, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 17, borderWidth: 1 },
  searchText: { fontSize: 16 },
  hero: { marginHorizontal: layout.screenHPadding, aspectRatio: 16 / 10.5 },
  heroOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 22 },
  heroKicker: { color: '#E8C9A8', fontSize: 12, fontWeight: '800', letterSpacing: 1.4, marginBottom: 6 },
  heroTitle: { color: '#F7F1E9', marginBottom: 12 },
  heroChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  heroChipText: { color: '#FFFDF9', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  hairline: { height: StyleSheet.hairlineWidth, marginHorizontal: layout.screenHPadding },
});

// DATA: mocks — delete when wired to API
const MOCK_TOP_RATED: SalonCardData[] = [
  { id: '1', name: 'Luxe Hair Studio', rating: 4.8, distanceKm: 1.2, fromPrice: 299, vibe: 'gold', badge: 'Top rated' },
  { id: '2', name: 'Glow Aesthetics', rating: 4.9, distanceKm: 2.8, fromPrice: 449, vibe: 'blush', badge: "Editor's pick" },
  { id: '3', name: 'Verdure Spa & Salon', rating: 4.7, distanceKm: 3.1, fromPrice: 599, vibe: 'spa', badge: 'New' },
];
const MOCK_NEARBY: SalonRowData[] = [
  { id: '1', name: 'Luxe Hair Studio', rating: 4.8, bookingsCount: '1.2k', nextSlot: '4:30 PM', fromPrice: 399, vibe: 'gold' },
  { id: '2', name: 'Glow Aesthetics', rating: 4.9, bookingsCount: '2.4k', nextSlot: '5:00 PM', fromPrice: 449, vibe: 'blush' },
  { id: '3', name: 'The Barber Shop', rating: 4.6, bookingsCount: '860', nextSlot: '3:00 PM', fromPrice: 199, vibe: 'slate' },
];
```

**Search behavior:** keep the pill in Editorial. On focus, navigate to a dedicated `SearchScreen` (modal) with recents + popular chips — do not filter inline.

## 7.2 `SalonProfileScreen.tsx` — hero, tabs, multi-select services

Key pieces: photo/vibe hero with glass fabs, verified title row, trust chips, `SegmentedControl` (Services / Reviews / Photos), collapsible service groups, `ServiceRow` + `AddButton` multi-select, and the glass `SummaryBar` that slides up when `selected.size > 0`.

```tsx
// mobile/src/screens/customer/SalonProfileScreen.tsx
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { ServiceRow, type Service } from '../../components/services/ServiceRow';
import { SummaryBar } from '../../components/services/SummaryBar';
import { VibeArt } from '../../components/vibe/VibeArt';
import { GlassView } from '../../components/glass/GlassView';

const GROUPS = [
  { key: 'hair', title: 'Hair', from: 299, services: [...] as Service[] },
  { key: 'skin', title: 'Skin & Facials', from: 899, services: [] as Service[] },
  { key: 'nails', title: 'Nails', from: 499, services: [] as Service[] },
];

export function SalonProfileScreen({ navigation, route }: any) {
  const { C } = useTheme();
  const t = useType();
  const [tab, setTab] = useState<'Services' | 'Reviews' | 'Photos'>('Services');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ skin: true, nails: true });
  const [selected, setSelected] = useState<Map<string, Service>>(new Map([['colour', { id: 'colour', name: 'Hair Colouring', minutes: 90, price: 1299, mrp: 1799, popular: true }]]));

  const total = useMemo(() => [...selected.values()].reduce((s, x) => s + x.price, 0), [selected]);

  const toggle = (s: Service) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.has(s.id) ? next.delete(s.id) : next.set(s.id, s);
      return next;
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: layout.screenBottomInset + 20 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <VibeArt vibe="gold" photoUrl={undefined /* DATA: salon.coverUrl */} radius={0} style={styles.hero}>
          <View style={styles.scrim} />
          <View style={styles.fabs}>
            <GlassView radius={21} intensity={50} style={styles.fab}>
              <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
                <Ionicons name="arrow-back" size={19} color="#FFFDF9" />
              </Pressable>
            </GlassView>
            <GlassView radius={21} intensity={50} style={styles.fab}>
              <Pressable hitSlop={12}>
                <Ionicons name="heart-outline" size={19} color="#FFFDF9" />
              </Pressable>
            </GlassView>
          </View>
        </VibeArt>

        {/* Title + meta */}
        <View style={{ paddingHorizontal: layout.screenHPadding, paddingTop: 16 }}>
          <View style={styles.nameRow}>
            <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 30, color: C.text, letterSpacing: -0.4 }}>Luxe Hair Studio</Text>
            <Ionicons name="sparkles" size={17} color={C.accent} />
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={13} color={C.goldStar} />
            <Text style={[styles.meta, { color: C.text }]}>4.8 (1.2k)</Text>
            <Text style={[styles.meta, { color: C.textMuted }]}>· 1.2 km ·</Text>
            <View style={styles.openRow}>
              <View style={[styles.openDot, { backgroundColor: C.success }]} />
              <Text style={[styles.meta, { color: C.success, fontWeight: '800' }]}>Open till 8 PM</Text>
            </View>
          </View>
          <View style={styles.trustRow}>
            <TrustChip label="Pay at salon" />
            <TrustChip label="Free cancellation" />
          </View>
        </View>

        {/* Tabs */}
        <SegmentedControl options={['Services', 'Reviews', 'Photos'] as const} value={tab} onChange={setTab} style={{ marginHorizontal: layout.screenHPadding, marginTop: 18 }} />

        {tab === 'Services' ? (
          GROUPS.map((g) => (
            <View key={g.key} style={{ paddingHorizontal: layout.screenHPadding }}>
              <Pressable onPress={() => setCollapsed((p) => ({ ...p, [g.key]: !p[g.key] }))} style={styles.groupHeader}>
                <Text style={[styles.groupTitle, { color: C.text }]}>
                  {g.title} <Text style={{ color: C.textMuted, fontWeight: '600', fontSize: 13.5 }}>· from ₹{g.from}</Text>
                </Text>
                <Ionicons name="chevron-down" size={17} color={C.textMuted} style={collapsed[g.key] ? { transform: [{ rotate: -90 }] } : undefined} />
              </Pressable>
              {!collapsed[g.key] ? g.services.map((s) => (
                <ServiceRow key={s.id} service={s} selected={selected.has(s.id)} onToggle={() => toggle(s)} />
              )) : null}
            </View>
          ))
        ) : (
          <Text style={[styles.meta, { color: C.textMuted, padding: 24 }]}>Reviews and photos render here — same surface styles.</Text>
        )}
      </ScrollView>

      {/* Glass summary bar — slides up on selection */}
      <SummaryBar
        count={selected.size}
        total={total}
        visible={selected.size > 0}
        onContinue={() => navigation.navigate('TimeSelect', { salonId: route.params.id, services: [...selected.values()] })}
      />
    </SafeAreaView>
  );
}

function TrustChip({ label }: { label: string }) {
  const { C } = useTheme();
  return (
    <View style={[styles.trust, { backgroundColor: C.accentSoft }]}>
      <Ionicons name="checkmark" size={13} color={C.accent} />
      <Text style={[styles.trustText, { color: C.accent }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 260 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,6,3,0.18)' },
  fabs: { position: 'absolute', top: 16, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between' },
  fab: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6, flexWrap: 'wrap' },
  meta: { fontSize: 14, fontWeight: '600' },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  openDot: { width: 7, height: 7, borderRadius: 4 },
  trustRow: { flexDirection: 'row', gap: 9, marginTop: 12 },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 },
  trustText: { fontSize: 12.5, fontWeight: '800' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13 },
  groupTitle: { fontSize: 16.5, fontWeight: '800', letterSpacing: -0.2 },
});
```

**Multi-select state:** a `Map<id, Service>` in local state (or a small Zustand slice `bookingCart` if you want it to survive navigation). The `SummaryBar` computes count + total from it.

## 7.3 `TimeSelectScreen.tsx` — day strip, slots, hold timer

```tsx
// mobile/src/screens/customer/TimeSelectScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { GlassView } from '../../components/glass/GlassView';
import { VibeArt } from '../../components/vibe/VibeArt';

const HOLD_SECONDS = 582; // 9:42

export function TimeSelectScreen({ navigation, route }: any) {
  const { C } = useTheme();
  const t = useType();
  const [dayIdx, setDayIdx] = useState(1);
  const [slot, setSlot] = useState<string | null>('1:00 PM');
  const [left, setLeft] = useState(HOLD_SECONDS);

  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s <= 0 ? HOLD_SECONDS : s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const urgency = left <= 60 ? 'crit' : left <= 120 ? 'warn' : 'ok';
  const time = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const pct = Math.max(0.02, left / HOLD_SECONDS);

  // DATA: slotsByDay from API; each slot { time, available }
  const periods = MOCK_PERIODS;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 220 }}>
        {/* Header + step dots */}
        <View style={styles.header}>
          <Pressable style={[styles.back, { backgroundColor: C.surface, borderColor: C.border }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={19} color={C.text} />
          </Pressable>
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 26, color: C.text }}>Select time</Text>
          <View style={styles.dots}>
            <View style={[styles.dot, { backgroundColor: C.border }]} />
            <View style={[styles.dot, { backgroundColor: C.border }]} />
            <View style={[styles.dot, { backgroundColor: C.accent, width: 38 }]} />
          </View>
        </View>

        {/* Booking mini-card */}
        <View style={[styles.mini, { backgroundColor: C.surface, borderColor: C.border }]}>
          <VibeArt vibe="gold" radius={10} style={styles.miniThumb}><Text style={styles.miniLetter}>L</Text></VibeArt>
          <View style={{ flex: 1 }}>
            <Text style={[styles.miniName, { color: C.text }]}>Luxe Hair Studio</Text>
            <Text style={[styles.miniMeta, { color: C.textMuted }]}>1 service · 90 min</Text>
          </View>
          <Text style={[styles.miniPrice, { color: C.text }]}>₹1,299</Text>
        </View>

        {/* Day strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.days} contentContainerStyle={{ paddingHorizontal: layout.screenHPadding, gap: 9 }}>
          {MOCK_DAYS.map((d, i) => (
            <Pressable key={d.label} onPress={() => setDayIdx(i)}
              style={[styles.day, { backgroundColor: C.surface, borderColor: i === dayIdx ? C.accent : C.border }, i === dayIdx && { backgroundColor: C.accent }]}>
              <Text style={[styles.dayW, { color: i === dayIdx ? 'rgba(255,255,255,0.75)' : C.textMuted }]}>{d.w}</Text>
              <Text style={[styles.dayN, { color: i === dayIdx ? '#FFFFFF' : C.text }]}>{d.n}</Text>
              <View style={styles.dayDots}>
                {d.availability.map((a, j) => (
                  <View key={j} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: i === dayIdx ? '#FFFFFF' : a ? C.success : C.border }} />
                ))}
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Slots by period */}
        {periods.map((p) => (
          <View key={p.label} style={{ paddingHorizontal: layout.screenHPadding, marginTop: 14 }}>
            <Text style={[t.overline, { marginBottom: 10 }]}>{p.label}</Text>
            <View style={styles.slotGrid}>
              {p.slots.map((s) => {
                const sel = slot === s.time;
                return (
                  <Pressable key={s.time} disabled={!s.available} onPress={() => setSlot(s.time)}
                    style={[styles.slot, { backgroundColor: C.surface, borderColor: C.border, opacity: s.available ? 1 : 0.3 }, sel && { backgroundColor: C.accent, borderColor: C.accent, transform: [{ scale: 1.05 }] }]}>
                    {sel ? (
                      <View style={[styles.check, { backgroundColor: C.accent }]}>
                        <Ionicons name="checkmark" size={12} color={C.onAccent} />
                      </View>
                    ) : null}
                    <Text style={[styles.slotTime, { color: sel ? C.onAccent : C.text }]}>{s.time}</Text>
                    <Text style={[styles.slotAp, { color: sel ? 'rgba(255,255,255,0.7)' : C.textMuted }]}>{s.ap}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Glass confirm zone */}
      <GlassView radius={24} float intensity={65} style={styles.confirm}>
        <View style={styles.confirmTop}>
          <View style={[styles.pickChip, { backgroundColor: C.accentSoft }]}>
            <Ionicons name="calendar-outline" size={13} color={C.accent} />
            <Text style={[styles.pickText, { color: C.accent }]}>Tue, Sep 3 · {slot ?? '—'}</Text>
          </View>
          <View style={[styles.timerChip, { backgroundColor: urgency === 'ok' ? C.successSoft : urgency === 'warn' ? C.warningSoft : C.dangerSoft }]}>
            <Ionicons name="time-outline" size={14} color={urgency === 'ok' ? C.success : urgency === 'warn' ? C.warning : C.danger} />
            <Text style={[styles.timerText, { color: urgency === 'ok' ? C.success : urgency === 'warn' ? C.warning : C.danger }]}>{time}</Text>
          </View>
        </View>
        <View style={[styles.track, { backgroundColor: C.surface2 }]}>
          <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: urgency === 'ok' ? C.success : urgency === 'warn' ? C.warning : C.danger }]} />
        </View>
        <Pressable style={[styles.cta, { backgroundColor: C.accent }]}>
          <Text style={[styles.ctaText, { color: C.onAccent }]}>Confirm booking · ₹1,299</Text>
          <Ionicons name="arrow-forward" size={17} color={C.onAccent} />
        </Pressable>
      </GlassView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: layout.screenHPadding, paddingTop: 12 },
  back: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dots: { marginLeft: 'auto', flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 26, height: 4, borderRadius: 2 },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: layout.screenHPadding, marginTop: 14, padding: 14, borderRadius: 16, borderWidth: 1 },
  miniThumb: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  miniLetter: { color: 'rgba(255,253,247,0.9)', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 17 },
  miniName: { fontSize: 14.5, fontWeight: '800' },
  miniMeta: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  miniPrice: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  days: { marginTop: 16 },
  day: { width: 64, paddingVertical: 12, borderRadius: 16, borderWidth: 1.5, alignItems: 'center' },
  dayW: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  dayN: { fontSize: 19, fontWeight: '800', marginTop: 3, letterSpacing: -0.3 },
  dayDots: { flexDirection: 'row', gap: 4, marginTop: 4 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { width: '31%', flexGrow: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 15, borderWidth: 1.5 },
  slotTime: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  slotAp: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 },
  check: { position: 'absolute', top: -8, right: -8, width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  confirm: { position: 'absolute', left: 18, right: 18, bottom: 22, padding: 16 },
  confirmTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  pickChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  pickText: { fontSize: 13, fontWeight: '800' },
  timerChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  timerText: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 13 },
  fill: { height: '100%', borderRadius: 3 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16, borderRadius: 18 },
  ctaText: { fontSize: 16.5, fontWeight: '800' },
});

// DATA: mocks
const MOCK_DAYS = [
  { label: 'd0', w: 'Mon', n: 2, availability: [true, true, true] },
  { label: 'd1', w: 'Tue', n: 3, availability: [true, true, true] },
  { label: 'd2', w: 'Wed', n: 4, availability: [true, false, true] },
  { label: 'd3', w: 'Thu', n: 5, availability: [true, true, true] },
  { label: 'd4', w: 'Fri', n: 6, availability: [true, true, true] },
  { label: 'd5', w: 'Sat', n: 7, availability: [true, false, true] },
  { label: 'd6', w: 'Sun', n: 8, availability: [false, false, false] },
];
const MOCK_PERIODS = [
  { label: 'Morning', slots: [ { time: '9:00', ap: 'AM', available: false }, { time: '9:30', ap: 'AM', available: true }, { time: '10:00', ap: 'AM', available: true }, { time: '10:30', ap: 'AM', available: true }, { time: '11:00', ap: 'AM', available: true }, { time: '11:30', ap: 'AM', available: false } ] },
  { label: 'Afternoon', slots: [ { time: '12:00', ap: 'PM', available: true }, { time: '12:30', ap: 'PM', available: true }, { time: '1:00', ap: 'PM', available: true }, { time: '1:30', ap: 'PM', available: false }, { time: '2:00', ap: 'PM', available: true }, { time: '2:30', ap: 'PM', available: true } ] },
  { label: 'Evening', slots: [ { time: '5:00', ap: 'PM', available: true }, { time: '5:30', ap: 'PM', available: true }, { time: '6:00', ap: 'PM', available: true }, { time: '6:30', ap: 'PM', available: true } ] },
];
```

**Hold semantics:** the timer starts when the user lands here (i.e., a hold was created server-side). On expiry, re-fetch slots and clear the selection. Colors: `>2 min` green, `≤2 min` amber, `≤1 min` red — the chip and progress bar switch together.

## 7.4 `CheckoutScreen.tsx` — summary, payment methods, UPI sheet

```tsx
// mobile/src/screens/customer/CheckoutScreen.tsx
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { VibeArt } from '../../components/vibe/VibeArt';

type PayMethod = 'salon' | 'upi' | 'card';

export function CheckoutScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useType();
  const [method, setMethod] = useState<PayMethod>('salon');
  const [upiSheet, setUpiSheet] = useState(false);
  const sheetY = useSharedValue(400);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));

  const openSheet = () => { setUpiSheet(true); sheetY.value = withTiming(0, { duration: 350 }); };
  const closeSheet = () => { sheetY.value = withTiming(400, { duration: 250 }, () => { runOnJS(setUpiSheet)(false); }); };

  // DATA: totals from cart store
  const subtotal = 1299, discount = 250, gst = 188.82, total = subtotal - discount + gst;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: layout.screenBottomInset }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={[styles.back, { backgroundColor: C.surface, borderColor: C.border }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={19} color={C.text} />
          </Pressable>
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 26, color: C.text }}>Checkout</Text>
        </View>

        {/* Booking summary */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>Booking summary</Text>
          <View style={styles.salonRow}>
            <VibeArt vibe="gold" radius={10} style={styles.salonThumb}><Text style={styles.thumbLetter}>L</Text></VibeArt>
            <View>
              <Text style={[styles.salonName, { color: C.text }]}>Luxe Hair Studio</Text>
              <Text style={[styles.salonMeta, { color: C.textMuted }]}>Koramangala · 1.2 km</Text>
            </View>
          </View>
          <PriceRow k="Hair Colouring" v="₹1,299" border />
          <PriceRow k="Subtotal" v={`₹${subtotal.toLocaleString('en-IN')}`} muted border />
          <PriceRow k="TRIMIT50 discount" v={`-₹${discount}`} ok border />
          <PriceRow k="GST (18%)" v={`₹${gst.toFixed(2)}`} muted border />
          <View style={[styles.totalRow, { borderTopColor: C.border }]}>
            <Text style={[styles.totalK, { color: C.textMuted }]}>Total</Text>
            <Text style={[styles.totalV, { color: C.text }]}>₹{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment methods */}
        <Text style={[t.overline, { paddingHorizontal: layout.screenHPadding, marginTop: 18, marginBottom: 8 }]}>PAYMENT METHOD</Text>
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, padding: 0, overflow: 'hidden' }]}>
          <PayOption radio title="Pay at salon" sub="No advance payment needed" selected={method === 'salon'} onPress={() => setMethod('salon')} />
          <PayOption radio title="UPI" sub="GPay, PhonePe, Paytm" selected={method === 'upi'} onPress={() => { setMethod('upi'); openSheet(); }} border />
          <PayOption radio title="Card" sub="Credit or debit card" selected={method === 'card'} onPress={() => setMethod('card')} border />
        </View>

        <View style={styles.trust}>
          <TrustChip label="Free cancellation" />
          <TrustChip label="Secure payment" />
        </View>
      </ScrollView>

      {/* UPI bottom sheet (glass over scrim) */}
      <Modal transparent visible={upiSheet} animationType="none" onRequestClose={closeSheet}>
        <View style={{ flex: 1, backgroundColor: C.overlayScrim, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={closeSheet} />
          <Animated.View style={[sheetStyle, { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34 }]}>
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: C.text }]}>Pay with UPI</Text>
              <Pressable onPress={closeSheet} hitSlop={10}><Ionicons name="close" size={20} color={C.textMuted} /></Pressable>
            </View>
            <View style={styles.upiGrid}>
              {[['G', 'Google Pay', '#4285F4'], ['P', 'PhonePe', '#5B5FC7'], ['₹', 'Paytm', '#09C269']].map(([letter, name, color]) => (
                <Pressable key={name} style={[styles.upiTile, { borderColor: C.border }]}>
                  <View style={[styles.upiIcon, { backgroundColor: C.surface2 }]}><Text style={{ color, fontSize: 18, fontWeight: '800' }}>{letter}</Text></View>
                  <Text style={[styles.upiName, { color: C.text }]}>{name}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PriceRow({ k, v, muted, ok, border }: { k: string; v: string; muted?: boolean; ok?: boolean; border?: boolean }) {
  const { C } = useTheme();
  return (
    <View style={[styles.priceRow, border ? { borderTopWidth: 1, borderTopColor: C.border } : null]}>
      <Text style={[styles.priceK, { color: ok ? C.success : C.textMuted }]}>{k}</Text>
      <Text style={[styles.priceV, { color: ok ? C.success : C.text }]}>{v}</Text>
    </View>
  );
}

function PayOption({ radio, title, sub, selected, onPress, border }: any) {
  const { C } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.payRow, border ? { borderTopWidth: 1, borderTopColor: C.border } : null]}>
      <View style={[styles.radioOuter, { borderColor: selected ? C.accent : C.border }]}>
        {selected ? <View style={[styles.radioInner, { backgroundColor: C.accent }]} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.payTitle, { color: C.text }]}>{title}</Text>
        <Text style={[styles.paySub, { color: C.textMuted }]}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function TrustChip({ label }: { label: string }) {
  const { C } = useTheme();
  return (
    <View style={[styles.trust, { backgroundColor: C.accentSoft }]}>
      <Ionicons name="checkmark" size={13} color={C.accent} />
      <Text style={[styles.trustText, { color: C.accent }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: layout.screenHPadding, paddingTop: 12 },
  back: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { marginHorizontal: layout.screenHPadding, marginTop: 14, padding: 16, borderRadius: 20, borderWidth: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  salonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  salonThumb: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  thumbLetter: { color: 'rgba(255,253,247,0.9)', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 16 },
  salonName: { fontSize: 14, fontWeight: '700' },
  salonMeta: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  priceK: { fontSize: 13.5, fontWeight: '600' },
  priceV: { fontSize: 13.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1.5, marginTop: 4, paddingTop: 12 },
  totalK: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  totalV: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 15 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  payTitle: { fontSize: 15, fontWeight: '700' },
  paySub: { fontSize: 12.5, fontWeight: '500', marginTop: 1 },
  trust: { flexDirection: 'row', gap: 9, paddingHorizontal: layout.screenHPadding, marginTop: 16 },
  trustChipX: {},
  trust: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, alignSelf: 'flex-start' },
  trustText: { fontSize: 12.5, fontWeight: '800', color: '#000' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '800' },
  upiGrid: { flexDirection: 'row', gap: 12 },
  upiTile: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  upiIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  upiName: { fontSize: 12.5, fontWeight: '700' },
});
```

**Agent cleanup note:** `TrustChip` styles above were inlined twice for brevity — extract to the shared chip used in SalonProfile. Remove duplicate keys when integrating.

## 7.5 `BookingSuccessScreen.tsx` — ring ceremony + ticket

```tsx
// mobile/src/screens/customer/BookingSuccessScreen.tsx
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { VibeArt } from '../../components/vibe/VibeArt';

const R = 60;
const CIRC = 2 * Math.PI * R; // ≈ 377

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function BookingSuccessScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useType();
  const dash = useSharedValue(CIRC);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    dash.value = withTiming(0, { duration: 1400 });
    checkScale.value = withDelay(950, withSpring(1, { damping: 12, stiffness: 180 }));
  }, []);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: dash.value }));
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={styles.hero}>
          <View style={{ width: 126, height: 126 }}>
            <Svg width={126} height={126} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={63} cy={63} r={R} stroke={C.surface2} strokeWidth={5} fill="none" />
              <AnimatedCircle cx={63} cy={63} r={R} stroke={C.accent} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={CIRC} animatedProps={ringProps} />
            </Svg>
            <View style={styles.checkWrap}>
              <Animated.View style={[styles.check, { backgroundColor: C.accent }, checkStyle]}>
                <Ionicons name="checkmark" size={27} color={C.onAccent} />
              </Animated.View>
            </View>
          </View>
          <Text style={[t.displayItalic, { fontSize: 34, color: C.text, marginTop: 18 }]}>You're booked!</Text>
          <Text style={[styles.sub, { color: C.textMuted }]}>Confirmation sent to +91 98••• ••210</Text>
        </View>

        {/* Ticket */}
        <View style={[styles.ticket, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.ticketHead, { borderBottomColor: C.border }]}>
            <VibeArt vibe="gold" radius={13} style={styles.ticketThumb}><Text style={styles.thumbLetter}>L</Text></VibeArt>
            <View style={{ flex: 1 }}>
              <Text style={[styles.ticketName, { color: C.text }]}>Luxe Hair Studio</Text>
              <Text style={[styles.ticketMeta, { color: C.textMuted }]}>Koramangala · 1.2 km</Text>
            </View>
            <View style={styles.verified}>
              <Ionicons name="sparkles" size={12} color={C.success} />
              <Text style={[styles.verifiedText, { color: C.success }]}>Verified</Text>
            </View>
          </View>
          <TicketRow k="Service" v="Hair Colouring" />
          <TicketRow k="When" v="Tue, Sep 3 · 1:00 PM" border />
          <TicketRow k="Duration" v="90 min" border />
          <View style={[styles.totalBand, { backgroundColor: C.accentSoft, borderTopColor: C.border }]}>
            <Text style={[styles.totalK, { color: C.textMuted }]}>TOTAL · PAY AT SALON</Text>
            <Text style={[styles.totalV, { color: C.accent }]}>₹1,237.82</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.primary, { backgroundColor: C.accent }]}>
            <Ionicons name="calendar-outline" size={17} color={C.onAccent} />
            <Text style={[styles.primaryText, { color: C.onAccent }]}>Add to calendar</Text>
          </Pressable>
          <Pressable style={[styles.ghost, { borderColor: C.border, backgroundColor: C.surface }]}>
            <Ionicons name="navigate-outline" size={17} color={C.text} />
            <Text style={[styles.ghostText, { color: C.text }]}>Directions</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TicketRow({ k, v, border }: { k: string; v: string; border?: boolean }) {
  const { C } = useTheme();
  return (
    <View style={[styles.row, border ? { borderTopWidth: 1, borderTopColor: C.border } : null]}>
      <Text style={[styles.k, { color: C.textMuted }]}>{k}</Text>
      <Text style={[styles.v, { color: C.text }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 38, paddingHorizontal: 24 },
  checkWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  check: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  sub: { fontSize: 14.5, fontWeight: '600', marginTop: 7, textAlign: 'center' },
  ticket: { marginHorizontal: 24, marginTop: 22, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  ticketHead: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderBottomWidth: 1.5, borderStyle: 'dashed' },
  ticketThumb: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  thumbLetter: { color: 'rgba(255,253,247,0.9)', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 18 },
  ticketName: { fontSize: 16.5, fontWeight: '800' },
  ticketMeta: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 11.5, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 18 },
  k: { fontSize: 14.5, fontWeight: '600' },
  v: { fontSize: 14.5, fontWeight: '700', textAlign: 'right' },
  totalBand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1.5 },
  totalK: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  totalV: { fontSize: 21, fontWeight: '800', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 11, marginHorizontal: 24, marginTop: 18 },
  primary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 17 },
  primaryText: { fontSize: 14.5, fontWeight: '800' },
  ghost: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 17, borderWidth: 1.5 },
  ghostText: { fontSize: 14.5, fontWeight: '700' },
});
```

## 7.6 `MyBookingsScreen.tsx` — upcoming / past

```tsx
// mobile/src/screens/customer/MyBookingsScreen.tsx
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { StatusChip } from '../../components/ui/StatusChip';
import { VibeArt } from '../../components/vibe/VibeArt';

export function MyBookingsScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useType();
  const [tab, setTab] = useState<'Upcoming' | 'Past'>('Upcoming');

  // DATA: useQuery(['bookings']) split by status
  const upcoming = MOCK_UPCOMING;
  const past = MOCK_PAST;
  const list = tab === 'Upcoming' ? upcoming : past;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: layout.screenBottomInset }}>
        <View style={{ paddingHorizontal: layout.screenHPadding, paddingTop: 12 }}>
          <Text style={t.display}>My Bookings</Text>
          <Text style={[t.sub, { marginTop: 4 }]}>Your appointments, all in one place</Text>
        </View>
        <SegmentedControl options={['Upcoming', 'Past'] as const} value={tab} onChange={setTab} style={{ marginHorizontal: layout.screenHPadding, marginTop: 14 }} />
        <View style={{ marginTop: 16, gap: 12 }}>
          {list.map((b) => <BookingCard key={b.id} booking={b} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BookingCard({ booking: b }: any) {
  const { C } = useTheme();
  const past = b.status === 'completed' || b.status === 'cancelled';
  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }, past && { opacity: b.status === 'cancelled' ? 0.5 : 0.85 }]}>
      <VibeArt vibe={b.vibe} radius={0} style={styles.thumb} />
      <View style={styles.body}>
        <Text style={[styles.name, { color: C.text }]}>{b.salon}</Text>
        <Text style={[styles.service, { color: C.textMuted }]}>{b.service}</Text>
        <Text style={[styles.date, { color: C.text }]}>{b.when}</Text>
        <View style={styles.statusRow}>
          <StatusChip status={b.status} />
          <Text style={[styles.price, { color: C.textMuted }]}>· ₹{b.price} · {b.pay}</Text>
        </View>
        <View style={styles.actions}>
          {past && b.status === 'completed' ? (
            <>
              <MiniButton primary label="Rebook" />
              <MiniButton label="★ Rate" />
            </>
          ) : !past ? (
            <>
              <MiniButton label="Reschedule" />
              <MiniButton label="Cancel" />
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function MiniButton({ label, primary }: { label: string; primary?: boolean }) {
  const { C } = useTheme();
  return (
    <Pressable style={[styles.miniBtn, primary ? { backgroundColor: C.accent } : { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface }]}>
      <Text style={{ fontSize: 12.5, fontWeight: '800', color: primary ? C.onAccent : C.text }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: layout.screenHPadding, borderRadius: 20, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  thumb: { width: 88 },
  body: { flex: 1, padding: 14, gap: 3 },
  name: { fontSize: 16.5, fontWeight: '700', letterSpacing: -0.2 },
  service: { fontSize: 13.5, fontWeight: '500' },
  date: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginTop: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  price: { fontSize: 12.5, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  miniBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
});

// DATA: mocks
const MOCK_UPCOMING = [
  { id: '1', salon: 'Luxe Hair Studio', service: 'Hair Colouring · 90 min', when: 'Tue, Sep 3 · 1:00 PM', status: 'confirmed', price: '1,237.82', pay: 'pay at salon', vibe: 'gold' },
  { id: '2', salon: 'Glow Aesthetics', service: 'Hydra Facial · 60 min', when: 'Fri, Sep 5 · 11:00 AM', status: 'confirmed', price: '899', pay: 'UPI paid', vibe: 'blush' },
];
const MOCK_PAST = [
  { id: '3', salon: 'The Barber Shop', service: 'Beard Trim · 20 min', when: 'Mon, Aug 28 · 6:00 PM', status: 'completed', price: '199', pay: 'Cash', vibe: 'slate' },
  { id: '4', salon: 'Verdure Spa', service: 'Deep Tissue Massage', when: 'Fri, Aug 25', status: 'cancelled', price: '1,299', pay: 'refunded', vibe: 'spa' },
];
```

## 7.7 `ProfileScreen.tsx` — iOS-style grouped settings

```tsx
// mobile/src/screens/customer/ProfileScreen.tsx
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { Toggle } from '../../components/ui/Toggle';
import { GlassView } from '../../components/glass/GlassView';

export function ProfileScreen({ navigation }: any) {
  const { C, mode, setMode } = useTheme();
  const t = useType();
  const [notif, setNotif] = React.useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: layout.screenBottomInset }}>
        {/* Identity */}
        <View style={styles.identity}>
          <View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View>
          <Text style={[styles.name, { color: C.text }]}>Arqum Malik</Text>
          <Text style={[t.sub]}>+91 98••• ••210</Text>
          <Pressable style={[styles.edit, { borderColor: C.border }]}><Text style={[styles.editText, { color: C.text }]}>Edit</Text></Pressable>
        </View>

        <Group header="OFFERS">
          <Row icon="pricetag-outline" title="My offers & coupons" sub="TRIMIT50 · 3 available" chevron />
        </Group>
        <Group header="PREFERENCES">
          <Row icon="compass-outline" title="Discovery settings" sub="Radius 5 km" chevron />
          <Row icon="notifications-outline" title="Notifications" border
               right={<Toggle on={notif} onChange={setNotif} />} />
          <Row icon="contrast-outline" title="Appearance" sub={mode === 'dark' ? 'Dark' : 'Light'} border
               right={<View style={{ flexDirection: 'row', gap: 8 }}>
                 <MiniMode label="Light" active={mode === 'light'} onPress={() => setMode('light')} />
                 <MiniMode label="Dark" active={mode === 'dark'} onPress={() => setMode('dark')} />
               </View>} />
        </Group>
        <Group header="FOR SALON TEAMS">
          <Row icon="storefront-outline" title="List or manage my salon" sub="Create an owner workspace" chevron onPress={() => navigation.navigate('OwnerTabs')} />
          <Row icon="people-outline" title="Employee access" sub="Join with an invitation" chevron border />
        </Group>
        <Group header="LEGAL & SUPPORT">
          <Row title="Payments help" chevron />
          <Row title="Privacy policy" chevron border />
          <Row title="Terms of service" chevron border />
          <Row title="Contact us" chevron border />
        </Group>
        <Group>
          <Row title="Sign out" danger />
        </Group>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ header, children }: { header?: string; children: React.ReactNode }) {
  const { C } = useTheme();
  return (
    <View style={{ paddingHorizontal: layout.screenHPadding, marginTop: 20 }}>
      {header ? <Text style={[styles.groupHeader, { color: C.textMuted }]}>{header}</Text> : null}
      <View style={[styles.group, { backgroundColor: C.surface, borderColor: C.border }]}>{children}</View>
    </View>
  );
}

function Row({ icon, title, sub, chevron, right, danger, border, onPress }: any) {
  const { C } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, border ? { borderTopWidth: 1, borderTopColor: C.border } : null]}>
      {icon ? (
        <View style={[styles.iconChip, { backgroundColor: C.surface2 }]}><Ionicons name={icon} size={17} color={C.accent} /></View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: danger ? C.danger : C.text }]}>{title}</Text>
        {sub ? <Text style={[styles.rowSub, { color: C.textMuted }]}>{sub}</Text> : null}
      </View>
      {right ?? (chevron ? <Ionicons name="chevron-forward" size={16} color={C.textMuted} /> : null)}
    </Pressable>
  );
}

function MiniMode({ label, active, onPress }: any) {
  const { C } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.miniMode, { backgroundColor: active ? C.accent : C.surface2 }]}>
      <Text style={{ fontSize: 11.5, fontWeight: '800', color: active ? C.onAccent : C.textMuted }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', paddingTop: 24, paddingBottom: 6 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#17130E', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { color: '#E3C77F', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 30 },
  name: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  edit: { marginTop: 9, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5 },
  editText: { fontSize: 12.5, fontWeight: '700' },
  groupHeader: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 6 },
  group: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 18 },
  iconChip: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16.5, fontWeight: '600', letterSpacing: -0.2 },
  rowSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  miniMode: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
});
```

---

# Chapter 8 — Owner Screens

Same design system, same components — data and layouts change. All files under `mobile/src/screens/owner/`.

## 8.1 `DashboardScreen.tsx`

```tsx
// mobile/src/screens/owner/DashboardScreen.tsx
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { StatusChip } from '../../components/ui/StatusChip';

const TREND = [38, 52, 44, 66, 58, 74, 90]; // % heights, Mon→Sun

export function DashboardScreen({ navigation }: any) {
  const { C } = useTheme();
  const t = useType();
  const [period, setPeriod] = useState<'Today' | '7d' | '30d' | 'All'>('Today');
  const [pending, setPending] = useState<'pending' | 'accepted' | 'declined'>('pending');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: layout.screenBottomInset }}>
        {/* Greeting */}
        <View style={{ paddingHorizontal: layout.screenHPadding, paddingTop: 14 }}>
          <Text style={[styles.greeting, { color: C.text }]}>Good morning, Arqum</Text>
          <View style={styles.salonRow}>
            <Text style={[t.sub]}>Luxe Hair Studio ·</Text>
            <View style={[styles.openDot, { backgroundColor: C.success }]} />
            <Text style={[styles.open, { color: C.success }]}>Open</Text>
          </View>
        </View>

        {/* Trial banner */}
        <View style={[styles.trial, { backgroundColor: C.accentSoft }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={C.accent} />
          <Text style={[styles.trialText, { color: C.text }]}>Free trial · 12 days left</Text>
          <Pressable><Text style={[styles.trialCta, { color: C.accent }]}>Subscribe ₹499/mo →</Text></Pressable>
        </View>

        {/* Period */}
        <SegmentedControl options={['Today', '7d', '30d', 'All'] as const} value={period} onChange={setPeriod}
          style={{ marginHorizontal: layout.screenHPadding, marginTop: 16 }} />

        {/* KPI grid */}
        <View style={styles.kpiGrid}>
          <KPI label="EARNINGS" value="₹4,250" accent />
          <KPI label="BOOKINGS" value="18" />
          <KPI label="TODAY'S" value="6" />
          <KPI label="PENDING" value="3" danger />
        </View>

        {/* Needs action */}
        <Text style={[t.sectionSerif, { paddingHorizontal: layout.screenHPadding, marginTop: 26, marginBottom: 12 }]}>Needs action</Text>
        <View style={[styles.pendingCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.pendingHead}>
            <View style={[styles.avatar, { backgroundColor: '#8A6A38' }]}><Text style={styles.avatarText}>P</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pName, { color: C.text }]}>Priya Sharma</Text>
              <Text style={[styles.pMeta, { color: C.textMuted }]}>Haircut + Colour · Today 4:30 PM</Text>
            </View>
            <Text style={[styles.pPrice, { color: C.text }]}>₹1,798</Text>
          </View>
          <View style={styles.pendingActions}>
            <StatusChip status={pending === 'accepted' ? 'confirmed' : pending === 'declined' ? 'cancelled' : 'pending'} />
            {pending === 'pending' ? (
              <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto' }}>
                <Pressable style={[styles.decline, { borderColor: C.border, backgroundColor: C.surface }]}
                  onPress={() => setPending('declined')}>
                  <Text style={[styles.declineText, { color: C.text }]}>Decline</Text>
                </Pressable>
                <Pressable style={[styles.accept, { backgroundColor: C.accent }]} onPress={() => setPending('accepted')}>
                  <Text style={[styles.acceptText, { color: C.onAccent }]}>Accept</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        {/* Trend */}
        <Text style={[t.sectionSerif, { paddingHorizontal: layout.screenHPadding, marginTop: 26, marginBottom: 14 }]}>7-day trend</Text>
        <View style={styles.chart}>
          {TREND.map((h, i) => (
            <View key={i} style={[styles.bar, { height: `${h}%`, backgroundColor: C.accent, opacity: 0.55 + (h / 100) * 0.45 }]} />
          ))}
        </View>

        {/* Popular services */}
        <Text style={[t.overline, { paddingHorizontal: layout.screenHPadding, marginTop: 26, marginBottom: 10 }]}>POPULAR SERVICES</Text>
        <View style={{ paddingHorizontal: layout.screenHPadding, gap: 8 }}>
          <PopService label="Haircut" pct={42} />
          <PopService label="Colour" pct={28} />
          <PopService label="Facial" pct={18} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function KPI({ label, value, accent, danger }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  const { C } = useTheme();
  return (
    <View style={[styles.kpi, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Text style={[styles.kpiValue, { color: accent ? C.accent : danger ? C.danger : C.text }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: danger ? C.danger : C.textMuted }]}>{label}</Text>
    </View>
  );
}

function PopService({ label, pct }: { label: string; pct: number }) {
  const { C } = useTheme();
  return (
    <View style={styles.popRow}>
      <Text style={[styles.popLabel, { color: C.text }]}>{label}</Text>
      <View style={[styles.popTrack, { backgroundColor: C.surface2 }]}>
        <View style={[styles.popFill, { width: `${pct}%`, backgroundColor: C.accent }]} />
      </View>
      <Text style={[styles.popPct, { color: C.textMuted }]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  salonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  open: { fontSize: 13, fontWeight: '700' },
  trial: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: layout.screenHPadding, marginTop: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16 },
  trialText: { flex: 1, fontSize: 13.5, fontWeight: '700' },
  trialCta: { fontSize: 12.5, fontWeight: '800' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, paddingHorizontal: layout.screenHPadding, marginTop: 14 },
  kpi: { flexBasis: '47%', flexGrow: 1, borderRadius: 18, borderWidth: 1, padding: 16, gap: 4 },
  kpiValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  kpiLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  pendingCard: { marginHorizontal: layout.screenHPadding, borderRadius: 18, borderWidth: 1, padding: 14 },
  pendingHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  pName: { fontSize: 14.5, fontWeight: '800' },
  pMeta: { fontSize: 12.5, marginTop: 1 },
  pPrice: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pendingActions: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  decline: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  declineText: { fontSize: 12.5, fontWeight: '700' },
  accept: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  acceptText: { fontSize: 12.5, fontWeight: '800' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 66, paddingHorizontal: layout.screenHPadding },
  bar: { flex: 1, borderRadius: 6 },
  popRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  popLabel: { width: 84, fontSize: 13, fontWeight: '700' },
  popTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  popFill: { height: '100%', borderRadius: 4 },
  popPct: { width: 36, fontSize: 12, fontWeight: '600', textAlign: 'right' },
});
```

**Accept/Decline:** the sample uses local state; wire to your mutation with optimistic update + rollback on error. Keep the chip transition (Pending → Confirmed/Cancelled).

## 8.2 `ManageBookingsScreen.tsx`

Same skeleton as My Bookings but owner-side: segmented `Pending (1) / Today / Upcoming`, pending cards carry Accept/Decline, today's rows show time + service + `StatusChip` + payment method (Cash/UPI) on the right. Reuse `StatusChip`, `MiniButton`, card styles from Chapter 7.6 with `styles.date` replaced by a time column.

```tsx
// Row pattern for Today list:
<View style={[styles.todayRow, { backgroundColor: C.surface, borderColor: C.border }]}>
  <Text style={[styles.time, { color: C.textMuted }]}>10:00 AM</Text>
  <View style={{ flex: 1 }}>
    <Text style={[styles.name, { color: C.text }]}>Ravi K</Text>
    <Text style={[styles.svc, { color: C.textMuted }]}>Haircut · ₹499</Text>
  </View>
  <StatusChip status="confirmed" />
  <Text style={[styles.pay, { color: C.textMuted }]}>Cash</Text>
</View>
```

## 8.3 `ManageServicesScreen.tsx`

Collapsible groups (same pattern as salon profile) + a `Toggle` per service row (active/inactive) + dashed "Add service" row:

```tsx
<Pressable style={[styles.addRow, { borderColor: C.border }]}>
  <Ionicons name="add" size={17} color={C.textMuted} />
  <Text style={[styles.addText, { color: C.textMuted }]}>Add service</Text>
</Pressable>
// styles.addRow: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, padding: 16,
//   flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginHorizontal: 24, marginTop: 16 }
```

Header link: `Manage categories →` in `C.accent`, 13px/700, top-right.

## 8.4 `OwnerSettingsScreen.tsx`

1. **Salon status row** — "Luxe Hair Studio" + `Toggle` (Open/Closed) + colored status text.
2. **Pro Plan card** (`accentSoft` bg, `accent`-tinted border): `Active` chip + "Pro Plan", renews date, ghost "Manage plan" button, hairline divider, then the **Pro AI upsell row** (shield icon + "Pro AI — Smart insights & pricing" + small accent "Try ₹499/mo" button).
3. Groups: **SALON** (Manage salon / Staff management · 3 staff / Promotions · 1 active), **PAYMENTS** (UPI settings / Bank details / Payment history), then **Sign out** (danger) — all via the shared `Group`/`Row` components from Chapter 7.7.

```tsx
// Pro AI upsell row (inside the Pro Plan card)
<View style={[styles.aiRow, { borderTopColor: C.border }]}>
  <Ionicons name="shield-checkmark-outline" size={17} color={C.accent} />
  <Text style={[styles.aiText, { color: C.text }]}>Pro AI — Smart insights & pricing</Text>
  <Pressable style={[styles.aiBtn, { backgroundColor: C.accent }]}>
    <Text style={[styles.aiBtnText, { color: C.onAccent }]}>Try ₹499/mo</Text>
  </Pressable>
</View>
```

---

# Chapter 9 — Auth: Login (Editorial Calm)

One canonical login screen, works in both modes (colors come from tokens). OTP-first flow — this is purely a visual restyle of your existing `Login.tsx`; keep `pendingAuthIntent` logic untouched.

```tsx
// mobile/src/screens/auth/LoginScreen.tsx
import React from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useType } from '../../theme/typography';
import { layout } from '../../theme/layout';

const APP_ICON = require('../../assets/tmark.png'); // your gold-T mark on transparent bg

export function LoginScreen({ navigation }: any) {
  const { C, isDark } = useTheme();
  const t = useType();
  const [email, setEmail] = useState('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          {/* Brand */}
          <Image source={APP_ICON} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.wordmark, { color: C.text }]}>TRIMIT</Text>
          <Text style={[styles.tagline, { color: C.textMuted }]}>PRECISION GROOMING</Text>

          {/* Editorial headline */}
          <Text style={[t.displayItalic, styles.headline, { color: C.text }]}>Precision grooming,{'\n'}booked.</Text>
          <Text style={[styles.lede, { color: C.textMuted }]}>Your appointment awaits — sign in to confirm.</Text>

          {/* Form */}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={C.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
          />
          <Pressable style={[styles.cta, { backgroundColor: C.accent }]}>
            <Text style={[styles.ctaText, { color: C.onAccent }]}>Continue with email code</Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.divLine, { backgroundColor: C.border }]} />
            <Text style={[styles.divText, { color: C.textMuted }]}>or</Text>
            <View style={[styles.divLine, { backgroundColor: C.border }]} />
          </View>

          {/* Social */}
          <Pressable style={[styles.apple, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}>
            <Ionicons name="logo-apple" size={19} color={isDark ? '#000000' : '#FFFFFF'} />
            <Text style={[styles.appleText, { color: isDark ? '#000000' : '#FFFFFF' }]}>Sign in with Apple</Text>
          </Pressable>
          <Pressable style={[styles.google, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.googleG, { color: '#4285F4' }]}>G</Text>
            <Text style={[styles.googleText, { color: C.text }]}>Sign in with Google</Text>
          </Pressable>

          <Text style={[styles.terms, { color: C.textMuted }]}>
            By continuing, you agree to our <Text style={{ color: C.text, fontWeight: '600' }}>Terms</Text> & <Text style={{ color: C.text, fontWeight: '600' }}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 40, paddingBottom: 40 },
  logo: { width: 72, height: 72, borderRadius: 18, marginBottom: 16 },
  wordmark: { fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 24, letterSpacing: 1.6 },
  tagline: { fontSize: 10.5, fontWeight: '800', letterSpacing: 2, marginTop: 3 },
  headline: { fontSize: 30, textAlign: 'center', marginTop: 30, lineHeight: 36 },
  lede: { fontSize: 14, fontWeight: '500', textAlign: 'center', marginTop: 8, maxWidth: 300, lineHeight: 20 },
  input: { alignSelf: 'stretch', marginTop: 28, paddingHorizontal: 18, paddingVertical: 15, borderRadius: 15, borderWidth: 1.5, fontSize: 16 },
  cta: { alignSelf: 'stretch', marginTop: 12, paddingVertical: 15, borderRadius: 15, alignItems: 'center' },
  ctaText: { fontSize: 15.5, fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 12, marginVertical: 18 },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 12.5, fontWeight: '600' },
  apple: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 15 },
  appleText: { fontSize: 14.5, fontWeight: '700' },
  google: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 14, borderRadius: 15, borderWidth: 1.5, marginTop: 9 },
  googleG: { fontSize: 18, fontWeight: '800' },
  googleText: { fontSize: 14.5, fontWeight: '700' },
  terms: { fontSize: 11.5, textAlign: 'center', lineHeight: 17, marginTop: 22, maxWidth: 320 },
});
```

**Note:** Apple button is black in light mode and white in dark (auto-inverts via `isDark`) — exactly like Apple's own guidelines.

---

# Chapter 10 — Migration Plan (mapped to your repo)

Execute in this order. Each phase is independently shippable and nothing breaks the production build midway.

| Phase | What | Files touched | Acceptance |
|---|---|---|---|
| **0. Foundation** | Tokens + ThemeProvider + fonts | `theme/colors.ts` (extend), `theme/ThemeProvider.tsx` (new), `theme/typography.ts` (new), `theme/layout.ts` (new), `App.tsx` (wrap provider + load fonts) | App builds & renders exactly as before (additive change only) |
| **1. Glass + Dock** | GlassView + FloatingTabBar rewrite | `components/glass/GlassView.tsx` (new), `components/FloatingTabBar.tsx` (replace internals), `CustomerTabs.tsx` / `OwnerTabs.tsx` (wire) | Dock floats over both tab stacks, pill springs, Android fallback legible |
| **2. Home** | Editorial Discover | `screens/customer/Discover*` rebuild + `SectionHeader`, `Rail`, `SalonCard`, `BentoCategories`, `SalonListItem`, `VibeArt` | Home matches mockup 01 in light & dark |
| **3. Booking flow** | Profile → Time → Checkout → Success | `SalonProfileScreen`, `TimeSelectScreen`, `CheckoutScreen`, `BookingSuccessScreen` + `AddButton`, `ServiceRow`, `SummaryBar`, `SegmentedControl` | Multi-select → summary slides up → slots + hold timer → UPI sheet → ring ceremony |
| **4. Bookings + Profile** | Customer remainder | `MyBookingsScreen`, `ProfileScreen` + `Toggle`, `StatusChip` | Upcoming/Past switch, grouped settings, mode switcher |
| **5. Owner stack** | Dashboard + 3 manage screens | `owner/*` + KPI/chart patterns | Accept/Decline, trend bars, service toggles, Pro card |
| **6. Auth** | Login restyle | `screens/auth/Login*` | OTP-first flow intact, both modes |

**Hard constraints for every phase:**

- Don't touch: API layer (`services/`), Zustand stores' logic, React Navigation *structure*, Supabase calls, payment logic.
- Do: replace presentation components, keep all `DATA:` seams wired to real hooks, keep route names identical.
- Every PR = one phase, screenshots light+dark for each changed screen.
- `npx tsc --noEmit` clean; test on a real Android device (blur fallback) and iOS simulator (blur).

---

# Chapter 11 — Master Agent Prompt (copy-paste for Antigravity)

```text
You are redesigning the TrimiT React Native app (Expo SDK 54, RN 0.81, React 19,
React Navigation, Zustand, TanStack Query) to the "Champagne Noir" design system
with an Editorial home layout and a Liquid Glass dock.

AUTHORITATIVE SPEC: read design/TRIMIT-REDESIGN-BLUEPRINT.md in the repo root
before writing any code. It contains the exact tokens, components, and screen
code. Follow it verbatim — do not invent colors, radii, or fonts.

RULES:
1. Presentation layer only. Never modify business logic, API clients, stores,
   navigation structure, or Supabase/payment code.
2. All colors from theme/colors.ts tokens. No hardcoded hex in components.
3. Glass = GlassView component only, chrome surfaces only (dock, summary bar,
   confirm zone, sheets, fabs). Never inside list items.
4. Every screen must work in light AND dark mode — verify both before finishing.
5. Android: rely on GlassView's built-in solid fallback; do not branch manually.
6. Work phase-by-phase per Chapter 10. One phase per PR. After each phase run
   `npx tsc --noEmit` and report the result.
7. Where the blueprint marks "// DATA:" seams, wire them to the existing hooks/
   queries in this repo (search before creating new ones). Keep route names and
   params identical to the current navigators in src/navigation/.
8. Add the required packages exactly as listed in the blueprint Chapter 0 via
   `npx expo install` (never npm-install raw RN packages).

DELIVERABLE PER PHASE: list of changed/created files, screenshots (light+dark)
for each changed screen, tsc result, and any deviation from the blueprint with
a one-line reason.
```

---

# Chapter 12 — QA Checklist

Run per screen, both modes, both platforms.

**Color & contrast**
- [ ] No hardcoded hex outside `theme/`
- [ ] Muted text is only used ≥13px/600 (AA)
- [ ] Status text always bold on soft-tint bg

**Glass**
- [ ] Dock legible over photos and plain backgrounds
- [ ] Max 2 blur surfaces on screen
- [ ] Android fallback: solid, correct radius, specular top edge present
- [ ] No blur inside scrolling lists

**Layout**
- [ ] 24px horizontal gutter everywhere
- [ ] Dock never covers content (bottom inset 130 on scrolls)
- [ ] Rails snap; bento tiles equal-width
- [ ] Dark mode: no white flashes, all borders visible

**Interactions**
- [ ] AddButton morph + haptic
- [ ] SummaryBar slide-up/out with spring
- [ ] Hold timer color transitions (green → amber ≤2:00 → red ≤1:00) and resets
- [ ] Segmented pill slides; slots show check burst; days select
- [ ] UPI sheet opens/closes with timing; scrim tap dismisses
- [ ] Success ring draws once on mount; check pops at ~1s
- [ ] Accept/Decline chips transition states

**Owner & Auth**
- [ ] 4-tab dock works with the same pill math
- [ ] KPI values use tabular-nums
- [ ] Login: Apple button inverts in dark; email OTP path unchanged

---

*Blueprint version 1.0 · matches `TrimiT Theme 1 Champagne Noir.html` + V3 master · Champagne Noir #8A6524 (light) / #E3C77F (dark) · Editorial layout · Liquid Glass dock · 14 screens, light & dark, customer + owner + auth.*

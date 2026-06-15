# TrimiT Design System & Theme Guide

This document acts as the single source of truth for the TrimiT mobile application design system. It details the color tokens, typography settings, and UI mappings for both **Light Mode** and **Dark Mode** to align the app with modern, premium luxury salon marketplaces.

---

## 1. Upgraded Typography Scale

We use **Cormorant Garamond** for editorial, luxury headings and **Inter** for clean, legible body copy and action labels.

| Type Style | Font Family | Size (px) | Line Height | Weight | Usage & UI Recommendations |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`display`** | `CormorantGaramond_700Bold` | 48 | 56 | Bold (700) | Onboarding header, premium marketing banner titles, prominent empty states, and marketing hero sections. |
| **`h1`** | `CormorantGaramond_700Bold` | 36 | 44 | Bold (700) | Main welcome headers, checkout success screen titles. |
| **`h2`** | `CormorantGaramond_700Bold` | 28 | 34 | Bold (700) | Screen titles, salon detail page main header titles. |
| **`h3`** | `CormorantGaramond_600SemiBold`| 22 | 28 | SemiBold (600) | Main detail sections, dialog overlay header titles. |
| **`h4`** | `Inter_600SemiBold` | 18 | 24 | SemiBold (600) | Salon list card names, sub-section headers, input titles. |
| **`body`** | `Inter_400Regular` | 16 | 24 | Regular (400) | General description copy, paragraphs, policies text. |
| **`bodyMedium`** | `Inter_500Medium` | 16 | 24 | Medium (500) | Form input text values, editable fields, highlighted details. |
| **`bodySemiBold`** | `Inter_600SemiBold` | 16 | 24 | SemiBold (600) | Inline emphasized labels, list item secondary titles. |
| **`bodySmall`** | `Inter_400Regular` | 14 | 20 | Regular (400) | Supporting info, service durations, addresses, dates. |
| **`bodySmallMedium`**| `Inter_500Medium` | 14 | 20 | Medium (500) | Minor list metadata, minor tags, input hint texts. |
| **`caption`** | `Inter_400Regular` | 12 | 16 | Regular (400) | Metadata footnotes, time stamps, ratings count. |
| **`captionMedium`**| `Inter_600SemiBold` | 12 | 16 | SemiBold (600) | Status badge labels, category tag labels. |
| **`overline`** | `Inter_700Bold` | 11 | 16 | Bold (700) | Uppercase category prefixes (e.g., "POPULAR SALONS"). |
| **`button`** | `Inter_600SemiBold` | 16 | 24 | SemiBold (600) | Text inside primary CTA buttons, action buttons. |
| **`buttonSmall`** | `Inter_600SemiBold` | 14 | 20 | SemiBold (600) | Text inside minor inline utility buttons (e.g., "Change"). |

---

## 2. Upgraded Color System

All colors must be resolved dynamically using the `useTheme()` hook in React Native.

### Semantic Color System (Alerts & Indicators)

These tokens provide consistent styling for validation messages, alerts, and inline feedback.

| Token | Light Mode Hex | Dark Mode Hex | Usage / Intent |
| :--- | :---: | :---: | :--- |
| **`success`** | `#059669` | `#82E0AA` | Positive feedback, booking success, success toast. |
| **`successLight`**| `#ECFDF5` | `#1A2D22` | Tinted background container for success banners. |
| **`warning`** | `#D97706` | `#F7DC6F` | Validation warning messages, pending review indicators. |
| **`warningLight`**| `#FFFBEB` | `#2D2D1A` | Tinted background container for warnings. |
| **`info`** | `#2563EB` | `#85C1E9` | Instructional notices, guide tips, neutral information. |
| **`infoLight`** | `#EFF6FF` | `#1A242D` | Tinted background container for information banners. |
| **`error`** | `#DC2626` | `#FF5F5F` | Validation errors, critical failure alerts, destructive CTA. |
| **`errorLight`** | `#FEF2F2` | `#2D1A1A` | Tinted background container for error alerts. |

*Accessibility consideration: Light mode text on light tinted backgrounds should use the saturated primary token (e.g., success text color `#059669` on successLight background `#ECFDF5`) to achieve a contrast ratio of > 4.5:1.*

---

### Booking Status Color System

Dedicated, brand-aligned colors for booking lifecycle states.

| Booking Status | Status Token | Light Mode Hex | Dark Mode Hex | Badge Example |
| :--- | :--- | :---: | :---: | :--- |
| **Pending** | `statusPending` | `#B45309` (bg: `#FEF3C7`) | `#F7DC6F` (bg: `#2D2D1A`) | Golden/Amber badge stating "Awaiting Approval" |
| **Confirmed** | `statusConfirmed` | `#1D4ED8` (bg: `#DBEAFE`) | `#85C1E9` (bg: `#1A242D`) | Regal Indigo/Blue badge stating "Confirmed" |
| **Completed** | `statusCompleted` | `#047857` (bg: `#D1FAE5`) | `#82E0AA` (bg: `#1A2D22`) | Soft Emerald badge stating "Completed" |
| **Cancelled** | `statusCancelled` | `#B91C1C` (bg: `#FEE2E2`) | `#FF5F5F` (bg: `#2D1A1A`) | Crimson badge stating "Cancelled" |
| **Rescheduled** | `statusRescheduled`| `#6D28D9` (bg: `#EDE9FE`) | `#BB8FCE` (bg: `#1A1A2D`) | Editorial Purple badge stating "Rescheduled" |
| **In Progress** | `statusInProgress` | `#C2410C` (bg: `#FFEDD5`) | `#F97316` (bg: `#2E160D`) | Vibrant Terracotta badge stating "In Progress" |

---

## 3. Elevated Surface System

To create depth without relying on heavy or dark shadows, TrimiT uses a structured, multi-tier surface elevation system.

| Surface Level | Light Mode Hex | Dark Mode Hex | Border treatment | Shadow Treatment |
| :--- | :---: | :---: | :--- | :--- |
| **`background`** | `#FAFAF9` | `#121411` | None | None |
| **`surface`** | `#FFFFFF` | `#1A1C19` | 1px border `#E7E5E4` (Light) / `#2A2C29` (Dark) | None |
| **`surfaceSecondary`** | `#F5F5F4` | `#242622` | None | None |
| **`surfaceElevated`** | `#FFFFFF` | `#242622` | Hairline border | Softer, light shadow (`shadows.sm` / `elevation: 1`) |
| **`surfaceFloating`** | `#FFFFFF` | `#2D2F2A` | Subtle 1px accent border | Prominent soft shadow (`shadows.lg` / `elevation: 6`) |

*Shadow strategy: Avoid saturated black shadows. In Light Mode, shadows use an opacity of `0.04` to `0.08` with a larger shadowRadius (8px to 16px) for an organic, modern glow. In Dark Mode, elevation is communicated via lighter surface backgrounds rather than shadows.*

---

## 4. Modernized Border Radius Scale

We use softer, friendlier curves across the application to enhance the premium consumer feel.

| Token | Radius (px) | Application |
| :--- | :---: | :--- |
| **`sm`** | 6 | Status badges, category tag containers, checkboxes. |
| **`md`** | 10 | Inputs, selector buttons, inner card details. |
| **`lg`** | 16 | Salon cards, service item list tiles, main CTA buttons. |
| **`xl`** | 24 | Bottom sheets, main modals, dialog boxes. |
| **`xxl`** | 32 | Marketing banners, profile header card wrappers. |
| **`pill`**| 40 | Filter capsules, active tab selections, search bars. |
| **`full`**| 999 | User avatars, circular floating buttons. |

---

## 5. Premium Orange Gradient System

Luxury beauty brands utilize sunset gradients to convey warmth, editorial elegance, and premium quality.

### Gradient Tokens
- **`gradientPrimary`**: Orange-600 (`#EA580C`) to Orange-800 (`#9A3412`).
  - *Usage*: High-contrast UI elements, primary buttons, or selected state rings.
- **`gradientPremium`**: Amber-500 (`#F59E0B`) to Orange-600 (`#EA580C`) to Orange-800 (`#9A3412`).
  - *Usage*: Promotional banners, reward cards, premium salon headers.
- **`gradientHighlight`**: Soft Orange-50 (`#FFF7ED`) to Orange-100 (`#FFEDD5`).
  - *Usage*: Subtle page section backgrounds or active tabs.

---

## 6. Bottom Tab Bar Enhancements

The bottom navigation bar has been updated to feel highly polished and integrated.

### Tab Bar Specifications
- **Height**: `62 + insets.bottom` (gives more spacing for comfort).
- **Background**: Resolves to `colors.tabBar`.
- **Top Border**: `1px` solid `colors.tabBarBorder`.
- **Shadow**: Subtle top elevation shadow on iOS (`shadowOpacity: 0.04`, `shadowRadius: 8`, `shadowOffset: { width: 0, height: -3 }`) and Android (`elevation: 8`) to establish visual separation.
- **Active State**: Primary brand color tint (`colors.primary`) applied to the icon and text label.
- **Inactive State**: Muted silver/slate (`colors.textTertiary` or `colors.textSecondary`).
- **Typography**: `theme.typography.captionMedium` (11px, Medium/SemiBold) with `marginTop: 2` to prevent label-icon overlaps.

---

## 7. React Native Implementation Recommendations

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export function PremiumCard() {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.borderRadius.lg, ...theme.shadows.md }]}>
      <LinearGradient
        colors={theme.colors.gradientPremium}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientHeader, { borderTopLeftRadius: theme.borderRadius.lg, borderTopRightRadius: theme.borderRadius.lg }]}
      >
        <Text style={[theme.typography.h3, { color: theme.colors.textInverse }]}>Premium Service</Text>
      </LinearGradient>
      
      <View style={styles.content}>
        <Text style={theme.typography.body}>Enjoy a customized styling experience.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
  },
  gradientHeader: {
    padding: 16,
  },
  content: {
    padding: 16,
  },
});
```

### Design Rationale

1. **Editorial Quality**: Introducing the `display` typography tier using Cormorant Garamond Bold establishes a strong editorial visual anchor that mimics luxury print magazines.
2. **Visual Depth**: By replacing generic black box-shadows with lighter, diffused shadows, surfaces float naturally above the page backdrop, looking clean on modern OLED displays.
3. **Structured Booking Lifecycle**: The unified status badge system makes it easy for consumers and salon owners to scan list views and immediately recognize booking states.
4. **Cohesive Dark Mode**: The dark mode matches the premium feel by utilizing deep golds (`#f1d18d`) and obsidian tones, preventing high-contrast eye strain while maintaining the warm luxury aesthetic.

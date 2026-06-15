# TrimiT Design System & Theme Guide

This document acts as the single source of truth for the TrimiT mobile application design system. It details the color tokens, typography settings, and layout properties for both **Light Mode** and **Dark Mode**, along with architectural suggestions for updating or modernizing the brand identity.

---

## 1. Color Palettes & UI Mappings

All colors must be resolved dynamically at runtime using the `useTheme()` context. The following table describes the exact color tokens, their current hex mappings, and design suggestions to make the app feel cleaner and more premium.

| Color Token | Light Mode Hex | Dark Mode Hex | UI Mapping / Purpose | Design & Modernization Suggestions |
| :--- | :---: | :---: | :--- | :--- |
| **`background`** | `#FAFAF9` | `#121411` | Primary screen backdrop | Keep light background as stone-50. For a modern tech look, consider a cool-slate (`#F8FAFC`) to feel brighter. |
| **`surface`** | `#FFFFFF` | `#1A1C19` | Standard component cards | To increase premium feel, use subtle glassmorphism or borders rather than heavy drop shadows. |
| **`surfaceSecondary`**| `#F5F5F4` | `#242622` | Inner/nested blocks | Ensure contrast with `surface` remains distinct so layouts don't look flat. |
| **`text`** | `#1C1917` | `#F5F5F5` | Primary titles & headers | Consider `#0F172A` (slate-900) in light mode for a softer, highly polished modern print feel. |
| **`textSecondary`** | `#78716C` | `#A1A1A1` | Muted subtitles & hints | Muted tones should keep a contrast ratio of at least 4.5:1 against card backgrounds for accessibility. |
| **`textAccent`** | `#9A3412` | `#f1d18d` | Accent texts (prices/star ratings) | Gold in dark mode feels editorial and luxurious. Keep this contrast sharp. |
| **`primary`** | `#9A3412` | `#f1d18d` | Primary CTA Background | **Light Mode:** Orange-800 (`#9A3412`) can be shifted to a deep indigo (`#4F46E5`) or emerald (`#059669`) for a fresh look. <br>**Dark Mode:** Gold (`#f1d18d`) is very premium. For a modern vibe, try a bright electric violet (`#A78BFA`). |
| **`primaryDark`** | `#C2410C` | `#d4b574` | CTA Active/Pressed state | Always derive this color dynamically or use a darker shade of `primary` to indicate interactive feedback. |
| **`border`** | `#E7E5E4` | `#2A2C29` | Hairline dividers & outlines | Keep borders extremely thin (`StyleSheet.hairlineWidth`) to look ultra-clean. |
| **`error`** | `#DC2626` | `#FF5F5F` | Validation errors / alerts | Avoid saturated primaries; use soft, desaturated red alerts with matching light error tints. |

---

## 2. Typography Hierarchy

TrimiT uses **Cormorant Garamond** for editorial, high-end headings and **Inter** for clean, readable body copies.

| Type Style | Font Family | Size (px) | Line Height | Weight | Design Suggestion |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`h1`** | `CormorantGaramond_700Bold` | 36 | 44 | Bold (700) | Use sparingly for key onboarding headers. Keep letter spacing slightly negative (`-0.5`). |
| **`h2`** | `CormorantGaramond_700Bold` | 28 | 34 | Bold (700) | Perfect for card/list header titles. |
| **`h3`** | `CormorantGaramond_600SemiBold`| 22 | 28 | SemiBold (600) | Elegant for dialog overlays and secondary titles. |
| **`h4`** | `Inter_600SemiBold` | 18 | Auto | SemiBold (600) | Highly readable for input labels and inline titles. |
| **`body`** | `Inter_400Regular` | 16 | 24 | Regular (400) | Ideal for body paragraphs. Ensure line height is wide enough (1.5x) to promote readability. |
| **`bodyMedium`** | `Inter_500Medium` | 16 | 24 | Medium (500) | Great for input text fields and form inputs. |
| **`bodySmall`** | `Inter_400Regular` | 14 | 20 | Regular (400) | Used for muted hints or secondary description text. |
| **`caption`** | `Inter_400Regular` | 12 | 16 | Regular (400) | Used for timestamps or tiny descriptions. |
| **`overline`** | `Inter_700Bold` | 11 | Auto | Bold (700) | Uppercase with spacing (`letterSpacing: 2`). Excellent for small category tags. |
| **`button`** | `Inter_600SemiBold` | 16 | Auto | SemiBold (600) | Uppercase or Titlecase text inside primary CTA buttons. |

---

## 3. Spacing & Border Radius

Consistency in spacing and curvature defines the "premium feel" of modern mobile apps.

### Spacing Tokens
* **`xs` (4px) / `sm` (8px):** Fine-grained margins between titles and subtitles, or icon/label gaps.
* **`md` (12px) / `lg` (16px):** Inner paddings for list items and custom inputs.
* **`xl` (20px) / `xxl` (24px):** Layout padding around the edges of screens (standard screen margins).
* **`xxxl` (32px) / `xxxxl` (40px):** Vertical spacer gaps between major dashboard modules.

### Border Radius Curvature
* **`sm` (4px):** Subtle tags or badges.
* **`md` (8px):** Standard text inputs.
* **`lg` (12px):** Primary salon tiles and service item list cards.
* **`xl` (16px) / `xxl` (24px):** Bottom sheets, main modals, and large card components.
* **`pill` (32px) / `full` (999px):** Circular buttons, avatar icons, and action pills.

* **Design Tip:** *Modern clean aesthetics favor rounder edges (`lg: 12px` and `xl: 16px`) over sharp square corners (`sm: 4px`), as soft edges feel friendlier and less technical.*

---

## 4. Brand Evolution: Custom Theme Configuration

If you decide to change or modernize the color scheme of TrimiT, you only need to modify one central file: [mobile/src/theme/colors.ts](file:///Users/arqummalik/Software%20Development/Trimit/TrimiT/mobile/src/theme/colors.ts).

### Theme Options & Color Combinations

#### Option A: The "Tech Minimalist" (Clean Cool-Blue Theme)
Great for a high-efficiency utility vibe (resembles modern SaaS applications like Linear).
* **Primary:** `#3B82F6` (Electric Blue)
* **Text Accent:** `#60A5FA` (Light Blue)
* **Light Background:** `#F8FAFC` (Cool Slate)
* **Dark Background:** `#0F172A` (Slate Obsidian)

#### Option B: The "Wellness & Naturalist" (Fresh Sage Theme)
Great for organic wellness, spas, and boutique salons.
* **Primary:** `#065F46` (Forest Green)
* **Text Accent:** `#34D399` (Mint Accent)
* **Light Background:** `#F0FDF4` (Mint Tint)
* **Dark Background:** `#064E3B` (Deep Sage)

#### Option C: The "Royal Luxury" (Amethyst Velvet Theme)
Great for editorial high-fashion and luxury styling.
* **Primary:** `#6D28D9` (Deep Royal Purple)
* **Text Accent:** `#C084FC` (Lavender Highlight)
* **Light Background:** `#FAF5FF` (Purple Tint)
* **Dark Background:** `#1E1B4B` (Midnight Indigo)

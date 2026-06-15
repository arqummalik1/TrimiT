# TrimiT Design System & Theme Guide

This document acts as the single source of truth for the TrimiT mobile application design system. It details the color tokens, typography settings, and UI mappings for both **Light Mode** and **Dark Mode**, along with architectural suggestions for updating or modernizing the brand identity.

---

## 1. Color Palettes & UI Mappings

All colors must be resolved dynamically at runtime using the `useTheme()` context. The following table describes the exact color tokens, their current hex mappings, and design suggestions to make the app feel cleaner, more appealing, and modern.

| Color Token | Light Mode Hex | Dark Mode Hex | UI Mapping / Purpose | Design & Modernization Suggestions / Alternates |
| :--- | :---: | :---: | :--- | :--- |
| **`background`** | `#FAFAF9` (Stone-50) | `#121411` (Obsidian) | Primary screen backdrop | **Light:** Stone-50 is warm. For a modern tech look, use a cool-slate (`#F8FAFC`) to feel brighter.<br>**Dark:** Obsidian is deep. For a softer dark mode, try off-black (`#0B0F19`) which works great with indigo accents. |
| **`surface`** | `#FFFFFF` | `#1A1C19` | Standard component cards | **Light:** Plain white is good. Apply subtle border colors (`#E2E8F0`) instead of heavy drop shadows.<br>**Dark:** To increase premium feel, use subtle glassmorphism or 1px borders rather than heavy drop shadows. |
| **`surfaceSecondary`**| `#F5F5F4` | `#242622` | Inner/nested blocks | Ensure contrast with `surface` remains distinct so layouts don't look flat. |
| **`surfaceRaised`** | `#FFFFFF` | `#1A1C19` | Elevated/modal content | Use high elevation values on iOS/Android or distinct contrast borders to guide user focus. |
| **`surfaceHighlight`**| `#E2E8F0` | `#2D2F2A` | Selector background states | Keep highlight colors soft to avoid overriding primary action highlights. |
| **`text`** | `#1C1917` (Stone-900) | `#F5F5F5` | Primary titles & headers | **Light:** Consider slate-900 (`#0F172A`) for a softer, highly polished modern feel.<br>**Dark:** Off-white (`#F8FAFC`) prevents eye strain compared to pure `#FFFFFF`. |
| **`textSecondary`** | `#78716C` (Stone-500) | `#A1A1A1` | Muted subtitles & hints | Muted tones must keep a contrast ratio of at least 4.5:1 against card backgrounds for accessibility. |
| **`textTertiary`** | `#A8A29E` | `#717171` | Disabled text / placeholders | Make sure it remains legible. In dark mode, `#808080` is preferred. |
| **`textInverse`** | `#FFFFFF` | `#121411` | Text on brand bg | Always matches light/dark background to guarantee high readability. |
| **`textAccent`** | `#9A3412` | `#f1d18d` (Light Gold) | Accent texts (prices/star ratings) | Gold in dark mode feels editorial and luxurious. Keep this contrast sharp. |
| **`primary`** | `#9A3412` (Orange-800) | `#f1d18d` (Light Gold) | Primary CTA Background | **Light Mode:** Orange-800 (`#9A3412`) can be shifted to a deep violet (`#6366F1`) or emerald (`#059669`) for a fresh look.<br>**Dark Mode:** Gold (`#f1d18d`) is very premium. For a modern tech-vibe, try electric violet (`#A78BFA`). |
| **`primaryDark`** | `#C2410C` | `#d4b574` | CTA Active/Pressed state | Always derive this color dynamically or use a darker shade of `primary` to indicate interactive feedback. |
| **`primaryLight`** | `#FFF7ED` | `#f9e8c4` | Tinted background containers | Great for warning alerts or active pill containers. |
| **`border`** | `#E7E5E4` | `#2A2C29` | Hairline dividers & outlines | Keep borders extremely thin (`StyleSheet.hairlineWidth`) to look ultra-clean. |
| **`borderFocus`** | `#9A3412` | `#f1d18d` | Text input active border | Should match the brand primary color to maintain consistency. |
| **`error`** | `#DC2626` | `#FF5F5F` | Validation errors / alerts | Avoid saturated primaries; use soft, desaturated red alerts with matching light error tints. |

---

## 2. Typography Hierarchy

TrimiT uses **Cormorant Garamond** for editorial, high-end headings and **Inter** for clean, readable body copies.

| Type Style | Font Family | Size (px) | Line Height | Weight | UI Mapping / Purpose | Design & Modernization Suggestions |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **`h1`** | `CormorantGaramond_700Bold` | 36 | 44 | Bold (700) | Onboarding / Auth welcome screens | Use sparingly. Keep letter spacing slightly negative (`-0.5`) to feel tighter and modern. |
| **`h2`** | `CormorantGaramond_700Bold` | 28 | 34 | Bold (700) | Screen titles & dashboard headers | Perfect for main card/list header titles. |
| **`h3`** | `CormorantGaramond_600SemiBold`| 22 | 28 | SemiBold (600) | Secondary headings / detail pages | Elegant for dialog overlays and secondary titles. |
| **`h4`** | `Inter_600SemiBold` | 18 | Auto | SemiBold (600) | Minor section headings / large labels | Highly readable for input labels and inline titles. |
| **`body`** | `Inter_400Regular` | 16 | 24 | Regular (400) | General body paragraph copy | Ensure line height is wide enough (1.5x) to promote readability. |
| **`bodyMedium`** | `Inter_500Medium` | 16 | 24 | Medium (500) | Active inputs, lists, items | Great for input text fields and form inputs. |
| **`bodySemiBold`** | `Inter_600SemiBold` | 16 | 24 | SemiBold (600) | Semi-bold inline text / bold details | Use for highlighting key names/words in standard copy. |
| **`bodySmall`** | `Inter_400Regular` | 14 | 20 | Regular (400) | Nested item descriptions / hints | Used for muted hints or secondary description text. |
| **`bodySmallMedium`**| `Inter_500Medium` | 14 | 20 | Medium (500) | Secondary lists or metadata | Keeps details structured without cluttering the screen. |
| **`caption`** | `Inter_400Regular` | 12 | 16 | Regular (400) | Time, date, minor metadata details | Used for timestamps or tiny descriptions. |
| **`captionMedium`**| `Inter_600SemiBold` | 12 | 16 | SemiBold (600) | Active badges, small inline tags | Keeps information prominent at small sizes. |
| **`overline`** | `Inter_700Bold` | 11 | Auto | Bold (700) | Categories / section separators | Uppercase with spacing (`letterSpacing: 2`). Excellent for small category tags. |
| **`button`** | `Inter_600SemiBold` | 16 | Auto | SemiBold (600) | Primary CTA buttons | Titlecase or uppercase text inside primary CTA buttons. |
| **`buttonSmall`** | `Inter_600SemiBold` | 14 | Auto | SemiBold (600) | Secondary / inline actions | Great for tiny utility buttons (e.g. edit, delete). |

---

## 3. UI Token Mappings (Quick Reference)

Use the following mapping guide when styling UI components:

| UI Component | Styling Target | Token to Apply | Suggestions for a Modern look |
| :--- | :--- | :--- | :--- |
| **Buttons** | Background | `colors.primary` | Rounded pill buttons (`borderRadius.pill`) feel much friendlier. |
| | Text | `colors.textInverse` | Use `typography.button` to make the action text crisp. |
| **Cards** | Background | `colors.surface` | Use `borderRadius.lg` (12px) with a 1px border (`colors.border`) instead of shadows. |
| **Text Inputs** | Border (Default) | `colors.border` | Keep borders thin and light (`#E2E8F0` / `#2A2C29`). |
| | Border (Focused) | `colors.borderFocus` | Transition smoothly using React Native `Animated` API. |
| | Text | `colors.text` | Input text size should match `typography.bodyMedium` (16px) to avoid iOS zoom-in on focus. |
| **Lists & Lists Items**| Background | `colors.background` | Use `spacing.lg` (16px) for item gaps to keep screens readable. |
| **Badges / Status** | Background / Text | `getLightStatusColors()` / `getDarkStatusColors()` | Make status badges subtle: translucent pastel background and rich, dark text color. |
| **Header Bar** | Background | `colors.surface` | Apply a thin bottom border instead of shadows. |
| **TabBar** | Background | `colors.tabBar` | Ensure alignment with the main screen's background to look unified. |

---

## 4. Spacing & Border Radius

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

## 5. Modern Brand Evolution Options

If you decide to change or modernize the color scheme of TrimiT, you only need to modify one central file: [mobile/src/theme/colors.ts](file:///Users/arqummalik/Software%20Development/Trimit/TrimiT/mobile/src/theme/colors.ts).

### Option A: The "Minimalist Indigo" (Clean Tech Theme)
*Resembles modern SaaS platforms (like Linear) to feel extremely clean and efficient.*
* **Primary:** `#4F46E5` (Indigo-600)
* **Light Background:** `#F8FAFC` (Cool Slate-50)
* **Dark Background:** `#0F172A` (Slate Obsidian)
* **Accent Text:** `#818CF8` (Indigo Light)
* **Border:** `#E2E8F0`

### Option B: The "Spa Wellness" (Fresh Sage & Terracotta Theme)
*Designed for warm, organic, wellness and beauty-focused experiences.*
* **Primary:** `#0F766E` (Teal-700)
* **Light Background:** `#FAF9F6` (Warm Alabaster)
* **Dark Background:** `#111E1C` (Deep Pine)
* **Accent Text:** `#F97316` (Terracotta Accent)
* **Border:** `#E5E7EB`

### Option C: The "Amethyst & Obsidian" (Bold Editorial Theme)
*Editorial, rich, high-end styling and luxury fashion focus.*
* **Primary:** `#7C3AED` (Violet-600)
* **Light Background:** `#FAFAFA` (Pure Light)
* **Dark Background:** `#0B0F19` (Midnight Navy)
* **Accent Text:** `#A78BFA` (Lavender Light)
* **Border:** `#E5E7EB`

# Settings Page Design Guidelines

## Overview
All settings screens in TrimiT (both customer and salon owner) must follow an Apple-inspired inset grouped list aesthetic. The UI should be highly consistent, native-feeling, and visually clean.

## Architecture
- **Screen Wrapper**: Use `ScreenWrapper` to ensure safe areas and background colors are handled globally.
- **Scroll View**: The main content must be inside a `ScrollView` with `showsVerticalScrollIndicator={false}` and vertical padding.
- **Card Groups**: Settings are grouped together in "cards". Each group is a `View` with:
  - `backgroundColor: theme.colors.surface`
  - `borderRadius: theme.borderRadius.lg` (or 12px)
  - `overflow: 'hidden'`
- **Card Items**: Individual settings inside a card group.
  - `flexDirection: 'row'`
  - `alignItems: 'center'`
  - `padding: theme.layout.cardPadding` (or 16px)
  - `borderBottomWidth: StyleSheet.hairlineWidth`
  - `borderBottomColor: theme.colors.border`
  - *Last item* must have `borderBottomWidth: 0` to prevent a double border at the bottom of the card.
  - **Compatibility**: DO NOT use `gap` in Flexbox rows as it causes silent layout failures on certain React Native versions. Use `marginRight` or `marginLeft` on children components for spacing.

## Theming & Typography
- **No Hardcoded Colors**: NEVER use hardcoded colors (e.g., `#FF9500`, `#007AFF`). ALWAYS use semantic theme colors (`theme.colors.primary`, `theme.colors.warning`, `theme.colors.info`, etc.).
- **Icons**: Icons inside colored boxes must be `theme.colors.white`. The box background must be a semantic theme color.
- **Typography**: Do not hardcode `fontSize` or `fontWeight`. Use the `theme.typography` presets (e.g., `theme.typography.body`, `theme.typography.bodySemiBold`, `theme.typography.captionMedium`).
- **Section Titles**: Titles above card groups must use `textTransform: 'uppercase'`, `theme.typography.captionMedium`, and align perfectly with the left edge of the card group container below it (no extra horizontal margins).

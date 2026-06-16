# Floating Bottom Navigation Bar Design Rule

**Objective:**
This document serves as the master blueprint and strict rule set for the custom "Apple Liquid Glass" floating bottom navigation bar implemented in our system (`FloatingTabBar.tsx`). Future AI agents must read this before attempting to modify the navigation UI to ensure the design remains intact and is never disrupted.

## 1. High-Level Concept
The bottom navigation bar is designed as a **floating, rounded capsule** that hovers above the bottom safe area. It heavily utilizes frosted glass aesthetics (in dark mode) and precise micro-animations. 

When a user taps a tab:
- The active icon **lifts up** and slightly protrudes outside the top boundary of the glass bar.
- A **premium gradient background pill** fades in behind the active icon.
- A **primary-colored dot indicator** glides horizontally to rest under the active tab.

## 2. Core Libraries & Dependencies
We avoid heavy external animation libraries to keep the component highly performant. The implementation strictly relies on:
- **`@react-navigation/bottom-tabs`**: The base router. We completely override the default UI by passing our custom component to the `tabBar` prop.
- **`react-native/Animated`**: Used for all micro-animations (translating, scaling). We use the native driver (`useNativeDriver: true`) to ensure 60fps performance without JavaScript thread bottlenecking.
- **`expo-blur` (`BlurView`)**: Used to create the Apple-like frosted glass effect.
- **`expo-linear-gradient`**: Used to draw the vibrant background pill for the active tab.
- **`@expo/vector-icons` (`Ionicons`)**: For standard, uniform iconography.

## 3. Structural Layout & The "Clipping" Problem
One of the most complex challenges was allowing the active icon to physically break out of the bar (protrude upwards) while keeping the frosted glass background contained within its rounded corners (`borderRadius: 10`).

**How we solved it:**
We use a **Dual-Layer Architecture**. The main wrapper is `box-none` and holds two completely separate siblings overlapping each other:
1. **The Background Layer (Clipped):** This layer has `StyleSheet.absoluteFill`, a fixed height (`64px`), and `overflow: 'hidden'`. This strictly clips the `BlurView` and borders to the rounded corners.
2. **The Foreground Layer (Unclipped):** This layer sits exactly on top of the background. It holds the icons and text but explicitly does **not** use `overflow: 'hidden'`. Because it is unclipped, the active icon can be translated upwards (negative Y-axis) and overlap the top edge of the background layer without getting chopped off.

## 4. Light Mode vs. Dark Mode Handling
- **Dark Mode:** We use `BlurView` with a `dark` tint, accompanied by a subtle semi-transparent dark overlay (`rgba(28, 28, 30, 0.45)`) and a delicate white-opacity border (`rgba(255,255,255,0.09)`) to give it a premium glassy sheen.
- **Light Mode:** `BlurView` caused a harsh, bright "white band" visual bug when blurring the light screen backgrounds. To fix this, we drop the `BlurView` in light mode and fall back to a completely solid, opaque `#FFFFFF` background. This ensures a clean, flat, premium white card look.

## 5. Animation Architecture
All animations are driven by the active route `state.index`. When the index changes, a `useEffect` triggers an `Animated.parallel()` batch:
- **Dot Translation:** The small dot's `translateX` value is animated to the exact mathematical center of the newly active tab's slot width.
- **Tab Lift (`translateY`):** The active tab interpolates to `-10px` (lifting it out of the bar), while inactive tabs return to `0px`.
- **Tab Scale:** The active tab scales up to `1.08x` to give a subtle "pop" effect.

## 6. Strict Guidelines for Future Edits
- **DO NOT** modify the `BAR_HEIGHT` (64px) without also updating the padding inside `tabRow`. If the content height exceeds the bar height, inactive icons will bleed out of the top of the glass.
- **DO NOT** add `overflow: 'hidden'` to `barOuter` or `tabRow`. Doing so will immediately break the lifting animation and cut the active icon in half.
- **DO NOT** use standard `tabBarStyle` configurations in the Navigator's `screenOptions`. All layout logic must remain inside `FloatingTabBar.tsx`.
- **DO NOT** migrate the animations to `react-native-reanimated` unless absolutely necessary for a complex physics-based gesture. The standard `Animated` API provides enough power for these simple transitions with zero extra bundle overhead.

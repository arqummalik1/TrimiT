/**
 * ScreenWrapper.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized safe-area layout component for TrimiT.
 *
 * ARCHITECTURE:
 *   Tab navigators (OwnerTabs / CustomerTabs) compute their own height using
 *   `useSafeAreaInsets()` → height = 56 + insets.bottom.
 *   Screens inside tabs must NOT add a bottom safe-area edge (that would double
 *   the inset). Instead they use variant="tab" which only protects top/sides.
 *
 * VARIANT REFERENCE:
 *   "tab"        → inside a BottomTabNavigator (top + left + right only)
 *   "stack"      → stack screen pushed from inside a tab (top + left + right)
 *   "auth"       → standalone auth screens with no tab bar (all 4 edges)
 *   "modal"      → full-screen slide-up modal (all 4 edges)
 *   "fullscreen" → hero / immersive screens (no edges — use useSafeAreaInsets
 *                  directly for fine-grained overlaid control positioning)
 *
 * SCROLLABLE SCREENS:
 *   Use TAB_BAR_BASE_HEIGHT in contentContainerStyle to ensure list content
 *   scrolls above the tab bar:
 *
 *   const insets = useSafeAreaInsets();
 *   contentContainerStyle={{ paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom }}
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

// ─── Shared constant — keep in sync with tab navigator height ────────────────
/** Visible chrome height of the tab bar (excluding bottom inset). */
export const TAB_BAR_BASE_HEIGHT = 56;

// ─── Edge maps per variant ───────────────────────────────────────────────────

const EDGES: Record<ScreenVariant, Edge[]> = {
  tab: ['top', 'left', 'right'],
  stack: ['top', 'left', 'right'],
  auth: ['top', 'bottom', 'left', 'right'],
  modal: ['top', 'bottom', 'left', 'right'],
  fullscreen: [],
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScreenVariant = 'tab' | 'stack' | 'auth' | 'modal' | 'fullscreen';

interface ScreenWrapperProps {
  variant?: ScreenVariant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Direct edge override — use sparingly, prefer variants. */
  edges?: Edge[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  variant = 'tab',
  children,
  style,
  edges,
}) => {
  const { theme } = useTheme();
  const resolvedEdges = edges ?? EDGES[variant];

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.background }, style]}
      edges={resolvedEdges}
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default ScreenWrapper;

/**
 * HeaderBackButton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The single back affordance for every stack screen.
 *
 * Two variants:
 *   "plain"   → transparent, sits in a normal header row over the background
 *   "overlay" → scrimmed circle, sits on top of a hero image
 *
 * Usage:
 *   <HeaderBackButton onPress={navigation.goBack} />
 *   <HeaderBackButton variant="overlay" onPress={navigation.goBack} />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Theme } from '../theme/tokens';

/** Minimum accessible touch target (iOS HIG / Material). */
export const HEADER_BUTTON_SIZE = 44;

interface HeaderBackButtonProps {
  onPress: () => void;
  disabled?: boolean;
  variant?: 'plain' | 'overlay';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const HeaderBackButton: React.FC<HeaderBackButtonProps> = ({
  onPress,
  disabled = false,
  variant = 'plain',
  accessibilityLabel = 'Go back',
  style,
  testID = 'header-back-button',
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const isOverlay = variant === 'overlay';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, isOverlay && styles.overlay, style]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.7}
      testID={testID}
    >
      <Ionicons
        name="arrow-back"
        size={22}
        color={isOverlay ? theme.colors.white : theme.colors.text}
      />
    </TouchableOpacity>
  );
};

/** Same footprint as the button — keeps a title visually centred in a 3-column header row. */
export const HeaderBackButtonSpacer: React.FC = () => (
  <View style={spacerStyles.spacer} />
);

const spacerStyles = StyleSheet.create({
  spacer: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
  },
});

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      width: HEADER_BUTTON_SIZE,
      height: HEADER_BUTTON_SIZE,
      borderRadius: theme.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlay: {
      backgroundColor: theme.colors.overlay,
    },
  });

export default HeaderBackButton;

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../lib/utils';
import { HEADER_BUTTON_SIZE } from './HeaderBackButton';

type ScreenHeaderProps = {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  divider?: boolean;
  testID?: string;
};

/** Fixed chrome below ScreenWrapper's safe area; never adds a second top inset. */
export function ScreenHeader({ title, left, right, divider = false, testID }: ScreenHeaderProps) {
  const { theme } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.header,
        divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
      ]}
    >
      <View style={styles.control}>{left}</View>
      {title ? (
        <Text
          accessibilityRole="header"
          style={[styles.title, theme.typography.bodySemiBold, { color: theme.colors.text }]}
        >
          {title}
        </Text>
      ) : <View style={styles.title} />}
      <View style={styles.control}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 54,
    paddingVertical: 5,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  control: {
    width: HEADER_BUTTON_SIZE,
    minHeight: HEADER_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
  },
});

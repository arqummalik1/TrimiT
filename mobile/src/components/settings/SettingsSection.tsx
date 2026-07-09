import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { createSettingsStyles } from './settingsStyles';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createSettingsStyles(theme), [theme]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  isLast?: boolean;
  trailing?: React.ReactNode;
  testID?: string;
}

export function SettingsRow({
  title,
  subtitle,
  onPress,
  disabled,
  destructive,
  isLast,
  trailing,
  testID,
}: SettingsRowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createSettingsStyles(theme), [theme]);

  const content = (
    <>
      <View style={styles.rowText}>
        <Text
          style={[styles.rowTitle, destructive && styles.rowTitleDestructive]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (
        onPress ? (
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
        ) : null
      )}
    </>
  );

  const rowStyle = [styles.row, !isLast && styles.rowBorder];

  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={rowStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.65}
      testID={testID}
      accessibilityRole="button"
    >
      {content}
    </TouchableOpacity>
  );
}

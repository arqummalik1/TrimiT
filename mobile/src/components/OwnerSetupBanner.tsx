import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../theme/ThemeContext';
import { typography, spacing, borderRadius } from '../lib/utils';

type OwnerSetupBannerProps = {
  title: string;
  message: string;
  ctaLabel: string;
  onPress: () => void;
  onDismiss?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function OwnerSetupBanner({
  title,
  message,
  ctaLabel,
  onPress,
  onDismiss,
  icon = 'sparkles',
}: OwnerSetupBannerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={theme.colors.primary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity style={styles.cta} onPress={onPress} activeOpacity={0.9}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
          <Ionicons name="arrow-forward" size={16} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>
      {onDismiss ? (
        <TouchableOpacity onPress={onDismiss} style={styles.dismiss} hitSlop={12}>
          <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: theme.colors.primaryLight,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary + '33',
      padding: spacing.lg,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      flex: 1,
      gap: spacing.xs,
    },
    title: {
      ...typography.bodySemiBold,
      color: theme.colors.text,
    },
    message: {
      ...typography.bodySmall,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing.xs,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      marginTop: spacing.sm,
    },
    ctaText: {
      ...typography.buttonSmall,
      color: theme.colors.textInverse,
    },
    dismiss: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
    },
  });

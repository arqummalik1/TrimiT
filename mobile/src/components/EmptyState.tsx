/**
 * EmptyState.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable empty state component for lists and screens with no data.
 *
 * Usage:
 *   <EmptyState
 *     icon="calendar-outline"
 *     title="No Bookings Yet"
 *     message="Discover salons near you to get started."
 *     action={{ label: "Discover Salons", onPress: () => nav.navigate('Discover') }}
 *   />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: EmptyStateAction;
  /** Compact variant for use inside lists (no flex: 1) */
  compact?: boolean;
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
  compact = false,
  style,
}) => {
  return (
    <View style={[compact ? styles.compactContainer : styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={compact ? 40 : 56} color={colors.textTertiary} />
      </View>

      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>

      {message && (
        <Text style={[styles.message, compact && styles.messageCompact]}>{message}</Text>
      )}

      {action && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={action.onPress}
          activeOpacity={0.85}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.xxxxl,
  },
  compactContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.xxxxl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  titleCompact: {
    fontSize: 16,
  },
  message: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  messageCompact: {
    marginBottom: spacing.xl,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    borderRadius: borderRadius.pill,
  },
  actionText: {
    ...typography.buttonSmall,
    color: colors.textInverse,
  },
});

export default EmptyState;

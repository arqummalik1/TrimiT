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
import { useTheme } from '../theme/ThemeContext';

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
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[compact ? styles.compactContainer : styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={compact ? 40 : 56} color={theme.colors.textTertiary} />
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

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xxxxl,
  },
  compactContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xxxxl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    ...theme.typography.h4,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  titleCompact: {
    fontSize: 16,
  },
  message: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xxl,
  },
  messageCompact: {
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxl,
    borderRadius: theme.borderRadius.pill,
  },
  actionText: {
    ...theme.typography.buttonSmall,
    color: theme.colors.textInverse,
  },
});

export default EmptyState;


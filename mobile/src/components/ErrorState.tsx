/**
 * ErrorState.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable error state component for screen-level and inline errors.
 *
 * Usage:
 *   <ErrorState
 *     title="Couldn't load salons"
 *     message={appError.message}
 *     onRetry={refetch}
 *     type="network"
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
import { colors, typography, spacing, borderRadius, shadows } from '../lib/utils';
import { AppErrorType } from '../lib/errorHandler';

// ─── Constants ────────────────────────────────────────────────────────────────

type ErrorVariant = 'fullscreen' | 'card' | 'inline';

const ERROR_ICONS: Record<AppErrorType, keyof typeof Ionicons.glyphMap> = {
  network:    'cloud-offline-outline',
  timeout:    'timer-outline',
  server:     'warning-outline',
  auth:       'lock-closed-outline',
  forbidden:  'ban-outline',
  not_found:  'search-outline',
  validation: 'alert-circle-outline',
  conflict:   'git-compare-outline',
  unknown:    'help-circle-outline',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  message?: string;
  type?: AppErrorType;
  variant?: ErrorVariant;
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  type = 'unknown',
  variant = 'fullscreen',
  onRetry,
  retryLabel = 'Try Again',
  style,
}) => {
  const iconName = ERROR_ICONS[type] ?? 'alert-circle-outline';

  if (variant === 'inline') {
    return (
      <View style={[styles.inlineContainer, style]}>
        <Ionicons name={iconName} size={16} color={colors.error} />
        <Text style={styles.inlineMessage}>{message}</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.inlineRetry}>{retryLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (variant === 'card') {
    return (
      <View style={[styles.cardContainer, shadows.md, style]}>
        <View style={styles.cardIconContainer}>
          <Ionicons name={iconName} size={32} color={colors.error} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardMessage}>{message}</Text>
        {onRetry && (
          <TouchableOpacity style={styles.cardRetryButton} onPress={onRetry} activeOpacity={0.8}>
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={styles.cardRetryText}>{retryLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Default: fullscreen
  return (
    <View style={[styles.fullscreenContainer, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={48} color={colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh" size={18} color={colors.white} />
          <Text style={styles.retryText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Fullscreen ───────────────────────────────────────────────────────────
  fullscreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    backgroundColor: colors.background,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.error + '20',
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxxl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    borderRadius: borderRadius.pill,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: {
    ...typography.button,
    color: colors.textInverse,
  },

  // ── Card ─────────────────────────────────────────────────────────────────
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error + '30',
    marginHorizontal: spacing.lg,
  },
  cardIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  cardMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  cardRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  cardRetryText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },

  // ── Inline ────────────────────────────────────────────────────────────────
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  inlineMessage: {
    ...typography.bodySmall,
    color: colors.error,
    flex: 1,
  },
  inlineRetry: {
    ...typography.captionMedium,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

export default ErrorState;

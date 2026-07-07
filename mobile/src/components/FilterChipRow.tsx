import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme, Theme } from '../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../theme/tokens';
import { salonTypeLabel } from '../lib/genderServe';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface FilterChipRowProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testIDPrefix?: string;
  /** Tighter chips for dense headers (Discover, etc.). */
  compact?: boolean;
}

export function FilterChipRow<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix = 'chip',
  compact = false,
}: FilterChipRowProps<T>) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            testID={`${testIDPrefix}-${opt.value}`}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

interface SalonTypeBadgeProps {
  genderServe?: 'men' | 'women' | 'unisex';
}

export function SalonTypeBadge({ genderServe = 'unisex' }: SalonTypeBadgeProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createBadgeStyles(theme), [theme]);

  const label = salonTypeLabel(genderServe);

  return (
    <View style={styles.badge} testID={`salon-type-${genderServe}`}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const createStyles = (theme: Theme, compact: boolean) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: compact ? 6 : spacing.sm,
      paddingVertical: compact ? 2 : spacing.xs,
    },
    chip: {
      paddingHorizontal: compact ? spacing.sm : spacing.md,
      paddingVertical: compact ? 5 : spacing.sm,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    chipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    chipText: {
      ...(compact ? typography.captionMedium : typography.bodySmallMedium),
      color: theme.colors.textSecondary,
    },
    chipTextActive: {
      color: theme.colors.background,
    },
  });

const createBadgeStyles = (theme: Theme) =>
  StyleSheet.create({
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
      backgroundColor: theme.colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    text: {
      ...typography.captionMedium,
      color: theme.colors.textSecondary,
    },
  });

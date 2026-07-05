import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme, Theme } from '../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../theme/tokens';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface FilterChipRowProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testIDPrefix?: string;
}

export function FilterChipRow<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix = 'chip',
}: FilterChipRowProps<T>) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

  const label =
    genderServe === 'men'
      ? "Men's"
      : genderServe === 'women'
        ? 'Parlor'
        : 'Unisex';

  return (
    <View style={styles.badge} testID={`salon-type-${genderServe}`}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
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
      ...typography.bodySmallMedium,
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

/**
 * BookingListSkeleton.tsx
 * Layout-matched shimmer placeholder for MyBookingsScreen and ManageBookingsScreen.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../Skeleton';
import { useTheme, Theme } from '../../theme/ThemeContext';

const BookingCardSkeleton: React.FC<{ theme: Theme; styles: any }> = ({ theme, styles }) => (
  <View style={styles.card}>
    {/* Status badge + date */}
    <View style={styles.headerRow}>
      <Skeleton width={80} height={24} borderRadius={theme.borderRadius.pill} />
      <Skeleton width={100} height={14} borderRadius={4} />
    </View>

    {/* Divider */}
    <View style={styles.divider} />

    {/* Salon + service info */}
    <View style={styles.infoRow}>
      {/* Salon avatar */}
      <Skeleton width={52} height={52} borderRadius={theme.borderRadius.lg} />
      <View style={styles.infoText}>
        <Skeleton width="70%" height={18} borderRadius={4} />
        <Skeleton width="50%" height={14} borderRadius={4} style={{ marginTop: theme.spacing.xs }} />
        <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: theme.spacing.xs }} />
      </View>
    </View>

    {/* Bottom row: price + time */}
    <View style={styles.footerRow}>
      <Skeleton width={80} height={22} borderRadius={4} />
      <Skeleton width={60} height={14} borderRadius={4} />
    </View>
  </View>
);

export const BookingListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <BookingCardSkeleton key={i} theme={theme} styles={styles} />
      ))}
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.xs,
  },
});

export default BookingListSkeleton;

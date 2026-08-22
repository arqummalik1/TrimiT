/**
 * OfferListSkeleton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shimmer placeholder matching the MyOffersScreen coupon card:
 *   • coloured value stub on the left
 *   • code / campaign / meta lines on the right
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../Skeleton';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { spacing, borderRadius } from '../../lib/utils';

interface OfferListSkeletonProps {
  count?: number;
}

export const OfferListSkeleton: React.FC<OfferListSkeletonProps> = ({ count = 3 }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.root} testID="offer-list-skeleton">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.card}>
          <Skeleton width={80} height={92} borderRadius={0} />
          <View style={styles.body}>
            <Skeleton width="45%" height={16} borderRadius={4} />
            <Skeleton width="70%" height={13} borderRadius={4} />
            <Skeleton width="55%" height={12} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    card: {
      flexDirection: 'row',
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    body: {
      flex: 1,
      padding: spacing.md,
      gap: spacing.sm,
    },
  });

export default OfferListSkeleton;

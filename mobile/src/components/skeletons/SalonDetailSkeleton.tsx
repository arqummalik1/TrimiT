/**
 * SalonDetailSkeleton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shimmer placeholder matching SalonDetailScreen's layout:
 *   • 320px hero
 *   • rating pill + salon name + two info rows
 *   • mini map block
 *   • "Services" heading + three ServiceCard-shaped rows
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../Skeleton';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { spacing, borderRadius } from '../../lib/utils';

/** Keep in sync with MINI_MAP_HEIGHT in SalonDetailScreen. */
const MINI_MAP_HEIGHT = 144;

export const SalonDetailSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.root} testID="salon-detail-skeleton">
      <Skeleton width="100%" height={320} borderRadius={0} />

      <View style={styles.content}>
        <Skeleton width={110} height={28} borderRadius={borderRadius.pill} />
        <Skeleton width="70%" height={28} borderRadius={6} style={styles.title} />
        <Skeleton width="85%" height={14} borderRadius={4} style={styles.infoLine} />
        <Skeleton width="55%" height={14} borderRadius={4} style={styles.infoLine} />

        <Skeleton
          width="100%"
          height={MINI_MAP_HEIGHT}
          borderRadius={borderRadius.lg}
          style={styles.map}
        />

        <Skeleton width={140} height={24} borderRadius={6} style={styles.sectionTitle} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.serviceCard}>
            <Skeleton width="100%" height={130} borderRadius={0} />
            <View style={styles.serviceBody}>
              <Skeleton width="60%" height={15} borderRadius={6} />
              <Skeleton width="90%" height={12} borderRadius={6} />
              <View style={styles.serviceFooter}>
                <Skeleton width={72} height={20} borderRadius={10} />
                <Skeleton width={60} height={28} borderRadius={borderRadius.full} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 24,
      paddingTop: 20,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      marginTop: -20,
    },
    title: {
      marginTop: spacing.md,
    },
    infoLine: {
      marginTop: spacing.sm,
    },
    map: {
      marginTop: spacing.lg,
    },
    sectionTitle: {
      marginTop: spacing.xxl,
      marginBottom: spacing.xl,
    },
    serviceCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      marginBottom: spacing.lg,
    },
    serviceBody: {
      padding: spacing.md,
      gap: spacing.sm,
    },
    serviceFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xs,
    },
  });

export default SalonDetailSkeleton;

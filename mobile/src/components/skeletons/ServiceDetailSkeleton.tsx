/**
 * ServiceDetailSkeleton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shimmer placeholder matching ServiceDetailScreen's layout:
 *   • 340px hero
 *   • meta pill row (price / duration)
 *   • two text sections
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../Skeleton';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { spacing, borderRadius } from '../../lib/utils';

export const ServiceDetailSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.root} testID="service-detail-skeleton">
      <Skeleton width="100%" height={340} borderRadius={0} />

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Skeleton width={96} height={36} borderRadius={borderRadius.full} />
          <Skeleton width={88} height={36} borderRadius={borderRadius.full} />
        </View>

        <View style={styles.section}>
          <Skeleton width={170} height={20} borderRadius={6} />
          <Skeleton width="100%" height={14} borderRadius={4} />
          <Skeleton width="92%" height={14} borderRadius={4} />
          <Skeleton width="60%" height={14} borderRadius={4} />
        </View>

        <View style={styles.section}>
          <Skeleton width={140} height={20} borderRadius={6} />
          <Skeleton width="85%" height={14} borderRadius={4} />
          <Skeleton width="78%" height={14} borderRadius={4} />
          <Skeleton width="70%" height={14} borderRadius={4} />
        </View>
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
    body: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      gap: spacing.xl,
    },
    metaRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    section: {
      gap: spacing.sm,
    },
  });

export default ServiceDetailSkeleton;

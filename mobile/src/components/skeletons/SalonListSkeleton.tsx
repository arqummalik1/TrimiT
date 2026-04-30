/**
 * SalonListSkeleton.tsx
 * Layout-matched shimmer placeholder for the Discover screen salon list.
 * Renders 4 SalonCard-shaped skeletons to perfectly match the real content layout.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../Skeleton';
import { useTheme, Theme } from '../../theme/ThemeContext';

const SalonCardSkeleton: React.FC<{ theme: Theme; styles: any }> = ({ theme, styles }) => (
  <View style={styles.card}>
    {/* Image placeholder */}
    <Skeleton width="100%" height={180} borderRadius={theme.borderRadius.xl} />

    <View style={styles.content}>
      {/* Title row */}
      <View style={styles.titleRow}>
        <Skeleton width="65%" height={20} borderRadius={4} />
        <Skeleton width={48} height={20} borderRadius={theme.borderRadius.pill} />
      </View>

      {/* Rating row */}
      <View style={styles.ratingRow}>
        <Skeleton width={80} height={14} borderRadius={4} />
        <Skeleton width={60} height={14} borderRadius={4} />
      </View>

      {/* Address */}
      <Skeleton width="80%" height={14} borderRadius={4} style={{ marginTop: theme.spacing.xs }} />

      {/* Tags row */}
      <View style={styles.tagsRow}>
        <Skeleton width={70} height={26} borderRadius={theme.borderRadius.pill} />
        <Skeleton width={90} height={26} borderRadius={theme.borderRadius.pill} />
        <Skeleton width={60} height={26} borderRadius={theme.borderRadius.pill} />
      </View>
    </View>
  </View>
);

export const SalonListSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4].map((i) => (
        <SalonCardSkeleton key={i} theme={theme} styles={styles} />
      ))}
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    alignItems: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
});

export default SalonListSkeleton;

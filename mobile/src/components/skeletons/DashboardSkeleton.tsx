import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../Skeleton';
import { useTheme, Theme } from '../../theme/ThemeContext';

export const DashboardSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Skeleton width={80} height={14} borderRadius={4} />
          <Skeleton width={160} height={28} borderRadius={6} style={{ marginTop: theme.spacing.xs }} />
        </View>
        <Skeleton width={44} height={44} borderRadius={22} />
      </View>

      {/* Period tabs */}
      <View style={styles.periodRow}>
        <Skeleton width={72} height={32} borderRadius={theme.borderRadius.pill} />
        <Skeleton width={80} height={32} borderRadius={theme.borderRadius.pill} />
        <Skeleton width={80} height={32} borderRadius={theme.borderRadius.pill} />
      </View>

      {/* Stat cards grid — 2 columns */}
      <View style={styles.statsGrid}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.statCard}>
            <View style={styles.statCardTop}>
              <Skeleton width={32} height={32} borderRadius={10} />
              <Skeleton width={80} height={12} borderRadius={4} />
            </View>
            <Skeleton width="60%" height={30} borderRadius={6} style={{ marginTop: theme.spacing.sm }} />
          </View>
        ))}
      </View>

      {/* Recent activity section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Skeleton width={130} height={18} borderRadius={4} />
          <Skeleton width={60} height={14} borderRadius={4} />
        </View>

        {/* 3 booking card placeholders */}
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.activityCard}>
            <View style={styles.activityRow}>
              <Skeleton width={48} height={48} borderRadius={theme.borderRadius.lg} />
              <View style={styles.activityText}>
                <Skeleton width="60%" height={16} borderRadius={4} />
                <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: theme.spacing.xs }} />
              </View>
              <Skeleton width={72} height={28} borderRadius={theme.borderRadius.pill} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
  },
  headerLeft: {
    gap: theme.spacing.xs,
  },
  periodRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.xxl,
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xxl,
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  section: {
    paddingHorizontal: theme.spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  activityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  activityText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
});

export default DashboardSkeleton;

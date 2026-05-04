/**
 * ServiceListSkeleton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shimmer placeholder that mirrors the exact layout of ServiceCard:
 *   • 130px thumbnail block
 *   • Name line
 *   • Description line (shorter)
 *   • Footer row (price pill + CTA pill)
 *
 * Renders `count` cards in a list. Transitions seamlessly when real data loads.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../Skeleton';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, borderRadius } from '../../lib/utils';

interface ServiceListSkeletonProps {
  count?: number;
}

export const ServiceListSkeleton: React.FC<ServiceListSkeletonProps> = ({ count = 3 }) => {
  const { theme } = useTheme();

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Thumbnail */}
          <Skeleton width="100%" height={130} borderRadius={0} />

          {/* Body */}
          <View style={styles.body}>
            {/* Name + action */}
            <View style={styles.bodyTop}>
              <View style={styles.nameBlock}>
                <Skeleton width="60%" height={15} borderRadius={6} />
                <Skeleton width="90%" height={12} borderRadius={6} style={{ marginTop: 6 }} />
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Skeleton width={72} height={20} borderRadius={10} />
              <Skeleton width={60} height={28} borderRadius={borderRadius.full} />
            </View>
          </View>
        </View>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  bodyTop: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nameBlock: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
});

export default ServiceListSkeleton;

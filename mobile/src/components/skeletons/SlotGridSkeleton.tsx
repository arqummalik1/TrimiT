/**
 * SlotGridSkeleton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shimmer placeholder for a wrapping grid of time-slot pills.
 * Matches the 100px-wide / 48px-tall pill used by the booking and reschedule
 * slot grids.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../Skeleton';
import { borderRadius } from '../../lib/utils';

interface SlotGridSkeletonProps {
  count?: number;
}

export const SlotGridSkeleton: React.FC<SlotGridSkeletonProps> = ({ count = 9 }) => (
  <View style={styles.grid} testID="slot-grid-skeleton">
    {Array.from({ length: count }, (_, i) => (
      <Skeleton key={i} width={100} height={48} borderRadius={borderRadius.pill} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});

export default SlotGridSkeleton;

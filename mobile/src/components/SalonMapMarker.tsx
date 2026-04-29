/**
 * SalonMapMarker.tsx
 * ─────────────────────────────────────────────────────────────────
 * Custom, branded map marker for TrimiT salons.
 * Used in:
 *   - SalonDetailScreen   (static marker on mini-map)
 *   - DiscoverScreen      (multiple markers on discover map)
 *   - ManageSalonScreen   (owner's movable pin)
 *
 * Design: scissors icon inside an orange pill with a downward triangle
 * pointer, matching the TrimiT brand color (#9A3412 / orange-800).
 *
 * Performance: Pure functional component with no internal state.
 * The Marker's tracksViewChanges is set to false by default — this is
 * CRITICAL on Android; leaving it true causes continuous re-renders and
 * jank on map scroll.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps';
import type { Coordinates } from '../lib/maps';

interface SalonMapMarkerProps {
  coordinate: Coordinates;
  /** Optional label shown below the icon pill */
  label?: string;
  /** If true, renders a pulsing "selected" ring around the marker */
  selected?: boolean;
  /** If true, marker updates when coordinate prop changes (use only on the draggable owner pin) */
  trackViewChanges?: boolean;
  onPress?: () => void;
}

export const SalonMapMarker: React.FC<SalonMapMarkerProps> = ({
  coordinate,
  label,
  selected = false,
  trackViewChanges = false,
  onPress,
}) => {
  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      // tracksViewChanges=false prevents continuous re-renders on Android
      tracksViewChanges={trackViewChanges}
      anchor={{ x: 0.5, y: 1 }} // bottom-center of marker aligns with pin point
    >
      <View style={styles.wrapper}>
        {/* Outer glow ring when selected */}
        {selected && <View style={styles.selectedRing} />}

        {/* Pill body */}
        <View style={[styles.pill, selected && styles.pillSelected]}>
          <Ionicons name="cut" size={14} color="#FFFFFF" />
          {label ? <Text style={styles.label} numberOfLines={1}>{label}</Text> : null}
        </View>

        {/* Downward triangle pointer */}
        <View style={[styles.pointer, selected && styles.pointerSelected]} />
      </View>
    </Marker>
  );
};

const BRAND = '#9A3412';
const BRAND_SELECTED = '#7C2D12';

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  selectedRing: {
    position: 'absolute',
    top: -4,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: BRAND,
    opacity: 0.3,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // Android elevation
    elevation: 4,
  },
  pillSelected: {
    backgroundColor: BRAND_SELECTED,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 80,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: BRAND,
    marginTop: -1,
  },
  pointerSelected: {
    borderTopColor: BRAND_SELECTED,
  },
});

export default SalonMapMarker;

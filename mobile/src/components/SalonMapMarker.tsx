/**
 * SalonMapMarker.tsx
 * Custom branded map marker — uses theme primary color.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps';
import { useTheme } from '../theme/ThemeContext';
import type { Coordinates } from '../lib/maps';

interface SalonMapMarkerProps {
  coordinate: Coordinates;
  label?: string;
  selected?: boolean;
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
  const { theme } = useTheme();
  const brand         = theme.colors.primary;
  const brandSelected = theme.colors.primaryDark;

  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      tracksViewChanges={trackViewChanges}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.wrapper}>
        {selected && (
          <View
            style={[
              styles.selectedRing,
              { borderColor: brand },
            ]}
          />
        )}
        <View
          style={[
            styles.pill,
            { backgroundColor: selected ? brandSelected : brand },
          ]}
        >
          <Ionicons name="cut" size={14} color="#FFFFFF" />
          {label ? (
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
          ) : null}
        </View>
        <View
          style={[
            styles.pointer,
            { borderTopColor: selected ? brandSelected : brand },
          ]}
        />
      </View>
    </Marker>
  );
};

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
    opacity: 0.3,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
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
    marginTop: -1,
  },
});

export default SalonMapMarker;

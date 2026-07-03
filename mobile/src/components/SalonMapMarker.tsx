/**
 * SalonMapMarker.tsx
 *
 * Uses the platform-native red pin via react-native-maps `pinColor` prop.
 *
 * WHY NATIVE PIN?
 * ──────────────────────────────────────────────────────────────────────────
 * react-native-maps renders custom marker children by taking a native bitmap
 * snapshot of the React Native view tree.  Android's snapshot API clips the
 * bitmap to the *measured layout bounds* of the root view, ignoring
 * `overflow: 'visible'` and any Animated transforms that scale outside those
 * bounds.  This produces the "crescent / 10 % visible" bug seen in the app.
 *
 * The only 100 % reliable cross-platform solution is to let the native map
 * SDK draw its own pin via `pinColor`.  The custom callout (tap popup) still
 * works correctly when `showCallout` is true.
 * ──────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import type { Coordinates } from '../lib/maps';

const LOGO_SOURCE = require('../../assets/logo.png');

export type SalonMapMarkerVariant = 'brand' | 'pill';

interface SalonMapMarkerProps {
  coordinate: Coordinates;
  label?: string;
  selected?: boolean;
  trackViewChanges?: boolean;
  onPress?: () => void;
  variant?: SalonMapMarkerVariant;
  showLabel?: boolean;
  showCallout?: boolean;
}

export const SalonMapMarker: React.FC<SalonMapMarkerProps> = ({
  coordinate,
  label,
  selected = false,
  trackViewChanges: trackViewChangesProp,
  onPress,
  variant = 'brand',
  showLabel = false,
  showCallout = true,
}) => {
  const { theme } = useTheme();

  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!selected) {
      opacityAnim.setValue(1);
      return;
    }

    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => opacityAnim.stopAnimation();
  }, [selected, opacityAnim]);

  const [tracksView, setTracksView] = useState(true);

  useEffect(() => {
    if (trackViewChangesProp !== undefined) {
      setTracksView(trackViewChangesProp);
      return;
    }
    if (selected) {
      setTracksView(true);
    } else {
      const id = setTimeout(() => setTracksView(false), 500);
      return () => clearTimeout(id);
    }
  }, [trackViewChangesProp, selected]);

  // Pin color is driven entirely by the theme so re-branding updates every map
  // pin automatically. Selected uses the darker brand shade for emphasis;
  // unselected uses the primary brand color (always visible, never the
  // near-white tint that previously made pins disappear).
  const pinColor = selected ? theme.colors.primaryDark : theme.colors.primary;

  // When showLabel is on, the salon name sits in a pill above the pin and the
  // whole view grows taller, so we anchor at the very bottom (y: 1) to keep the
  // pin tip exactly on the coordinate. Without a label we keep the original
  // anchor so existing maps (owner/detail) are unchanged.
  const showNameLabel = showLabel && !!label;
  const markerAnchor = showNameLabel ? { x: 0.5, y: 1 } : { x: 0.5, y: 0.9 };

  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      tracksViewChanges={tracksView}
      anchor={markerAnchor}
    >
      <View style={showNameLabel ? styles.markerContainerLabeled : styles.markerContainer}>
        {showNameLabel ? (
          <View style={[styles.labelPill, { backgroundColor: theme.colors.surface, borderColor: pinColor }]}>
            <Text
              numberOfLines={1}
              style={[styles.labelText, { color: theme.colors.text }]}
            >
              {label}
            </Text>
          </View>
        ) : null}
        <Animated.View style={{ opacity: opacityAnim, alignItems: 'center' }}>
          <Ionicons name="location-sharp" size={48} color={pinColor} />
        </Animated.View>
      </View>

      {/* Callout popup shown when the user taps the pin */}
      {showCallout && label ? (
        <Callout tooltip onPress={onPress}>
          <View style={styles.callout}>
            <Image source={LOGO_SOURCE} style={styles.calloutLogo} resizeMode="contain" />
            <Text style={[styles.calloutTitle, { color: theme.colors.text }]}>{label}</Text>
          </View>
        </Callout>
      ) : null}
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  markerContainerLabeled: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 2,
  },
  labelPill: {
    maxWidth: 160,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: -2,
    // Subtle shadow so the name stays readable over any map tile.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    minWidth: 140,
    maxWidth: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  calloutTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  calloutLogo: {
    width: 22,
    height: 22,
  },
});

export default SalonMapMarker;

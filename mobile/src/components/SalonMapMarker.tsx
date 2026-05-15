/**
 * SalonMapMarker.tsx
 * Compact TrimiT logo map pin (default) or legacy pill for owner flows.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Marker, Callout } from 'react-native-maps';
import { useTheme } from '../theme/ThemeContext';
import type { Coordinates } from '../lib/maps';

const LOGO_SOURCE = require('../../assets/logo.png');

/** Total marker footprint — padding prevents map snapshot from clipping border/shadow. */
const MARKER_WIDTH = 36;
const MARKER_HEIGHT = 44;
const PIN_SIZE = 26;
const LOGO_SIZE = 16;

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
  const brand = theme.colors.primary;
  const brandSelected = theme.colors.primaryDark;

  const [tracksView, setTracksView] = useState(
    trackViewChangesProp ?? variant === 'brand'
  );

  useEffect(() => {
    if (trackViewChangesProp !== undefined) {
      setTracksView(trackViewChangesProp);
      return;
    }
    if (variant !== 'brand') return;
    const id = setTimeout(() => setTracksView(false), 500);
    return () => clearTimeout(id);
  }, [trackViewChangesProp, variant]);

  const ringColor = selected ? brandSelected : brand;

  if (variant === 'pill') {
    return (
      <Marker
        coordinate={coordinate}
        onPress={onPress}
        tracksViewChanges={tracksView}
        anchor={{ x: 0.5, y: 1 }}
      >
        <View style={styles.wrapper}>
          {selected ? <View style={[styles.selectedRing, { borderColor: brand }]} /> : null}
          <View style={[styles.pill, { backgroundColor: selected ? brandSelected : brand }]}>
            <Ionicons name="cut" size={14} color="#FFFFFF" />
            {label ? (
              <Text style={styles.label} numberOfLines={1}>
                {label}
              </Text>
            ) : null}
          </View>
          <View style={[styles.pointer, { borderTopColor: selected ? brandSelected : brand }]} />
        </View>
      </Marker>
    );
  }

  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      tracksViewChanges={tracksView}
      anchor={{ x: 0.5, y: 1 }}
      centerOffset={Platform.OS === 'ios' ? { x: 0, y: -4 } : undefined}
    >
      <View style={styles.markerHost}>
        <View style={styles.pinColumn}>
          {selected ? (
            <View style={[styles.selectedRing, { borderColor: ringColor }]} />
          ) : null}
          <View style={[styles.brandPin, { borderColor: ringColor }]}>
            <Image source={LOGO_SOURCE} style={styles.brandLogoImage} resizeMode="contain" />
          </View>
          <View style={[styles.brandPointer, { borderTopColor: ringColor }]} />
        </View>
        {showLabel && label ? (
          <View style={[styles.nameTag, { borderColor: ringColor }]}>
            <Text style={styles.nameTagText} numberOfLines={1}>
              {label}
            </Text>
          </View>
        ) : null}
      </View>
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
  wrapper: {
    alignItems: 'center',
  },
  /** Fixed size + padding so react-native-maps does not clip circle border / shadow. */
  markerHost: {
    width: MARKER_WIDTH,
    minHeight: MARKER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
    paddingTop: 4,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  pinColumn: {
    alignItems: 'center',
    overflow: 'visible',
  },
  selectedRing: {
    position: 'absolute',
    top: 0,
    width: PIN_SIZE + 8,
    height: PIN_SIZE + 8,
    borderRadius: (PIN_SIZE + 8) / 2,
    borderWidth: 2,
    opacity: 0.35,
  },
  brandPin: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  brandLogoImage: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  brandPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  nameTag: {
    marginTop: 2,
    maxWidth: 96,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
  },
  nameTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1C1917',
    textAlign: 'center',
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
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    minWidth: 140,
    maxWidth: 220,
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

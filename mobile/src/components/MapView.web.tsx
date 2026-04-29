import React, { forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

/**
 * MapView Web Mock
 * ─────────────────────────────────────────────────────────────────
 * A simplified placeholder for react-native-maps that prevents
 * bundling errors in the browser.
 */

export const MapView = forwardRef(({ children, style, initialRegion, onPress }: any, ref) => {
  useImperativeHandle(ref, () => ({
    animateToRegion: () => console.log('animateToRegion called on web placeholder'),
    fitToCoordinates: () => console.log('fitToCoordinates called on web placeholder'),
    animateCamera: () => console.log('animateCamera called on web placeholder'),
  }));

  return (
    <Pressable 
      style={[style, styles.mockMap]} 
      onPress={() => {
        if (onPress) {
          // Provide dummy coordinates for testing interaction
          onPress({
            nativeEvent: {
              coordinate: {
                latitude: initialRegion?.latitude || 28.6139,
                longitude: initialRegion?.longitude || 77.2090,
              }
            }
          });
        }
      }}
    >
      <Text style={styles.mockText}>Map Preview (Web Placeholder)</Text>
      <Text style={styles.subText}>Interactive maps are only available on Android/iOS</Text>
      {children}
    </Pressable>
  );
});

export const Marker = ({ children, style }: any) => (
  <View style={[styles.mockMarker, style]}>
    {children || <Text style={{ fontSize: 24 }}>📍</Text>}
  </View>
);

export const Callout = ({ children }: any) => <View>{children}</View>;
export const Polygon = () => null;
export const Polyline = () => null;
export const Circle = () => null;

const styles = StyleSheet.create({
  mockMap: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 200,
  },
  mockText: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  mockMarker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MapView;

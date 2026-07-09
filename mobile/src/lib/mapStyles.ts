/**
 * mapStyles.ts
 * Shared light/dark styling for react-native-maps (iOS + Android).
 *
 * - iOS (Apple Maps): `userInterfaceStyle` drives native light/dark tiles.
 * - Android (Google Maps): `customMapStyle` JSON is required for dark mode.
 * - Pass `key={getMapThemeKey(isDark)}` on MapView when theme can change in-place
 *   so iOS reapplies `userInterfaceStyle` after toggle.
 */

import type { MapStyleElement } from 'react-native-maps';

/** Google Maps Platform "Night" style — used on Android in dark mode. */
export const GOOGLE_MAP_DARK_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#181818' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1b1b1b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#2c2c2c' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8a8a8a' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#373737' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3c3c3c' }],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry',
    stylers: [{ color: '#4e4e4e' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#000000' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3d3d3d' }],
  },
];

export interface ThemedMapViewProps {
  userInterfaceStyle: 'light' | 'dark';
  customMapStyle?: MapStyleElement[];
}

export function getThemedMapViewProps(isDark: boolean): ThemedMapViewProps {
  return {
    userInterfaceStyle: isDark ? 'dark' : 'light',
    customMapStyle: isDark ? GOOGLE_MAP_DARK_STYLE : undefined,
  };
}

/** Remount key so native MapView picks up theme changes (especially iOS). */
export function getMapThemeKey(isDark: boolean): string {
  return isDark ? 'map-dark' : 'map-light';
}

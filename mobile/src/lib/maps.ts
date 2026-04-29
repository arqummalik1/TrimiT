/**
 * maps.ts
 * ─────────────────────────────────────────────────────────────────
 * Centralised helper layer for all map / navigation operations.
 *
 * Design decisions:
 *  • Zero direct dependencies on react-native-maps in this file — it is
 *    purely a "logic / side-effect" layer (Linking, geo URIs).
 *  • openNativeDirections uses the Google Maps deep-link on Android, and
 *    Apple Maps on iOS. No API key is consumed — the native installed app
 *    handles routing, so this costs ₹0 per request forever.
 *  • geocodeAddress calls Google Geocoding API only when the owner finishes
 *    typing an address and explicitly presses "Search". It is never called
 *    on every keystroke, which would burn the free quota.
 *  • All functions are typed strictly; no `any`.
 */

import { Linking, Platform, Alert } from 'react-native';

// ─── Constants ────────────────────────────────────────────────────

/** Google Maps Geocoding REST endpoint — only used by the owner address-search. */
const GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/** Key comes from the bundle — same key injected by app.config.js into the native layer. */
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

// ─── Types ────────────────────────────────────────────────────────

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  coordinates: Coordinates;
  formattedAddress: string;
}

// ─── Navigation helpers ───────────────────────────────────────────

/**
 * openNativeDirections
 * Opens the native Maps app (Google Maps on Android, Apple Maps on iOS)
 * to give turn-by-turn directions to the salon.
 *
 * Uses deep-link URIs — NO Google Maps SDK calls, NO quota consumed.
 *
 * Android: geo: URI — Android resolves this to Google Maps automatically.
 * iOS:     maps: URI — opens Apple Maps; if user has Google Maps installed
 *          they can switch from there.
 */
export async function openNativeDirections(
  coords: Coordinates,
  label: string
): Promise<void> {
  const { latitude, longitude } = coords;
  const encodedLabel = encodeURIComponent(label);

  const url = Platform.select({
    android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`,
    // On iOS, prefer the Google Maps app if installed, fall back to Apple Maps.
    ios: `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
  }) as string;

  // iOS: check if Google Maps app is installed; fall back to Apple Maps URL scheme.
  if (Platform.OS === 'ios') {
    const googleMapsInstalled = await Linking.canOpenURL(url).catch(() => false);
    if (!googleMapsInstalled) {
      // Apple Maps fallback
      const appleMapsUrl = `maps:0,0?q=${encodedLabel}@${latitude},${longitude}`;
      await Linking.openURL(appleMapsUrl).catch(() =>
        Alert.alert('Error', 'Unable to open Maps. Please try again.')
      );
      return;
    }
  }

  await Linking.openURL(url).catch(() =>
    Alert.alert('Error', 'Unable to open Maps. Please install Google Maps or Apple Maps.')
  );
}

// ─── Geocoding helper (owner address → coordinates) ───────────────

/**
 * geocodeAddress
 * Converts a human-readable address string into lat/lng coordinates using
 * the Google Geocoding API.
 *
 * Called ONLY when the owner explicitly presses the "Find on Map" button
 * after typing an address — never on keystroke — to minimise API usage.
 *
 * Free tier: 5,000 requests / month per SKU (Geocoding API → Essentials).
 * A typical salon owner will call this ~1-5 times when setting up their profile.
 *
 * Throws on network error or if no results are found so the caller can
 * display a user-visible error message.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Maps API key is not configured.');
  }

  const params = new URLSearchParams({
    address,
    key: GOOGLE_API_KEY,
  });

  const response = await fetch(`${GEOCODING_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Geocoding request failed with status ${response.status}`);
  }

  const json = await response.json();

  if (json.status === 'ZERO_RESULTS') {
    throw new Error('No locations found for this address. Please try a more specific address.');
  }

  if (json.status !== 'OK') {
    throw new Error(`Geocoding error: ${json.status}`);
  }

  const result = json.results[0];
  const { lat, lng } = result.geometry.location;

  return {
    coordinates: { latitude: lat, longitude: lng },
    formattedAddress: result.formatted_address as string,
  };
}

// ─── Region helpers ───────────────────────────────────────────────

/**
 * buildRegion
 * Produces a MapView region object for a given coordinate pair.
 * latitudeDelta / longitudeDelta control the zoom level.
 */
export function buildRegion(
  coords: Coordinates,
  latDelta = 0.005,
  lngDelta = 0.005
) {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

/**
 * buildLocationPickerRegion
 * Slightly wider zoom for the owner's location picker.
 */
export function buildLocationPickerRegion(coords: Coordinates) {
  return buildRegion(coords, 0.02, 0.02);
}

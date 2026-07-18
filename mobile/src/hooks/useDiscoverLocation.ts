/**
 * useDiscoverLocation
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for Discover map/list location:
 *   • Resolves foreground permission without racing the salons query
 *   • Last-known position first (fast), then high-accuracy current fix
 *   • One OS location prompt on first open (no custom primer — avoids iOS modal freeze)
 *   • recenter() for map “my location” control
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { logger } from '../lib/logger';

const LOG_SCOPE = '[DiscoverLocation]';

/**
 * Distance (metres) below which a newer GPS fix is treated as the SAME location
 * for the nearby-salon query. The last-known fix and the high-accuracy fix are
 * usually a few hundred metres apart; without this guard the Discover query key
 * (lat/lng) changes when the precise fix lands, refetching and re-rendering the
 * whole salon list a few seconds after open. The nearby radius is kilometres, so
 * sub-500 m refinement never changes results — we keep the first coords stable.
 */
const COORDS_REFETCH_THRESHOLD_M = 500;

function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type DiscoverLocationPhase = 'resolving' | 'ready';

export interface DiscoverLocationState {
  phase: DiscoverLocationPhase;
  coords: { lat: number; lng: number } | null;
  errorMessage: string | null;
  /** True once permission + acquisition attempt finished (query may run). */
  locationReady: boolean;
  /** Human-readable source for logs / subtitle */
  source: 'gps_last_known' | 'gps_current' | 'denied' | 'error' | 'none';
}

export function useDiscoverLocation() {
  const bootstrapStartedRef = useRef(false);
  const [state, setState] = useState<DiscoverLocationState>({
    phase: 'resolving',
    coords: null,
    errorMessage: null,
    locationReady: false,
    source: 'none',
  });

  const applyCoords = useCallback((lat: number, lng: number, source: DiscoverLocationState['source']) => {
    logger.info(`${LOG_SCOPE} coords resolved`, {
      lat,
      lng,
      source,
      platform: Platform.OS,
    });
    setState({
      phase: 'ready',
      coords: { lat, lng },
      errorMessage: null,
      locationReady: true,
      source,
    });
  }, []);

  const markReadyWithoutCoords = useCallback((errorMessage: string | null, source: 'denied' | 'error') => {
    logger.warn(`${LOG_SCOPE} ready without coords`, { source, errorMessage, platform: Platform.OS });
    setState({
      phase: 'ready',
      coords: null,
      errorMessage,
      locationReady: true,
      source,
    });
  }, []);

  const acquireGps = useCallback(async (): Promise<boolean> => {
    const existing = await Location.getForegroundPermissionsAsync();
    const perm =
      existing.status === 'undetermined'
        ? await Location.requestForegroundPermissionsAsync()
        : existing;
    logger.info(`${LOG_SCOPE} foreground permission`, { status: perm.status });

    if (perm.status !== 'granted') {
      markReadyWithoutCoords('Location permission denied', 'denied');
      return false;
    }

    let fromLast: { lat: number; lng: number } | null = null;

    try {
      const last = await Location.getLastKnownPositionAsync({
        maxAge: 120_000,
        requiredAccuracy: 5000,
      }).catch(() => null);

      if (last?.coords) {
        fromLast = { lat: last.coords.latitude, lng: last.coords.longitude };
        logger.info(`${LOG_SCOPE} last known position`, {
          lat: fromLast.lat,
          lng: fromLast.lng,
          ageMs: last.timestamp ? Date.now() - last.timestamp : undefined,
        });
        applyCoords(fromLast.lat, fromLast.lng, 'gps_last_known');
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const { latitude, longitude } = current.coords;
      logger.info(`${LOG_SCOPE} current position`, {
        latitude,
        longitude,
        accuracy: current.coords.accuracy,
      });

      // If we already showed the list using the fast last-known fix, only update
      // (and thus refetch) when the precise fix is meaningfully far away. This
      // stops the "whole list refreshes a few seconds after opening Discover".
      if (fromLast) {
        const moved = distanceMeters(fromLast, { lat: latitude, lng: longitude });
        if (moved < COORDS_REFETCH_THRESHOLD_M) {
          logger.info(`${LOG_SCOPE} precise fix within threshold — keeping coords`, {
            movedMeters: Math.round(moved),
          });
          return true;
        }
      }

      applyCoords(latitude, longitude, 'gps_current');
      return true;
    } catch (e) {
      logger.error(`${LOG_SCOPE} GPS failure`, e, { platform: Platform.OS });
      if (fromLast) {
        applyCoords(fromLast.lat, fromLast.lng, 'gps_last_known');
        return true;
      }
      markReadyWithoutCoords('Unable to get location', 'error');
      return false;
    }
  }, [applyCoords, markReadyWithoutCoords]);

  /** Initial mount: permission check then GPS (single OS prompt when undetermined). */
  const bootstrap = useCallback(async () => {
    if (bootstrapStartedRef.current) {
      return;
    }
    bootstrapStartedRef.current = true;
    setState((s) => ({ ...s, phase: 'resolving', locationReady: false }));
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      logger.info(`${LOG_SCOPE} bootstrap permission`, { status, platform: Platform.OS });

      if (status === 'denied') {
        markReadyWithoutCoords('Location permission denied', 'denied');
        return;
      }
      await acquireGps();
    } catch (e) {
      logger.error(`${LOG_SCOPE} bootstrap failed`, e);
      markReadyWithoutCoords('Unable to get location', 'error');
    }
  }, [acquireGps, markReadyWithoutCoords]);

  /** Map / FAB: refresh GPS and return new coords if successful. */
  const recenter = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        logger.warn(`${LOG_SCOPE} recenter blocked — not granted`, { status });
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const { latitude, longitude } = loc.coords;
      logger.info(`${LOG_SCOPE} recenter`, { latitude, longitude });
      applyCoords(latitude, longitude, 'gps_current');
      return { lat: latitude, lng: longitude };
    } catch (e) {
      logger.error(`${LOG_SCOPE} recenter failed`, e);
      return null;
    }
  }, [applyCoords]);

  return {
    ...state,
    bootstrap,
    recenter,
  };
}

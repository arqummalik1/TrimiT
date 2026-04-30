/**
 * useNetworkStatus.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Reactive hook that tracks internet connectivity using @react-native-community/netinfo.
 *
 * Returns a stable object so consumers don't re-render unnecessarily.
 *
 * Usage:
 *   const { isOnline, isSlowConnection } = useNetworkStatus();
 *   <Button disabled={!isOnline} onPress={...} />
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  /** True when connected AND internet is reachable. */
  isOnline: boolean;
  /** True when connected but on a cellular/slow connection type. */
  isSlowConnection: boolean;
  /** True before the first NetInfo callback fires. */
  isUnknown: boolean;
}

const SLOW_CONNECTION_TYPES = new Set(['cellular', '2g', '3g', 'none', 'unknown']);

function deriveStatus(state: NetInfoState): NetworkStatus {
  const connected = state.isConnected === true;
  const reachable = state.isInternetReachable !== false;
  const isOnline = connected && reachable;

  const type = state.type ?? 'unknown';
  const cellularGen = (state.details as any)?.cellularGeneration ?? null;
  const isSlow =
    isOnline &&
    (SLOW_CONNECTION_TYPES.has(type) ||
      cellularGen === '2g' ||
      cellularGen === '3g');

  return {
    isOnline,
    isSlowConnection: isSlow,
    isUnknown: false,
  };
}

const INITIAL_STATE: NetworkStatus = {
  isOnline: true,   // Optimistic default until first callback
  isSlowConnection: false,
  isUnknown: true,
};

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(INITIAL_STATE);

  useEffect(() => {
    // Fetch current state immediately
    NetInfo.fetch().then((state) => {
      setStatus(deriveStatus(state));
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus(deriveStatus(state));
    });

    return unsubscribe;
  }, []);

  return status;
}

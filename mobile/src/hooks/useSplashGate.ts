import { useEffect, useRef, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { computeSplashHideDelayMs } from '../lib/splashBranding';

/** Keep native splash up until `readyToDismiss`, for at least SPLASH_MIN_DURATION_MS. */
export function useSplashGate(readyToDismiss: boolean) {
  const startMsRef = useRef(Date.now());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void SplashScreen.preventAutoHideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (!readyToDismiss || dismissed) {
      return;
    }
    const delay = computeSplashHideDelayMs(startMsRef.current);
    const id = setTimeout(() => {
      void SplashScreen.hideAsync()
        .catch(() => {})
        .finally(() => setDismissed(true));
    }, delay);
    return () => clearTimeout(id);
  }, [readyToDismiss, dismissed]);

  return dismissed;
}

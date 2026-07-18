import { useEffect, useRef, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { computeSplashHideDelayMs } from '../lib/splashBranding';

// Hold native splash before the first React commit. Calling only inside a
// useEffect races Expo’s auto-hide and can flash a blank frame.
void SplashScreen.preventAutoHideAsync().catch(() => {});

/** Keep native splash up until `readyToDismiss`, for at least SPLASH_MIN_DURATION_MS. */
export function useSplashGate(readyToDismiss: boolean) {
  const startMsRef = useRef(Date.now());
  const [dismissed, setDismissed] = useState(false);

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

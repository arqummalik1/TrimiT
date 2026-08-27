import splashBranding from '../config/splash-branding.json';

/** OLED black shared by app.config.js, both native launch screens, and the JS fallback. */
export const SPLASH_BACKGROUND = splashBranding.backgroundColor;

/** Explicit native image canvas width; prevents the transparent logo from filling the screen. */
export const SPLASH_NATIVE_IMAGE_WIDTH = splashBranding.nativeImageWidth;

/** Minimum time the launch splash stays visible (native + handoff). */
export const SPLASH_MIN_DURATION_MS = 1500;

export const SPLASH_LOGO = require('../../assets/trimit-t-transparent.png');

/** Ms to wait after boot before hiding splash (respects minimum brand display time). */
export function computeSplashHideDelayMs(
  startedAtMs: number,
  nowMs: number = Date.now(),
  minMs: number = SPLASH_MIN_DURATION_MS,
): number {
  return Math.max(0, minMs - (nowMs - startedAtMs));
}

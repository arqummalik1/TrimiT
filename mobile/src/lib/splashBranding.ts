/** OLED black — must match app.config.js splash.backgroundColor and native launch screens. */
export const SPLASH_BACKGROUND = '#000000';

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

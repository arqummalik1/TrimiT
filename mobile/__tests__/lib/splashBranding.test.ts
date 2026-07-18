import {
  computeSplashHideDelayMs,
  SPLASH_BACKGROUND,
  SPLASH_MIN_DURATION_MS,
} from '../../src/lib/splashBranding';

describe('splashBranding', () => {
  it('uses OLED black for splash background', () => {
    expect(SPLASH_BACKGROUND).toBe('#000000');
  });

  it('enforces at least 1.5s minimum splash display', () => {
    expect(SPLASH_MIN_DURATION_MS).toBeGreaterThanOrEqual(1500);
  });

  it('computeSplashHideDelayMs waits for remaining minimum time', () => {
    expect(computeSplashHideDelayMs(1000, 1600, 1500)).toBe(900);
    expect(computeSplashHideDelayMs(1000, 3000, 1500)).toBe(0);
  });
});

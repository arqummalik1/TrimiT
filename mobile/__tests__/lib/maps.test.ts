/**
 * Unit tests for src/lib/maps.ts
 * Covers: buildRegion, buildLocationPickerRegion, DISCOVER_FALLBACK_COORDS,
 *         DISCOVER_INITIAL_DELTA
 */
import {
  buildRegion,
  buildLocationPickerRegion,
  DISCOVER_FALLBACK_COORDS,
  DISCOVER_INITIAL_DELTA,
} from '../../src/lib/maps';

describe('maps', () => {
  // ─── buildRegion ──────────────────────────────────────────────────────────
  describe('buildRegion', () => {
    it('builds a region with given coordinates', () => {
      const region = buildRegion({ latitude: 28.6139, longitude: 77.209 });
      expect(region.latitude).toBe(28.6139);
      expect(region.longitude).toBe(77.209);
    });

    it('uses default deltas (0.005) when none provided', () => {
      const region = buildRegion({ latitude: 0, longitude: 0 });
      expect(region.latitudeDelta).toBe(0.005);
      expect(region.longitudeDelta).toBe(0.005);
    });

    it('uses custom deltas when provided', () => {
      const region = buildRegion({ latitude: 10, longitude: 20 }, 0.01, 0.02);
      expect(region.latitudeDelta).toBe(0.01);
      expect(region.longitudeDelta).toBe(0.02);
    });
  });

  // ─── buildLocationPickerRegion ────────────────────────────────────────────
  describe('buildLocationPickerRegion', () => {
    it('builds a wider region (0.02 deltas) for the location picker', () => {
      const region = buildLocationPickerRegion({ latitude: 28.6139, longitude: 77.209 });
      expect(region.latitude).toBe(28.6139);
      expect(region.longitude).toBe(77.209);
      expect(region.latitudeDelta).toBe(0.02);
      expect(region.longitudeDelta).toBe(0.02);
    });
  });

  // ─── DISCOVER_FALLBACK_COORDS ─────────────────────────────────────────────
  describe('DISCOVER_FALLBACK_COORDS', () => {
    it('is set to New Delhi, India', () => {
      expect(DISCOVER_FALLBACK_COORDS.latitude).toBeCloseTo(28.6139);
      expect(DISCOVER_FALLBACK_COORDS.longitude).toBeCloseTo(77.209);
    });
  });

  // ─── DISCOVER_INITIAL_DELTA ───────────────────────────────────────────────
  describe('DISCOVER_INITIAL_DELTA', () => {
    it('is 0.14', () => {
      expect(DISCOVER_INITIAL_DELTA).toBe(0.14);
    });
  });
});

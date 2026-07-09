import {
  GOOGLE_MAP_DARK_STYLE,
  getMapThemeKey,
  getThemedMapViewProps,
} from '../../src/lib/mapStyles';

describe('mapStyles', () => {
  describe('getThemedMapViewProps', () => {
    it('returns dark interface style and Google dark JSON on Android path', () => {
      const props = getThemedMapViewProps(true);
      expect(props.userInterfaceStyle).toBe('dark');
      expect(props.customMapStyle).toBe(GOOGLE_MAP_DARK_STYLE);
      expect(props.customMapStyle?.length).toBeGreaterThan(0);
    });

    it('returns light interface style and no custom style override', () => {
      const props = getThemedMapViewProps(false);
      expect(props.userInterfaceStyle).toBe('light');
      expect(props.customMapStyle).toBeUndefined();
    });
  });

  describe('getMapThemeKey', () => {
    it('returns stable keys per theme', () => {
      expect(getMapThemeKey(true)).toBe('map-dark');
      expect(getMapThemeKey(false)).toBe('map-light');
    });
  });
});

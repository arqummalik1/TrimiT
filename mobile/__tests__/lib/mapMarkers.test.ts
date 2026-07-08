import { lightTheme } from '../../src/theme/lightTheme';
import { getSalonMapPinColor } from '../../src/lib/mapMarkers';

describe('getSalonMapPinColor', () => {
  it('returns primary when unselected', () => {
    expect(getSalonMapPinColor(lightTheme, false)).toBe(lightTheme.colors.primary);
  });

  it('returns primaryDark when selected', () => {
    expect(getSalonMapPinColor(lightTheme, true)).toBe(lightTheme.colors.primaryDark);
  });
});

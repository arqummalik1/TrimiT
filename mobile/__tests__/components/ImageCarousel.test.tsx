import { CAROUSEL_PAGINATION_BOTTOM, carouselDotColor } from '../../src/components/ImageCarousel';
import { lightTheme } from '../../src/theme/lightTheme';

describe('ImageCarousel pagination', () => {
  it('sits above the salon detail content sheet overlap', () => {
    expect(CAROUSEL_PAGINATION_BOTTOM).toBe(26);
  });

  it('uses theme muted colors for dots like salon meta rows', () => {
    expect(carouselDotColor(lightTheme, true)).toBe(lightTheme.colors.textSecondary);
    expect(carouselDotColor(lightTheme, false)).toBe(lightTheme.colors.textTertiary);
  });
});

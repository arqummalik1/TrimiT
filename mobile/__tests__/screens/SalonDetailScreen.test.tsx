import { createSalonDetailStyles } from '../../src/screens/customer/SalonDetailScreen';
import { lightTheme } from '../../src/theme/lightTheme';
import { borderRadius, fonts } from '../../src/theme/tokens';

describe('SalonDetailScreen layout', () => {
  it('renders salon title on solid surface with tabTitle typography', () => {
    const styles = createSalonDetailStyles(lightTheme);

    expect(styles.salonName.fontFamily).toBe(fonts.heading);
    expect(styles.salonName.fontSize).toBe(lightTheme.typography.tabTitle.fontSize);
    expect(styles.salonName.lineHeight).toBe(lightTheme.typography.tabTitle.lineHeight);
    expect(styles.salonName.letterSpacing).toBe(lightTheme.typography.tabTitle.letterSpacing);
    expect(styles.salonName.fontWeight).toBeUndefined();
    expect(styles.salonName.color).toBe(lightTheme.colors.text);
    expect(styles.infoText.color).toBe(lightTheme.colors.textSecondary);
  });

  it('uses a photo-only hero and card-sized mini map', () => {
    const styles = createSalonDetailStyles(lightTheme);

    expect(styles.heroContainer.height).toBe(320);
    expect(styles.miniMap.height).toBe(144);
    expect(styles.miniMapContainer.borderRadius).toBe(borderRadius.lg);
    expect(styles.miniMapContainer.borderWidth).toBeUndefined();
    expect(styles.miniMapContainer.marginBottom).toBe(lightTheme.spacing.md);
    expect(styles.descriptionBlock.marginBottom).toBe(lightTheme.spacing.lg);
  });
});

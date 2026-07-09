import { createSettingsStyles } from '../../src/components/settings/settingsStyles';
import { lightTheme } from '../../src/theme/lightTheme';

describe('createSettingsStyles', () => {
  it('uses one surface radius for profile card, groups, and theme segments', () => {
    const styles = createSettingsStyles(lightTheme);
    const radius = lightTheme.borderRadius.lg;

    expect(styles.group.borderRadius).toBe(radius);
    expect(styles.profileCard.borderRadius).toBe(radius);
    expect(styles.themeOption.borderRadius).toBe(radius);
  });
});

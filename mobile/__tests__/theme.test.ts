import { lightTheme } from '../src/theme/lightTheme';
import { darkTheme } from '../src/theme/darkTheme';
import { getLightStatusColors, getDarkStatusColors } from '../src/theme/tokens';
import { lightPalette, darkPalette } from '../src/theme/colors';

describe('Design System Upgrades & Themes', () => {
  describe('Light Theme and Palette Structure', () => {
    it('uses the canonical light surfaces and elevated tiers', () => {
      expect(lightTheme.colors.background).toBe(lightPalette.background);
      expect(lightTheme.colors.surfaceElevated).toBe(lightPalette.surfaceElevated);
      expect(lightTheme.colors.surfaceFloating).toBe(lightPalette.surfaceFloating);
    });

    it('uses the canonical light brand ramp', () => {
      expect(lightTheme.colors.primary).toBe(lightPalette.primary);
      expect(lightTheme.colors.primaryDark).toBe(lightPalette.primaryDark);
      expect(lightTheme.colors.primaryLight).toBe(lightPalette.primaryLight);
    });

    it('defines booking status colors', () => {
      expect(lightTheme.colors.statusPending).toBe(lightPalette.statusPending);
      expect(lightTheme.colors.statusPendingBg).toBe(lightPalette.statusPendingBg);
      expect(lightTheme.colors.statusConfirmed).toBe(lightPalette.statusConfirmed);
      expect(lightTheme.colors.statusConfirmedBg).toBe(lightPalette.statusConfirmedBg);
      expect(lightTheme.colors.statusCompleted).toBe(lightPalette.statusCompleted);
      expect(lightTheme.colors.statusCompletedBg).toBe(lightPalette.statusCompletedBg);
      expect(lightTheme.colors.statusCancelled).toBe(lightPalette.statusCancelled);
      expect(lightTheme.colors.statusCancelledBg).toBe(lightPalette.statusCancelledBg);
      expect(lightTheme.colors.statusRescheduled).toBe(lightPalette.statusRescheduled);
      expect(lightTheme.colors.statusRescheduledBg).toBe(lightPalette.statusRescheduledBg);
      expect(lightTheme.colors.statusInProgress).toBe(lightPalette.statusInProgress);
      expect(lightTheme.colors.statusInProgressBg).toBe(lightPalette.statusInProgressBg);
    });

    it('uses the canonical light gradients', () => {
      expect(lightTheme.colors.gradientPrimary).toEqual(lightPalette.gradientPrimary);
      expect(lightTheme.colors.gradientPremium).toEqual(lightPalette.gradientPremium);
      expect(lightTheme.colors.gradientHighlight).toEqual(lightPalette.gradientHighlight);
    });
  });

  describe('Dark Theme and Palette Structure', () => {
    it('uses the canonical dark surfaces and elevated tiers', () => {
      expect(darkTheme.colors.background).toBe(darkPalette.background);
      expect(darkTheme.colors.surfaceElevated).toBe(darkPalette.surfaceElevated);
      expect(darkTheme.colors.surfaceFloating).toBe(darkPalette.surfaceFloating);
    });

    it('uses the canonical dark brand ramp', () => {
      expect(darkTheme.colors.primary).toBe(darkPalette.primary);
      expect(darkTheme.colors.primaryDark).toBe(darkPalette.primaryDark);
      expect(darkTheme.colors.primaryLight).toBe(darkPalette.primaryLight);
    });

    it('defines dark booking status colors', () => {
      expect(darkTheme.colors.statusPending).toBe(darkPalette.statusPending);
      expect(darkTheme.colors.statusPendingBg).toBe(darkPalette.statusPendingBg);
      expect(darkTheme.colors.statusConfirmed).toBe(darkPalette.statusConfirmed);
      expect(darkTheme.colors.statusConfirmedBg).toBe(darkPalette.statusConfirmedBg);
      expect(darkTheme.colors.statusCompleted).toBe(darkPalette.statusCompleted);
      expect(darkTheme.colors.statusCompletedBg).toBe(darkPalette.statusCompletedBg);
      expect(darkTheme.colors.statusCancelled).toBe(darkPalette.statusCancelled);
      expect(darkTheme.colors.statusCancelledBg).toBe(darkPalette.statusCancelledBg);
      expect(darkTheme.colors.statusRescheduled).toBe(darkPalette.statusRescheduled);
      expect(darkTheme.colors.statusRescheduledBg).toBe(darkPalette.statusRescheduledBg);
      expect(darkTheme.colors.statusInProgress).toBe(darkPalette.statusInProgress);
      expect(darkTheme.colors.statusInProgressBg).toBe(darkPalette.statusInProgressBg);
    });

    it('uses the canonical dark gradients', () => {
      expect(darkTheme.colors.gradientPrimary).toEqual(darkPalette.gradientPrimary);
      expect(darkTheme.colors.gradientPremium).toEqual(darkPalette.gradientPremium);
      expect(darkTheme.colors.gradientHighlight).toEqual(darkPalette.gradientHighlight);
    });
  });

  describe('Typography Scale', () => {
    it('has the new display typography tier', () => {
      expect(lightTheme.typography.display).toBeDefined();
      expect(lightTheme.typography.display.fontSize).toBe(48);
      expect(lightTheme.typography.display.lineHeight).toBe(56);
      expect(lightTheme.typography.display.letterSpacing).toBe(-0.8);
      expect(lightTheme.typography.display.fontFamily).toBe('CormorantGaramond_700Bold');
    });

    it('has refined line heights for headings and buttons', () => {
      expect(lightTheme.typography.h1.lineHeight).toBe(44);
      expect(lightTheme.typography.h2.lineHeight).toBe(34);
      expect(lightTheme.typography.h3.lineHeight).toBe(28);
      expect(lightTheme.typography.h4.lineHeight).toBe(24);
      expect(lightTheme.typography.button.lineHeight).toBe(24);
    });
  });

  describe('Border Radius', () => {
    it('defines modernized premium border radiuses', () => {
      expect(lightTheme.borderRadius.sm).toBe(6);
      expect(lightTheme.borderRadius.md).toBe(10);
      expect(lightTheme.borderRadius.lg).toBe(16);
      expect(lightTheme.borderRadius.xl).toBe(24);
      expect(lightTheme.borderRadius.xxl).toBe(32);
      expect(lightTheme.borderRadius.pill).toBe(40);
      expect(lightTheme.borderRadius.full).toBe(999);
    });
  });

  describe('Status Color Helpers', () => {
    it('returns the expanded light booking status colors map', () => {
      const colors = getLightStatusColors();
      expect(colors.pending).toEqual({
        bg: lightPalette.statusPendingBg,
        text: lightPalette.statusPending,
      });
      expect(colors.rescheduled).toEqual({
        bg: lightPalette.statusRescheduledBg,
        text: lightPalette.statusRescheduled,
      });
      expect(colors.inProgress).toEqual({
        bg: lightPalette.statusInProgressBg,
        text: lightPalette.statusInProgress,
      });
    });

    it('returns the expanded dark booking status colors map', () => {
      const colors = getDarkStatusColors();
      expect(colors.pending).toEqual({
        bg: darkPalette.statusPendingBg,
        text: darkPalette.statusPending,
      });
      expect(colors.rescheduled).toEqual({
        bg: darkPalette.statusRescheduledBg,
        text: darkPalette.statusRescheduled,
      });
      expect(colors.inProgress).toEqual({
        bg: darkPalette.statusInProgressBg,
        text: darkPalette.statusInProgress,
      });
    });
  });
});

import { lightTheme } from '../src/theme/lightTheme';
import { darkTheme } from '../src/theme/darkTheme';
import { getLightStatusColors, getDarkStatusColors } from '../src/theme/tokens';

describe('Design System Upgrades & Themes', () => {
  describe('Light Theme and Palette Structure', () => {
    it('defines warm ivory surfaces and elevated tiers', () => {
      expect(lightTheme.colors.background).toBe('#FAF7F0');
      expect(lightTheme.colors.surfaceElevated).toBe('#FFFFFF');
      expect(lightTheme.colors.surfaceFloating).toBe('#FFFFFF');
    });

    it('defines the bronze brand ramp', () => {
      expect(lightTheme.colors.primary).toBe('#7A5C1E');
      expect(lightTheme.colors.primaryDark).toBe('#5C4515');
      expect(lightTheme.colors.primaryLight).toBe('#F6EEDA');
    });

    it('defines booking status colors', () => {
      expect(lightTheme.colors.statusPending).toBe('#8A6410');
      expect(lightTheme.colors.statusPendingBg).toBe('#F7EDD4');
      expect(lightTheme.colors.statusConfirmed).toBe('#1D5F8A');
      expect(lightTheme.colors.statusConfirmedBg).toBe('#E4EEF5');
      expect(lightTheme.colors.statusCompleted).toBe('#1B6B4C');
      expect(lightTheme.colors.statusCompletedBg).toBe('#E3F0E8');
      expect(lightTheme.colors.statusCancelled).toBe('#A32B22');
      expect(lightTheme.colors.statusCancelledBg).toBe('#F9E7E4');
      expect(lightTheme.colors.statusRescheduled).toBe('#5B4B8A');
      expect(lightTheme.colors.statusRescheduledBg).toBe('#ECE9F5');
      expect(lightTheme.colors.statusInProgress).toBe('#10656B');
      expect(lightTheme.colors.statusInProgressBg).toBe('#E1EFEF');
    });

    it('defines premium gold gradients', () => {
      expect(lightTheme.colors.gradientPrimary).toEqual(['#A88338', '#6E5417']);
      expect(lightTheme.colors.gradientPremium).toEqual(['#D9BC7B', '#A88338', '#6E5417']);
      expect(lightTheme.colors.gradientHighlight).toEqual(['#FBF5E8', '#F3E8D0']);
    });
  });

  describe('Dark Theme and Palette Structure', () => {
    it('defines obsidian surfaces and elevated tiers', () => {
      expect(darkTheme.colors.background).toBe('#0E0D0B');
      expect(darkTheme.colors.surfaceElevated).toBe('#201E19');
      expect(darkTheme.colors.surfaceFloating).toBe('#2A2721');
    });

    it('defines the champagne brand ramp', () => {
      expect(darkTheme.colors.primary).toBe('#E4C88C');
      expect(darkTheme.colors.primaryDark).toBe('#C3A768');
      // Dark-mode tints are dark surfaces so gold foregrounds stay legible.
      expect(darkTheme.colors.primaryLight).toBe('#2A2417');
    });

    it('defines dark booking status colors', () => {
      expect(darkTheme.colors.statusPending).toBe('#EFC75E');
      expect(darkTheme.colors.statusPendingBg).toBe('#2A2413');
      expect(darkTheme.colors.statusConfirmed).toBe('#8FBEDD');
      expect(darkTheme.colors.statusConfirmedBg).toBe('#16232B');
      expect(darkTheme.colors.statusCompleted).toBe('#7FD1A6');
      expect(darkTheme.colors.statusCompletedBg).toBe('#14261D');
      expect(darkTheme.colors.statusCancelled).toBe('#E8827A');
      expect(darkTheme.colors.statusCancelledBg).toBe('#2A1816');
      expect(darkTheme.colors.statusRescheduled).toBe('#AFA0D9');
      expect(darkTheme.colors.statusRescheduledBg).toBe('#1E1B2B');
      expect(darkTheme.colors.statusInProgress).toBe('#6FC7CB');
      expect(darkTheme.colors.statusInProgressBg).toBe('#12262A');
    });

    it('defines dark premium gold gradients', () => {
      expect(darkTheme.colors.gradientPrimary).toEqual(['#C0994A', '#8A6A24']);
      expect(darkTheme.colors.gradientPremium).toEqual(['#F3E5C4', '#E4C88C', '#C0994A']);
      expect(darkTheme.colors.gradientHighlight).toEqual(['#201E19', '#0E0D0B']);
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
      expect(colors.pending).toEqual({ bg: '#F7EDD4', text: '#8A6410' });
      expect(colors.rescheduled).toEqual({ bg: '#ECE9F5', text: '#5B4B8A' });
      expect(colors.inProgress).toEqual({ bg: '#E1EFEF', text: '#10656B' });
    });

    it('returns the expanded dark booking status colors map', () => {
      const colors = getDarkStatusColors();
      expect(colors.pending).toEqual({ bg: '#2A2413', text: '#EFC75E' });
      expect(colors.rescheduled).toEqual({ bg: '#1E1B2B', text: '#AFA0D9' });
      expect(colors.inProgress).toEqual({ bg: '#12262A', text: '#6FC7CB' });
    });
  });
});

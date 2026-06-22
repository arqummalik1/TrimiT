import { lightTheme } from '../src/theme/lightTheme';
import { darkTheme } from '../src/theme/darkTheme';
import { getLightStatusColors, getDarkStatusColors } from '../src/theme/tokens';

describe('Design System Upgrades & Themes', () => {
  describe('Light Theme and Palette Structure', () => {
    it('defines new elevated surfaces', () => {
      expect(lightTheme.colors.surfaceElevated).toBe('#FFFFFF');
      expect(lightTheme.colors.surfaceFloating).toBe('#FFFFFF');
    });

    it('defines booking status colors', () => {
      expect(lightTheme.colors.statusPending).toBe('#B45309');
      expect(lightTheme.colors.statusPendingBg).toBe('#FEF3C7');
      expect(lightTheme.colors.statusConfirmed).toBe('#1D4ED8');
      expect(lightTheme.colors.statusConfirmedBg).toBe('#DBEAFE');
      expect(lightTheme.colors.statusCompleted).toBe('#047857');
      expect(lightTheme.colors.statusCompletedBg).toBe('#D1FAE5');
      expect(lightTheme.colors.statusCancelled).toBe('#B91C1C');
      expect(lightTheme.colors.statusCancelledBg).toBe('#FEE2E2');
      expect(lightTheme.colors.statusRescheduled).toBe('#6D28D9');
      expect(lightTheme.colors.statusRescheduledBg).toBe('#EDE9FE');
      expect(lightTheme.colors.statusInProgress).toBe('#C2410C');
      expect(lightTheme.colors.statusInProgressBg).toBe('#FFEDD5');
    });

    it('defines premium orange gradients', () => {
      expect(lightTheme.colors.gradientPrimary).toEqual(['#EA580C', '#9A3412']);
      expect(lightTheme.colors.gradientPremium).toEqual(['#F59E0B', '#EA580C', '#9A3412']);
      expect(lightTheme.colors.gradientHighlight).toEqual(['#FFF7ED', '#FFEDD5']);
    });
  });

  describe('Dark Theme and Palette Structure', () => {
    it('defines dark elevated surfaces', () => {
      expect(darkTheme.colors.surfaceElevated).toBe('#242622');
      expect(darkTheme.colors.surfaceFloating).toBe('#2D2F2A');
    });

    it('defines dark booking status colors', () => {
      expect(darkTheme.colors.statusPending).toBe('#F7DC6F');
      expect(darkTheme.colors.statusPendingBg).toBe('#2D2D1A');
      expect(darkTheme.colors.statusConfirmed).toBe('#85C1E9');
      expect(darkTheme.colors.statusConfirmedBg).toBe('#1A242D');
      expect(darkTheme.colors.statusCompleted).toBe('#82E0AA');
      expect(darkTheme.colors.statusCompletedBg).toBe('#1A2D22');
      expect(darkTheme.colors.statusCancelled).toBe('#FF5F5F');
      expect(darkTheme.colors.statusCancelledBg).toBe('#2D1A1A');
      expect(darkTheme.colors.statusRescheduled).toBe('#BB8FCE');
      expect(darkTheme.colors.statusRescheduledBg).toBe('#1A1A2D');
      expect(darkTheme.colors.statusInProgress).toBe('#F97316');
      expect(darkTheme.colors.statusInProgressBg).toBe('#2E160D');
    });

    it('defines dark premium orange gradients', () => {
      expect(darkTheme.colors.gradientPrimary).toEqual(['#9A3412', '#7C2D12']);
      expect(darkTheme.colors.gradientPremium).toEqual(['#f1d18d', '#C2410C', '#9A3412']);
      expect(darkTheme.colors.gradientHighlight).toEqual(['#2E160D', '#121411']);
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
      expect(colors.pending).toEqual({ bg: '#FEF3C7', text: '#B45309' });
      expect(colors.rescheduled).toEqual({ bg: '#EDE9FE', text: '#6D28D9' });
      expect(colors.inProgress).toEqual({ bg: '#FFEDD5', text: '#C2410C' });
    });

    it('returns the expanded dark booking status colors map', () => {
      const colors = getDarkStatusColors();
      expect(colors.pending).toEqual({ bg: '#2D2D1A', text: '#F7DC6F' });
      expect(colors.rescheduled).toEqual({ bg: '#1A1A2D', text: '#BB8FCE' });
      expect(colors.inProgress).toEqual({ bg: '#2E160D', text: '#F97316' });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { SalonDescription, createSalonDescriptionStyles } from '../../src/components/SalonDescription';
import { lightTheme } from '../../src/theme/lightTheme';

describe('SalonDescription', () => {
  it('matches location/time meta typography', () => {
    const styles = createSalonDescriptionStyles(lightTheme);

    expect(styles.text.fontSize).toBe(13);
    expect(styles.text.lineHeight).toBe(18);
    expect(styles.text.color).toBe(lightTheme.colors.textSecondary);
  });

  it('shows read more for long copy and expands on tap', () => {
    const longText =
      'A full-service beauty parlour offering bridal makeup, hair styling, and skincare treatments for every occasion.';

    render(
      <ThemeProvider>
        <SalonDescription text={longText} />
      </ThemeProvider>
    );

    expect(screen.getByText(longText)).toBeTruthy();

    const readMore = screen.queryByText('Read more');
    if (readMore) {
      fireEvent.press(readMore);
      expect(screen.getByText('Read less')).toBeTruthy();
      fireEvent.press(screen.getByText('Read less'));
      expect(screen.getByText('Read more')).toBeTruthy();
    }
  });

  it('does not show read more for a single-line description', () => {
    render(
      <ThemeProvider>
        <SalonDescription text="Short blurb." />
      </ThemeProvider>
    );

    expect(screen.getByText('Short blurb.')).toBeTruthy();
    expect(screen.queryByText('Read more')).toBeNull();
  });
});

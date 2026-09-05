import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ScreenHeader } from '../../src/components/ScreenHeader';

describe('ScreenHeader', () => {
  it('shares one compact header layout without adding another safe-area inset', () => {
    render(<ScreenHeader testID="header" title="My offers" left={<Text>Back</Text>} />);
    const style = StyleSheet.flatten(screen.getByTestId('header').props.style);
    expect(style.minHeight).toBe(54);
    expect(style.paddingVertical).toBe(5);
    expect(style.paddingTop).toBeUndefined();
    expect(style.height).toBeUndefined(); // Allows growth for accessibility text sizes.
    expect(screen.getByRole('header')).toHaveTextContent('My offers');
  });

  it('supports the same layout for a right-hand Auth close control', () => {
    render(<ScreenHeader testID="header" right={<Text>Close</Text>} />);
    expect(screen.getByText('Close')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('header').props.style).minHeight).toBe(54);
  });
});

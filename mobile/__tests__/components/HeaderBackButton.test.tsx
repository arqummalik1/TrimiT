/**
 * Unit tests for src/components/HeaderBackButton.tsx
 *
 * The point of this component is that every customer stack screen gets the
 * SAME back affordance at the SAME accessible size, so the tests lock down the
 * 44pt touch target, the accessibility contract, and the two variants.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import {
  HeaderBackButton,
  HeaderBackButtonSpacer,
  HEADER_BUTTON_SIZE,
} from '../../src/components/HeaderBackButton';
import { lightTheme } from '../../src/theme/lightTheme';
import { darkTheme } from '../../src/theme/darkTheme';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, color }: any) => <Text testID={`icon-${name}`}>{color}</Text>,
  };
});

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

const flatStyle = (node: { props: { style: unknown } }) =>
  StyleSheet.flatten(node.props.style) as Record<string, number | string>;

describe('HeaderBackButton', () => {
  it('exposes a 44pt touch target — the iOS/Material minimum', () => {
    renderWithTheme(<HeaderBackButton onPress={jest.fn()} />);
    const style = flatStyle(screen.getByTestId('header-back-button'));

    expect(HEADER_BUTTON_SIZE).toBe(44);
    expect(style.width).toBe(44);
    expect(style.height).toBe(44);
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    renderWithTheme(<HeaderBackButton onPress={onPress} />);
    fireEvent.press(screen.getByTestId('header-back-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is announced as a button labelled "Go back" by default', () => {
    renderWithTheme(<HeaderBackButton onPress={jest.fn()} />);
    const button = screen.getByTestId('header-back-button');

    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Go back');
  });

  it('accepts a custom accessibility label', () => {
    renderWithTheme(
      <HeaderBackButton onPress={jest.fn()} accessibilityLabel="Back to salon" />,
    );
    expect(
      screen.getByTestId('header-back-button').props.accessibilityLabel,
    ).toBe('Back to salon');
  });

  it('renders the arrow-back icon', () => {
    renderWithTheme(<HeaderBackButton onPress={jest.fn()} />);
    expect(screen.getByTestId('icon-arrow-back')).toBeTruthy();
  });

  // ── Variants ──────────────────────────────────────────────────────────────
  it('plain variant has no background so it blends into a header row', () => {
    renderWithTheme(<HeaderBackButton onPress={jest.fn()} />);
    expect(
      flatStyle(screen.getByTestId('header-back-button')).backgroundColor,
    ).toBeUndefined();
  });

  it('overlay variant scrims itself so it stays legible on a hero image', () => {
    renderWithTheme(<HeaderBackButton variant="overlay" onPress={jest.fn()} />);
    expect(
      flatStyle(screen.getByTestId('header-back-button')).backgroundColor,
    ).toBe(lightTheme.colors.overlay);
  });

  it('overlay variant uses a white arrow regardless of theme', () => {
    renderWithTheme(<HeaderBackButton variant="overlay" onPress={jest.fn()} />);
    expect(screen.getByTestId('icon-arrow-back').props.children).toBe(
      lightTheme.colors.white,
    );
  });

  it('plain variant tints the arrow with the theme text colour', () => {
    renderWithTheme(<HeaderBackButton onPress={jest.fn()} />);
    const color = screen.getByTestId('icon-arrow-back').props.children;

    expect(color).toBe(lightTheme.colors.text);
    expect(color).not.toBe(darkTheme.colors.text);
  });

  it('merges a caller-supplied style over the base style', () => {
    renderWithTheme(
      <HeaderBackButton onPress={jest.fn()} style={{ marginLeft: 16 }} />,
    );
    const style = flatStyle(screen.getByTestId('header-back-button'));

    expect(style.marginLeft).toBe(16);
    expect(style.width).toBe(44);
  });
});

describe('HeaderBackButtonSpacer', () => {
  it('reserves exactly the button footprint so titles stay centred', () => {
    const { toJSON } = renderWithTheme(<HeaderBackButtonSpacer />);
    const style = StyleSheet.flatten((toJSON() as any).props.style);

    expect(style.width).toBe(HEADER_BUTTON_SIZE);
    expect(style.height).toBe(HEADER_BUTTON_SIZE);
  });
});

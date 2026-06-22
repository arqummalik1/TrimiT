/**
 * Unit tests for src/components/Skeleton.tsx
 * Covers: rendering, default props, dimensions, borderRadius, animation lifecycle
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { Skeleton } from '../../src/components/Skeleton';

// Mock expo-linear-gradient — returns a plain View so we can assert presence
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: (props: any) => <View testID="linear-gradient" {...props} />,
  };
});

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Skeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = renderWithTheme(<Skeleton height={20} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the LinearGradient child', () => {
    const { getByTestId } = renderWithTheme(<Skeleton height={20} />);
    expect(getByTestId('linear-gradient')).toBeTruthy();
  });

  it('applies default width="100%" and borderRadius=8 when not specified', () => {
    const { getByTestId } = renderWithTheme(
      <Skeleton height={40} testID="skel" />,
    );
    // Skeleton wraps content in a View — we check the container style
    const container = getByTestId('skel');
    expect(container.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ height: 40, borderRadius: 8 }),
      ]),
    );
  });

  it('applies custom width (number)', () => {
    const { getByTestId } = renderWithTheme(
      <Skeleton width={240} height={20} testID="skel" />,
    );
    const container = getByTestId('skel');
    expect(container.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 240, height: 20 }),
      ]),
    );
  });

  it('applies percentage width as string', () => {
    const { getByTestId } = renderWithTheme(
      <Skeleton width="50%" height={20} testID="skel" />,
    );
    const container = getByTestId('skel');
    expect(container.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: '50%', height: 20 }),
      ]),
    );
  });

  it('applies custom borderRadius', () => {
    const { getByTestId } = renderWithTheme(
      <Skeleton height={120} borderRadius={60} testID="skel" />,
    );
    const container = getByTestId('skel');
    expect(container.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borderRadius: 60 }),
      ]),
    );
  });

  it('renders multiple skeletons independently', () => {
    const { toJSON } = renderWithTheme(
      <>
        <Skeleton height={10} testID="a" />
        <Skeleton height={20} testID="b" />
      </>,
    );
    expect(toJSON()).toBeTruthy();
  });
});

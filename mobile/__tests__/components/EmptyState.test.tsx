/**
 * Unit tests for src/components/EmptyState.tsx
 * Covers: title/message/action rendering, compact variant, action press
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { EmptyState } from '../../src/components/EmptyState';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
  };
});

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('EmptyState', () => {
  const baseProps = {
    icon: 'calendar-outline' as const,
    title: 'No Bookings Yet',
  };

  it('renders the title', () => {
    renderWithTheme(<EmptyState {...baseProps} />);
    expect(screen.getByText('No Bookings Yet')).toBeTruthy();
  });

  it('renders the icon', () => {
    renderWithTheme(<EmptyState {...baseProps} />);
    expect(screen.getByText('calendar-outline')).toBeTruthy();
  });

  it('renders message when provided', () => {
    renderWithTheme(
      <EmptyState {...baseProps} message="Book your first appointment" />,
    );
    expect(screen.getByText('Book your first appointment')).toBeTruthy();
  });

  it('does not render message when not provided', () => {
    renderWithTheme(<EmptyState {...baseProps} />);
    expect(screen.queryByText('Book your first appointment')).toBeNull();
  });

  it('renders action button label when provided', () => {
    renderWithTheme(
      <EmptyState
        {...baseProps}
        action={{ label: 'Discover Salons', onPress: jest.fn() }}
      />,
    );
    expect(screen.getByText('Discover Salons')).toBeTruthy();
  });

  it('fires action.onPress when button is tapped', () => {
    const onPress = jest.fn();
    renderWithTheme(
      <EmptyState {...baseProps} action={{ label: 'Discover', onPress }} />,
    );
    fireEvent.press(screen.getByText('Discover'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when not provided', () => {
    renderWithTheme(<EmptyState {...baseProps} />);
    expect(screen.queryByText('Discover Salons')).toBeNull();
  });

  it('renders in compact variant without throwing', () => {
    renderWithTheme(<EmptyState {...baseProps} compact message="compact mode" />);
    expect(screen.getByText('No Bookings Yet')).toBeTruthy();
    expect(screen.getByText('compact mode')).toBeTruthy();
  });

  it('renders with all props combined', () => {
    renderWithTheme(
      <EmptyState
        icon="storefront-outline"
        title="No Salon"
        message="Create one"
        action={{ label: 'Add Salon', onPress: jest.fn() }}
        compact
      />,
    );
    expect(screen.getByText('No Salon')).toBeTruthy();
    expect(screen.getByText('Create one')).toBeTruthy();
    expect(screen.getByText('Add Salon')).toBeTruthy();
    expect(screen.getByText('storefront-outline')).toBeTruthy();
  });
});

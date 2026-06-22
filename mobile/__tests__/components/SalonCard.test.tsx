/**
 * Unit tests for src/components/SalonCard.tsx
 * Covers: rendering, rating badge, distance badge, hours, lowest price,
 *         press handler, inactive subscription overlay
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { SalonCard } from '../../src/components/SalonCard';
import type { Salon } from '../../src/types';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
  };
});

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: any) => <View testID="expo-image" {...props} />,
  };
});

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

const baseSalon: Salon = {
  id: 'salon-1',
  name: 'Trimit Salon',
  address: '123 MG Road',
  city: 'Delhi',
  phone: '9876543210',
  latitude: 28.6139,
  longitude: 77.209,
  opening_time: '09:00',
  closing_time: '21:00',
  images: ['https://example.com/salon.jpg'],
  image_url: 'https://example.com/salon.jpg',
} as unknown as Salon;

describe('SalonCard', () => {
  it('renders the salon name', () => {
    renderWithTheme(<SalonCard salon={baseSalon} onPress={jest.fn()} />);
    expect(screen.getByText('Trimit Salon')).toBeTruthy();
  });

  it('renders the address with city', () => {
    renderWithTheme(<SalonCard salon={baseSalon} onPress={jest.fn()} />);
    expect(screen.getByText('123 MG Road, Delhi')).toBeTruthy();
  });

  it('renders opening and closing hours', () => {
    renderWithTheme(<SalonCard salon={baseSalon} onPress={jest.fn()} />);
    expect(screen.getByText('09:00 - 21:00')).toBeTruthy();
  });

  it('renders the salon image', () => {
    renderWithTheme(<SalonCard salon={baseSalon} onPress={jest.fn()} />);
    expect(screen.getByTestId('expo-image')).toBeTruthy();
  });

  it('fires onPress when card is tapped', () => {
    const onPress = jest.fn();
    renderWithTheme(<SalonCard salon={baseSalon} onPress={onPress} />);
    fireEvent.press(screen.getByText('Trimit Salon'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // ─── Rating badge ─────────────────────────────────────────────────────────
  it('renders rating badge when avg_rating > 0', () => {
    renderWithTheme(
      <SalonCard salon={{ ...baseSalon, avg_rating: 4.5 } as Salon} onPress={jest.fn()} />,
    );
    expect(screen.getByText('4.5')).toBeTruthy();
  });

  it('does not render rating badge when avg_rating is 0 or null', () => {
    renderWithTheme(<SalonCard salon={baseSalon} onPress={jest.fn()} />);
    // No rating number text node
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.queryByText('4.5')).toBeNull();
  });

  // ─── Distance badge ───────────────────────────────────────────────────────
  it('renders distance badge when distance is a number', () => {
    renderWithTheme(
      <SalonCard salon={{ ...baseSalon, distance: 5.2 } as Salon} onPress={jest.fn()} />,
    );
    expect(screen.getByText('5.2 km')).toBeTruthy();
  });

  it('does not render distance badge when distance is not a number', () => {
    renderWithTheme(<SalonCard salon={baseSalon} onPress={jest.fn()} />);
    expect(screen.queryByText(/km/)).toBeNull();
  });

  it('does not render distance badge when distance is NaN', () => {
    renderWithTheme(
      <SalonCard salon={{ ...baseSalon, distance: NaN } as Salon} onPress={jest.fn()} />,
    );
    expect(screen.queryByText(/km/)).toBeNull();
  });

  // ─── Lowest price from services ───────────────────────────────────────────
  it('renders "From ₹X" when salon has services with prices', () => {
    const salon = {
      ...baseSalon,
      services: [
        { price: 300 },
        { price: 150 },
        { price: 500 },
      ],
    } as unknown as Salon;
    renderWithTheme(<SalonCard salon={salon} onPress={jest.fn()} />);
    expect(screen.getByText('From ₹150')).toBeTruthy();
  });

  it('does not render "From" text when salon has no services', () => {
    renderWithTheme(<SalonCard salon={baseSalon} onPress={jest.fn()} />);
    expect(screen.queryByText(/From/)).toBeNull();
  });

  it('does not render "From" text when services array is empty', () => {
    const salon = { ...baseSalon, services: [] } as unknown as Salon;
    renderWithTheme(<SalonCard salon={salon} onPress={jest.fn()} />);
    expect(screen.queryByText(/From/)).toBeNull();
  });

  // ─── Inactive subscription overlay ────────────────────────────────────────
  it('renders "Not taking bookings" overlay when subscription_active=false', () => {
    renderWithTheme(
      <SalonCard
        salon={{ ...baseSalon, subscription_active: false } as Salon}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('Not taking bookings')).toBeTruthy();
  });

  it('does not render overlay when subscription_active=true', () => {
    renderWithTheme(
      <SalonCard
        salon={{ ...baseSalon, subscription_active: true } as Salon}
        onPress={jest.fn()}
      />,
    );
    expect(screen.queryByText('Not taking bookings')).toBeNull();
  });

  it('still fires onPress even when salon is inactive (frozen, not hidden)', () => {
    const onPress = jest.fn();
    renderWithTheme(
      <SalonCard
        salon={{ ...baseSalon, subscription_active: false } as Salon}
        onPress={onPress}
      />,
    );
    fireEvent.press(screen.getByText('Trimit Salon'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

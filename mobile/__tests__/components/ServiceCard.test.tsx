/**
 * Unit tests for src/components/ServiceCard.tsx
 * Covers: owner & customer variants, offer/popular badges, price rendering,
 *         press handlers (onPress/onEdit/onDelete), accessibility label
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { ServiceCard } from '../../src/components/ServiceCard';
import type { Service } from '../../src/types';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
  };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: (props: any) => <View testID="gradient" {...props} />,
  };
});

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

const baseService: Service = {
  id: 'svc-1',
  salon_id: 'salon-1',
  name: 'Haircut',
  price: 200,
  duration: 30,
  is_on_offer: false,
} as Service;

describe('ServiceCard', () => {
  // ─── Common rendering ─────────────────────────────────────────────────────
  it('renders the service name', () => {
    renderWithTheme(<ServiceCard service={baseService} variant="customer" />);
    expect(screen.getByText('Haircut')).toBeTruthy();
  });

  it('renders the formatted price', () => {
    renderWithTheme(<ServiceCard service={baseService} variant="customer" />);
    expect(screen.getByText('₹200')).toBeTruthy();
  });

  it('renders the duration pill on the thumbnail', () => {
    renderWithTheme(<ServiceCard service={baseService} variant="customer" />);
    expect(screen.getByText('30 min')).toBeTruthy();
  });

  it('renders description when provided', () => {
    renderWithTheme(
      <ServiceCard
        service={{ ...baseService, description: 'Premium cut' }}
        variant="customer"
      />,
    );
    expect(screen.getByText('Premium cut')).toBeTruthy();
  });

  it('does not render description text when absent', () => {
    renderWithTheme(<ServiceCard service={baseService} variant="customer" />);
    // No description node — only name, price, duration
    expect(screen.queryByText('Premium cut')).toBeNull();
  });

  // ─── Accessibility label ──────────────────────────────────────────────────
  it('has an accessibility label containing name, price, and duration', () => {
    renderWithTheme(<ServiceCard service={baseService} variant="customer" />);
    expect(
      screen.getByLabelText('Haircut, ₹200, 30 minutes'),
    ).toBeTruthy();
  });

  // ─── Customer variant ─────────────────────────────────────────────────────
  it('shows "Book" CTA in customer variant when onPress provided', () => {
    renderWithTheme(
      <ServiceCard service={baseService} variant="customer" onPress={jest.fn()} />,
    );
    expect(screen.getByText('Book')).toBeTruthy();
  });

  it('fires onPress when card is tapped (customer)', () => {
    const onPress = jest.fn();
    renderWithTheme(
      <ServiceCard service={baseService} variant="customer" onPress={onPress} />,
    );
    fireEvent.press(screen.getByLabelText('Haircut, ₹200, 30 minutes'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render "Book" CTA when no onPress provided', () => {
    renderWithTheme(<ServiceCard service={baseService} variant="customer" />);
    expect(screen.queryByText('Book')).toBeNull();
  });

  // ─── Owner variant ────────────────────────────────────────────────────────
  it('renders edit and delete action buttons in owner variant', () => {
    renderWithTheme(
      <ServiceCard
        service={baseService}
        variant="owner"
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Edit service')).toBeTruthy();
    expect(screen.getByLabelText('Delete service')).toBeTruthy();
  });

  it('does not render "Book" CTA in owner variant', () => {
    renderWithTheme(
      <ServiceCard service={baseService} variant="owner" onPress={jest.fn()} />,
    );
    expect(screen.queryByText('Book')).toBeNull();
  });

  it('fires onEdit when edit action tapped', () => {
    const onEdit = jest.fn();
    renderWithTheme(
      <ServiceCard service={baseService} variant="owner" onEdit={onEdit} />,
    );
    fireEvent.press(screen.getByLabelText('Edit service'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('fires onDelete when delete action tapped', () => {
    const onDelete = jest.fn();
    renderWithTheme(
      <ServiceCard service={baseService} variant="owner" onDelete={onDelete} />,
    );
    fireEvent.press(screen.getByLabelText('Delete service'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  // ─── Offer badge ──────────────────────────────────────────────────────────
  it('shows offer badge when is_on_offer=true with discount_percentage > 0', () => {
    renderWithTheme(
      <ServiceCard
        service={{ ...baseService, is_on_offer: true, discount_percentage: 20 }}
        variant="customer"
      />,
    );
    expect(screen.getByText('20% OFF')).toBeTruthy();
  });

  it('does not show offer badge when is_on_offer=false', () => {
    renderWithTheme(
      <ServiceCard
        service={{ ...baseService, is_on_offer: false, discount_percentage: 20 }}
        variant="customer"
      />,
    );
    expect(screen.queryByText('20% OFF')).toBeNull();
  });

  it('does not show offer badge when discount_percentage is 0', () => {
    renderWithTheme(
      <ServiceCard
        service={{ ...baseService, is_on_offer: true, discount_percentage: 0 }}
        variant="customer"
      />,
    );
    expect(screen.queryByText('0% OFF')).toBeNull();
  });

  it('shows strike-through original_price when on offer', () => {
    renderWithTheme(
      <ServiceCard
        service={{
          ...baseService,
          is_on_offer: true,
          discount_percentage: 25,
          original_price: 250,
          price: 188,
        }}
        variant="customer"
      />,
    );
    expect(screen.getByText('₹250')).toBeTruthy();
    expect(screen.getByText('₹188')).toBeTruthy();
  });

  // ─── Popular badge ────────────────────────────────────────────────────────
  it('shows popular badge when isPopular=true', () => {
    renderWithTheme(
      <ServiceCard service={baseService} variant="customer" isPopular />,
    );
    expect(screen.getByText(/Popular/)).toBeTruthy();
  });

  it('does not show popular badge when isPopular=false (default)', () => {
    renderWithTheme(<ServiceCard service={baseService} variant="customer" />);
    expect(screen.queryByText(/Popular/)).toBeNull();
  });
});

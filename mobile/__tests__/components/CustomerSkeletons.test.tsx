/**
 * Unit tests for customer-flow skeleton placeholders.
 * Locks the testIDs screens assert on while loading, plus default counts.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { SlotGridSkeleton } from '../../src/components/skeletons/SlotGridSkeleton';
import { SalonDetailSkeleton } from '../../src/components/skeletons/SalonDetailSkeleton';
import { ServiceDetailSkeleton } from '../../src/components/skeletons/ServiceDetailSkeleton';
import { OfferListSkeleton } from '../../src/components/skeletons/OfferListSkeleton';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: (props: any) => <View testID="linear-gradient" {...props} />,
  };
});

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('SlotGridSkeleton', () => {
  it('renders the slot-grid-skeleton root', () => {
    renderWithTheme(<SlotGridSkeleton />);
    expect(screen.getByTestId('slot-grid-skeleton')).toBeTruthy();
  });

  it('defaults to 9 shimmer pills', () => {
    renderWithTheme(<SlotGridSkeleton />);
    expect(screen.getAllByTestId('linear-gradient')).toHaveLength(9);
  });

  it('respects a custom count', () => {
    renderWithTheme(<SlotGridSkeleton count={4} />);
    expect(screen.getAllByTestId('linear-gradient')).toHaveLength(4);
  });
});

describe('SalonDetailSkeleton', () => {
  it('renders the salon-detail-skeleton root', () => {
    renderWithTheme(<SalonDetailSkeleton />);
    expect(screen.getByTestId('salon-detail-skeleton')).toBeTruthy();
  });

  it('includes a hero shimmer plus content rows', () => {
    renderWithTheme(<SalonDetailSkeleton />);
    // hero + rating + title + 2 info + map + heading + 3 service cards = at least 8
    expect(screen.getAllByTestId('linear-gradient').length).toBeGreaterThanOrEqual(8);
  });
});

describe('ServiceDetailSkeleton', () => {
  it('renders the service-detail-skeleton root', () => {
    renderWithTheme(<ServiceDetailSkeleton />);
    expect(screen.getByTestId('service-detail-skeleton')).toBeTruthy();
  });

  it('includes a hero shimmer plus meta/body rows', () => {
    renderWithTheme(<ServiceDetailSkeleton />);
    expect(screen.getAllByTestId('linear-gradient').length).toBeGreaterThanOrEqual(6);
  });
});

describe('OfferListSkeleton', () => {
  it('renders the offer-list-skeleton root', () => {
    renderWithTheme(<OfferListSkeleton />);
    expect(screen.getByTestId('offer-list-skeleton')).toBeTruthy();
  });

  it('defaults to 3 coupon cards (value stub + 3 lines each)', () => {
    renderWithTheme(<OfferListSkeleton />);
    // 3 cards × 4 skeletons = 12
    expect(screen.getAllByTestId('linear-gradient')).toHaveLength(12);
  });

  it('respects a custom count', () => {
    renderWithTheme(<OfferListSkeleton count={1} />);
    expect(screen.getAllByTestId('linear-gradient')).toHaveLength(4);
  });
});

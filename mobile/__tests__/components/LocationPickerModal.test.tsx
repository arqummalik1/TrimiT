import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import LocationPickerModal from '../../src/components/LocationPickerModal';
import { Alert } from 'react-native';

// Mock the native maps to avoid native dependencies
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID="map-view" {...props} />,
    Marker: (props: any) => <View testID="map-marker" {...props} />,
    Callout: (props: any) => <View testID="map-callout" {...props} />,
  };
});

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, testID }: any) => <Text testID={testID || 'icon'}>{name}</Text>,
  };
});

// Mock expo-location
jest.mock('expo-location', () => ({
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 30.0, longitude: 80.0 },
  }),
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  geocodeAsync: jest.fn().mockResolvedValue([
    { latitude: 31.0, longitude: 81.0 },
  ]),
}));

// Mock Maps lib for reverse geocoding
jest.mock('../../src/lib/maps', () => {
  const actualMaps = jest.requireActual('../../src/lib/maps');
  return {
    ...actualMaps,
    buildLocationPickerRegion: actualMaps.buildLocationPickerRegion,
    reverseGeocodeLocation: jest.fn().mockResolvedValue({
      formattedAddress: '123 Mock St',
      city: 'Mock City',
      country: 'Mock Country',
      postalCode: '12345',
    }),
  };
});

describe('LocationPickerModal', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const defaultProps = {
    visible: true,
    initialCoordinates: { latitude: 28.6139, longitude: 77.2090 },
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    onDismiss: jest.fn(),
  };

  const metrics = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
  };

  const renderComponent = (props = {}) => {
    return render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <LocationPickerModal {...defaultProps} {...props} />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  };

  it('renders modal with dismissable hint banner on open', () => {
    renderComponent();
    
    // Hint text should be visible initially
    expect(screen.getByText(/Tap anywhere on the map to pin your salon's exact location/i)).toBeTruthy();
  });

  it('dismisses the hint banner when close button is pressed', async () => {
    renderComponent();
    
    const dismissBtn = screen.getByLabelText('Dismiss hint');
    expect(dismissBtn).toBeTruthy();

    await act(async () => {
      fireEvent.press(dismissBtn);
    });

    // Hint text should be removed
    expect(screen.queryByText(/Tap anywhere on the map to pin your salon/i)).toBeNull();
  });

  it('resets hint banner visibility when modal re-opens', async () => {
    const { rerender } = renderComponent();
    
    // Dismiss it
    const dismissBtn = screen.getByLabelText('Dismiss hint');
    await act(async () => {
      fireEvent.press(dismissBtn);
    });
    expect(screen.queryByText(/Tap anywhere on the map to pin your salon/i)).toBeNull();

    // Close modal
    rerender(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <LocationPickerModal {...defaultProps} visible={false} />
        </ThemeProvider>
      </SafeAreaProvider>
    );

    // Open modal again
    rerender(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <LocationPickerModal {...defaultProps} visible={true} />
        </ThemeProvider>
      </SafeAreaProvider>
    );

    // Banner should be back
    expect(screen.getByText(/Tap anywhere on the map to pin your salon's exact location/i)).toBeTruthy();
  });

  it('calls onConfirm with selected coordinates when Confirm button is pressed', async () => {
    renderComponent();
    
    const confirmBtn = screen.getByText('Confirm Location');
    await act(async () => {
      fireEvent.press(confirmBtn);
    });

    // Should call onConfirm with the initial coordinates since we haven't moved the pin
    expect(mockOnConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 28.6139,
        longitude: 77.2090,
      })
    );
  });
});

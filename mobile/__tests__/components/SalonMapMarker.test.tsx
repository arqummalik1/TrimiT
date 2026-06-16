import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { SalonMapMarker } from '../../src/components/SalonMapMarker';
import { Animated } from 'react-native';

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID="map-view" {...props} />,
    Marker: (props: any) => <View testID="map-marker" {...props} />,
    Callout: (props: any) => <View testID="map-callout" {...props} />,
  };
});

describe('SalonMapMarker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const defaultProps = {
    coordinate: { latitude: 28.6139, longitude: 77.2090 },
    onPress: jest.fn(),
  };

  const renderComponent = (props = {}) => {
    return render(
      <ThemeProvider>
        <SalonMapMarker {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  it('renders native marker with correct pinColor for unselected state', () => {
    renderComponent({ selected: false });
    
    const marker = screen.getByTestId('map-marker');
    expect(marker).toBeTruthy();
    // Default bright red pinColor
    expect(marker.props.pinColor).toBe('#EF4444');
  });

  it('sets tracksViewChanges correctly based on prop', () => {
    renderComponent({ trackViewChanges: true });
    
    const marker = screen.getByTestId('map-marker');
    expect(marker.props.tracksViewChanges).toBe(true);
  });

  it('auto-flips tracksViewChanges to false after 500ms if not explicitly provided', () => {
    renderComponent();
    
    let marker = screen.getByTestId('map-marker');
    // Starts as true to capture first render
    expect(marker.props.tracksViewChanges).toBe(true);
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Updates to false to save performance
    marker = screen.getByTestId('map-marker');
    expect(marker.props.tracksViewChanges).toBe(false);
  });

  it('renders callout when showCallout is true and label is provided', () => {
    renderComponent({ showCallout: true, label: 'Test Salon' });
    
    const callout = screen.getByTestId('map-callout');
    expect(callout).toBeTruthy();
    
    // Should show the label text
    expect(screen.getByText('Test Salon')).toBeTruthy();
  });

  it('hides callout when showCallout is false', () => {
    renderComponent({ showCallout: false, label: 'Test Salon' });
    
    const callout = screen.queryByTestId('map-callout');
    expect(callout).toBeNull();
  });

});

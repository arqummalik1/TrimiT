import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { SalonMapMarker } from '../../src/components/SalonMapMarker';
import { lightTheme } from '../../src/theme/lightTheme';
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

// Mock Ionicons so we can read the pin color the component applies.
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, color }: any) => <Text testID={`icon-${name}`}>{color}</Text>,
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

  it('renders the custom location pin in the theme primary color when unselected', () => {
    renderComponent({ selected: false });

    const marker = screen.getByTestId('map-marker');
    expect(marker).toBeTruthy();
    // The marker uses a custom Ionicons pin (not the native pinColor prop) by
    // design — see component header. The pin color is theme-driven (dynamic):
    // unselected = primary so re-branding updates it automatically.
    const pin = screen.getByTestId('icon-location-sharp');
    expect(pin).toHaveTextContent(lightTheme.colors.primary);
  });

  it('renders the pin in the darker brand shade when selected', () => {
    renderComponent({ selected: true });
    const pin = screen.getByTestId('icon-location-sharp');
    expect(pin).toHaveTextContent(lightTheme.colors.primaryDark);
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

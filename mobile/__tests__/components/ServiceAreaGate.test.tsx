import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ServiceAreaGate } from '../../src/components/ServiceAreaGate';
import { TAB_BAR_BASE_HEIGHT } from '../../src/components/ScreenWrapper';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import type { ServiceabilityResult } from '../../src/types';

const OUT_OF_AREA: ServiceabilityResult = {
  serviceable: false,
  reason: 'out_of_area',
  matched_area: null,
  active_areas: ['Jammu'],
  nearest_area: { name: 'Jammu', slug: 'jammu', launching_soon: false },
  nearest_distance_km: 120,
};

function renderGate() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <ThemeProvider>
        <ServiceAreaGate result={OUT_OF_AREA} coords={{ lat: 28.6, lng: 77.2 }} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('ServiceAreaGate', () => {
  it('renders waitlist CTA and pads scroll content above the tab bar', () => {
    const { getByText, getByTestId } = renderGate();
    expect(getByText('Notify me at launch')).toBeTruthy();

    const scroll = getByTestId('service-area-gate-scroll');
    const flat = Array.isArray(scroll.props.contentContainerStyle)
      ? Object.assign({}, ...scroll.props.contentContainerStyle)
      : scroll.props.contentContainerStyle;
    expect(flat.paddingBottom).toBeGreaterThanOrEqual(TAB_BAR_BASE_HEIGHT + 34);
  });
});

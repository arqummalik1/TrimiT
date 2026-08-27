import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { lightTheme } from '../../src/theme/lightTheme';
import OnboardingScreen from '../../src/screens/auth/OnboardingScreen';

const mockCompleteOnboarding = jest.fn();

jest.mock('@expo/vector-icons', () => {
  const ReactLibrary = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, color }: { name: string; color: string }) => ReactLibrary.createElement(
      Text,
      { testID: `ionicon-${name}`, style: { color } },
      name,
    ),
  };
});

jest.mock('../../src/store/authStore', () => ({
  useAuthStore: (selector: (state: { completeOnboarding: typeof mockCompleteOnboarding }) => unknown) =>
    selector({ completeOnboarding: mockCompleteOnboarding }),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('OnboardingScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('leads with the time-saving promise rather than account creation', () => {
    render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <OnboardingScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByText('TIME, WELL SPENT')).toBeTruthy();
    expect(screen.getByText('Less waiting. More living.')).toBeTruthy();
    expect(screen.getByText('Plan ahead and keep your day moving.')).toBeTruthy();
    expect(screen.getByText('No sign-in required to explore')).toBeTruthy();
    expect(screen.getByTestId('onboarding-page-indicator').children).toHaveLength(3);
  });

  it('gives booking and salon choice their own visual scenes', () => {
    render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <OnboardingScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('onboarding-booking-scene')).toBeTruthy();
    expect(screen.getByTestId('onboarding-choices-scene')).toBeTruthy();
    expect(screen.getByText('Plan it. Book it.')).toBeTruthy();
    expect(screen.getByText('Explore salons & beauty parlours.')).toBeTruthy();
    expect(screen.getByText('Compare services, prices, reviews, and available slots.')).toBeTruthy();
    expect(screen.getByText('Beauty\nparlours')).toBeTruthy();
    expect(screen.getByText('Services · prices · reviews')).toBeTruthy();
    expect(screen.getByTestId('ionicon-sparkles-outline').props.style.color).toBe(lightTheme.colors.primary);
  });

  it('flips the time card when the guest taps it', () => {
    render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <OnboardingScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    const timeCard = screen.getByTestId('onboarding-time-card');
    expect(timeCard.props.accessibilityState).toEqual({ expanded: false });
    expect(screen.getByText('Tap to see how')).toBeTruthy();

    fireEvent.press(timeCard);

    expect(timeCard.props.accessibilityState).toEqual({ expanded: true });
    expect(screen.getByText('Tap to flip back')).toBeTruthy();
  });

  it('allows the introduction to be skipped directly into discovery', () => {
    render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <OnboardingScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    fireEvent.press(screen.getByText('Skip'));
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';

const mockCompleteOnboarding = jest.fn();
const mockImpactAsync = jest.fn(() => Promise.resolve());
const mockSelectionAsync = jest.fn(() => Promise.resolve());

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light' },
  impactAsync: mockImpactAsync,
  selectionAsync: mockSelectionAsync,
}));

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

const OnboardingScreen = require('../../src/screens/auth/OnboardingScreen').default;

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const narrowMetrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 36, left: 0, right: 0, bottom: 24 },
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
    expect(screen.getByText('TIME, BEAUTIFULLY YOURS')).toBeTruthy();
    expect(screen.getByText('Less waiting.\nMore living.')).toBeTruthy();
    expect(screen.getByText('Plan before you go—and\nkeep the rest of your day yours.')).toBeTruthy();
    expect(screen.getByTestId('onboarding-minute-hand')).toBeTruthy();
    expect(screen.getByTestId('onboarding-page-indicator').children).toHaveLength(3);
    expect(screen.getByTestId('onboarding-page-indicator').props.accessibilityValue).toEqual({
      min: 1,
      max: 3,
      now: 1,
    });
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
    expect(screen.getByText('Your time.\nYour choice.')).toBeTruthy();
    expect(screen.getByText('Find the place\nthat feels right.')).toBeTruthy();
    expect(screen.getByText('Compare services, prices, reviews,\nand availability—all in one place.')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-discovery-path-wrap')).toBeNull();
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
    expect(screen.getByText('Tap')).toBeTruthy();

    fireEvent.press(timeCard);

    expect(timeCard.props.accessibilityState).toEqual({ expanded: true });
    expect(screen.getByTestId('onboarding-time-back-content')).toBeTruthy();
    expect(screen.getByText('YOUR TIME, PROTECTED')).toBeTruthy();
    expect(screen.getByText('Ready when\nyou are.')).toBeTruthy();
    expect(screen.getByText('A smoother visit, timed around you.')).toBeTruthy();
    expect(screen.getByText('Find your place')).toBeTruthy();
    expect(screen.getByText('Choose your slot')).toBeTruthy();
    expect(screen.getByText('Arrive on cue')).toBeTruthy();
    expect(screen.getByText('Tap to return')).toBeTruthy();
    expect(mockImpactAsync).toHaveBeenCalledWith('light');
  });

  it('makes the calendar and discovery compositions tactile demonstrations', () => {
    render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <OnboardingScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    fireEvent.press(screen.getByTestId('onboarding-date-24'));
    expect(screen.getByTestId('onboarding-date-24').props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(screen.getByTestId('onboarding-time-10:30'));
    expect(screen.getByTestId('onboarding-time-10:30').props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(screen.getByTestId('onboarding-choice-0'));
    expect(screen.getByTestId('onboarding-choice-0').props.accessibilityState).toEqual({ selected: true });
    expect(mockSelectionAsync).toHaveBeenCalledTimes(3);
  });

  it('keeps every discovery doorway available on a narrow phone width', () => {
    render(
      <SafeAreaProvider initialMetrics={narrowMetrics}>
        <ThemeProvider>
          <OnboardingScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('onboarding-choice-0')).toBeTruthy();
    expect(screen.getByTestId('onboarding-choice-1')).toBeTruthy();
    expect(screen.getByTestId('onboarding-choice-2')).toBeTruthy();
  });

  it('advances through all three steps and completes from the final editorial CTA', () => {
    render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <OnboardingScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    fireEvent.press(screen.getByTestId('onboarding-primary-action'));
    expect(screen.getByTestId('onboarding-page-indicator').props.accessibilityValue.now).toBe(2);

    fireEvent.press(screen.getByTestId('onboarding-primary-action'));
    expect(screen.getByTestId('onboarding-page-indicator').props.accessibilityValue.now).toBe(3);
    expect(screen.getByText('Explore salons')).toBeTruthy();

    fireEvent.press(screen.getByTestId('onboarding-primary-action'));
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
  });

  it('starts from the first screen again whenever the introduction remounts', () => {
    const renderIntroduction = () => render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <OnboardingScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    const firstRun = renderIntroduction();
    fireEvent.press(screen.getByTestId('onboarding-primary-action'));
    fireEvent.press(screen.getByTestId('onboarding-primary-action'));
    expect(screen.getByTestId('onboarding-page-indicator').props.accessibilityValue.now).toBe(3);
    firstRun.unmount();

    renderIntroduction();
    expect(screen.getByTestId('onboarding-page-indicator').props.accessibilityValue.now).toBe(1);
    expect(screen.getByText('Less waiting.\nMore living.')).toBeTruthy();
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

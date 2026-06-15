/**
 * Tests for the generic LegalScreen (title + back button + MarkdownView body).
 * MarkdownView is pure (parses the content string into Text blocks), so we let
 * it render for real and assert the title + a heading parsed from the content.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { LegalScreen } from '../../src/screens/legal/LegalScreen';

const metrics = initialWindowMetrics ?? {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen(navigation: any) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <LegalScreen
          navigation={navigation}
          title="Some Policy"
          content={'# Heading One\n\nA paragraph of body text.\n\n- a bullet'}
        />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

it('renders the provided title', () => {
  renderScreen({ goBack: jest.fn() });
  expect(screen.getByText('Some Policy')).toBeTruthy();
});

it('renders the markdown content', () => {
  renderScreen({ goBack: jest.fn() });
  expect(screen.getByText('Heading One')).toBeTruthy();
  expect(screen.getByText('A paragraph of body text.')).toBeTruthy();
});

it('calls navigation.goBack when the back button is pressed', () => {
  const goBack = jest.fn();
  renderScreen({ goBack });
  // The back button is the first touchable; press via its Ionicons accessible parent.
  // Fire on the icon's container by locating the touchable through the rendered tree.
  const backIcons = screen.UNSAFE_root.findAllByProps({ name: 'arrow-back' });
  expect(backIcons.length).toBeGreaterThan(0);
  fireEvent.press(backIcons[0]);
  expect(goBack).toHaveBeenCalled();
});

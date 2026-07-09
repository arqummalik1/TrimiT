import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { SettingsSection, SettingsRow } from '../../src/components/settings/SettingsSection';

describe('SettingsRow', () => {
  it('renders title and navigates on press', () => {
    const onPress = jest.fn();
    render(
      <ThemeProvider>
        <SettingsSection title="Test">
          <SettingsRow title="Payments help" onPress={onPress} isLast />
        </SettingsSection>
      </ThemeProvider>
    );

    expect(screen.getByText('Payments help')).toBeTruthy();
    fireEvent.press(screen.getByText('Payments help'));
    expect(onPress).toHaveBeenCalled();
  });
});

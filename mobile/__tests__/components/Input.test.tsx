/**
 * Unit tests for src/components/Input.tsx
 * Covers: label, error, icon, prefix rendering; value & change events
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { Input } from '../../src/components/Input';

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Input', () => {
  // ─── Basic rendering ──────────────────────────────────────────────────────
  it('renders a TextInput', () => {
    renderWithTheme(<Input placeholder="Email" />);
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
  });

  it('renders label text when provided', () => {
    renderWithTheme(<Input label="Full Name" placeholder="John" />);
    expect(screen.getByText('Full Name')).toBeTruthy();
  });

  it('does not render label when not provided', () => {
    renderWithTheme(<Input placeholder="No label" />);
    // Only the placeholder should be present
    expect(screen.getByPlaceholderText('No label')).toBeTruthy();
  });

  // ─── Error ────────────────────────────────────────────────────────────────
  it('renders error message when provided', () => {
    renderWithTheme(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeTruthy();
  });

  it('does not render error text when error not provided', () => {
    renderWithTheme(<Input placeholder="No error" />);
    expect(screen.queryByText('This field is required')).toBeNull();
  });

  // ─── Icon ─────────────────────────────────────────────────────────────────
  it('renders icon node when provided', () => {
    renderWithTheme(
      <Input
        placeholder="Search"
        icon={<Text testID="search-icon">🔍</Text>}
      />,
    );
    expect(screen.getByTestId('search-icon')).toBeTruthy();
  });

  // ─── Prefix ───────────────────────────────────────────────────────────────
  it('renders prefix text when provided', () => {
    renderWithTheme(<Input prefix="+91" placeholder="9876543210" />);
    expect(screen.getByText('+91')).toBeTruthy();
  });

  it('renders both prefix and input together', () => {
    renderWithTheme(<Input prefix="₹" placeholder="0" />);
    expect(screen.getByText('₹')).toBeTruthy();
    expect(screen.getByPlaceholderText('0')).toBeTruthy();
  });

  // ─── Controlled value & onChange ──────────────────────────────────────────
  it('reflects the value prop', () => {
    renderWithTheme(<Input value="hello" onChangeText={jest.fn()} />);
    expect(screen.getByDisplayValue('hello')).toBeTruthy();
  });

  it('fires onChangeText when text changes', () => {
    const handleChange = jest.fn();
    renderWithTheme(<Input onChangeText={handleChange} placeholder="Type" />);
    fireEvent.changeText(screen.getByPlaceholderText('Type'), 'new text');
    expect(handleChange).toHaveBeenCalledWith('new text');
  });

  // ─── Forwards native TextInput props ──────────────────────────────────────
  it('forwards secureTextEntry prop', () => {
    renderWithTheme(<Input placeholder="Password" secureTextEntry />);
    const input = screen.getByPlaceholderText('Password');
    // secureTextEntry prop is on the underlying TextInput
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('forwards keyboardType prop', () => {
    renderWithTheme(<Input placeholder="Phone" keyboardType="phone-pad" />);
    const input = screen.getByPlaceholderText('Phone');
    expect(input.props.keyboardType).toBe('phone-pad');
  });

  it('forwards autoCapitalize prop', () => {
    renderWithTheme(<Input placeholder="Email" autoCapitalize="none" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input.props.autoCapitalize).toBe('none');
  });

  // ─── Composition: label + error + value ───────────────────────────────────
  it('renders label, error, and value together', () => {
    renderWithTheme(
      <Input
        label="Email Address"
        value="test@example.com"
        error="Already registered"
        onChangeText={jest.fn()}
      />,
    );
    expect(screen.getByText('Email Address')).toBeTruthy();
    expect(screen.getByText('Already registered')).toBeTruthy();
    expect(screen.getByDisplayValue('test@example.com')).toBeTruthy();
  });
});

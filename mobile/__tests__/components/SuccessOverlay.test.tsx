import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { SuccessOverlay } from '../../src/components/SuccessOverlay';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderOverlay(onDone: () => void, visible = true) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <SuccessOverlay
          visible={visible}
          title="You're on TrimiT Pro!"
          subtitle="Your subscription is active."
          onDone={onDone}
          holdMs={1000}
        />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('SuccessOverlay', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders the success title and subtitle when visible', () => {
    renderOverlay(jest.fn());
    expect(screen.getByText("You're on TrimiT Pro!")).toBeTruthy();
    expect(screen.getByText('Your subscription is active.')).toBeTruthy();
  });

  it('calls onDone after the hold duration', () => {
    const onDone = jest.fn();
    renderOverlay(onDone);
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not fire onDone while hidden', () => {
    const onDone = jest.fn();
    renderOverlay(onDone, false);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(onDone).not.toHaveBeenCalled();
  });
});

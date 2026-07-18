import React from 'react';
import { render } from '@testing-library/react-native';
import { AppSplashScreen } from '../../src/components/AppSplashScreen';
import { SPLASH_BACKGROUND } from '../../src/lib/splashBranding';

describe('AppSplashScreen', () => {
  it('uses OLED black background and transparent logo', () => {
    const { getByLabelText, UNSAFE_getByType } = render(<AppSplashScreen />);
    expect(getByLabelText('TrimiT')).toBeTruthy();
    const { View } = require('react-native');
    const root = UNSAFE_getByType(View);
    const flat = Array.isArray(root.props.style)
      ? Object.assign({}, ...root.props.style)
      : root.props.style;
    expect(flat.backgroundColor).toBe(SPLASH_BACKGROUND);
  });
});

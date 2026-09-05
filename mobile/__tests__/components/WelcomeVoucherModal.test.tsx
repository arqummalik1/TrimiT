import React from 'react';
import { render } from '@testing-library/react-native';
import { WelcomeVoucherModal } from '../../src/components/WelcomeVoucherModal';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

it('does not mount the welcome modal even if a caller still passes visible=true', () => {
  const { toJSON } = render(
    <WelcomeVoucherModal
      visible
      code="TRIMIT50"
      discountAmount={50}
      minOrder={149}
      expiresAt="2099-01-01T00:00:00Z"
      onExplore={jest.fn()}
    />,
  );

  expect(toJSON()).toBeNull();
});

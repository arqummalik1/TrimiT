import {
  AUTH_MODAL_OPTIONS,
  buildPostAuthRootAction,
  getPostAuthDestination,
} from '../../src/navigation/postAuthNavigation';

const meta = { createdAt: 1, expiresAt: 2 };

describe('post-auth root navigation', () => {
  it('maps a booking intent to the approved nested booking destination', () => {
    const destination = getPostAuthDestination(
      {
        ...meta,
        kind: 'customer_booking',
        salonId: 'salon-1',
        serviceId: 'service-1',
      },
      'customer',
    );

    expect(destination).toEqual({
      name: 'CustomerTabs',
      params: {
        screen: 'Discover',
        params: {
          screen: 'Booking',
          params: { salonId: 'salon-1', serviceId: 'service-1' },
        },
      },
    });
  });

  it('pops to the existing customer workspace so Auth is removed, not covered', () => {
    const destination = getPostAuthDestination(
      {
        ...meta,
        kind: 'customer_booking',
        salonId: 'salon-1',
        serviceId: 'service-1',
      },
      'customer',
    );

    const action = buildPostAuthRootAction(['CustomerTabs', 'Auth'], destination);

    expect(action.type).toBe('POP_TO');
    expect(action.payload).toMatchObject({
      name: 'CustomerTabs',
      params: destination.params,
    });
  });

  it('resets to one canonical workspace when the role destination is absent', () => {
    const destination = getPostAuthDestination(null, 'owner');
    const action = buildPostAuthRootAction(['CustomerTabs', 'Auth'], destination);

    expect(action).toEqual({
      type: 'RESET',
      payload: {
        index: 0,
        routes: [{ name: 'OwnerTabs', params: undefined }],
      },
    });
  });

  it('prevents native swipe dismissal of the authentication flow', () => {
    expect(AUTH_MODAL_OPTIONS).toMatchObject({
      presentation: 'fullScreenModal',
      gestureEnabled: false,
    });
  });
});

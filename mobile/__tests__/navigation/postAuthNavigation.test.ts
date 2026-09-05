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

  it('sends a general account sign-in to Discover instead of back to Profile', () => {
    expect(getPostAuthDestination({ ...meta, kind: 'account_sign_in' }, 'customer')).toEqual({
      name: 'CustomerTabs',
      params: { screen: 'Discover', params: { screen: 'DiscoverMain' } },
    });
  });

  it('sends an owner using general sign-in to the owner workspace', () => {
    expect(getPostAuthDestination({ ...meta, kind: 'account_sign_in' }, 'owner')).toEqual({
      name: 'OwnerTabs',
      params: undefined,
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

  it('puts reversible owner onboarding above the customer profile after auth', () => {
    const destination = getPostAuthDestination(
      { ...meta, kind: 'owner_onboarding' },
      'customer',
    );
    expect(destination).toEqual({
      name: 'OwnerOnboarding',
      params: { screen: 'ChooseBusinessType' },
    });

    expect(buildPostAuthRootAction(['CustomerTabs', 'Auth'], destination)).toEqual({
      type: 'RESET',
      payload: {
        index: 1,
        routes: [
          {
            name: 'CustomerTabs',
            params: { screen: 'Profile', params: { screen: 'ProfileMain' } },
          },
          {
            name: 'OwnerOnboarding',
            params: { screen: 'ChooseBusinessType' },
          },
        ],
      },
    });
  });

  it('keeps legacy owners on the existing owner onboarding destination', () => {
    expect(getPostAuthDestination({ ...meta, kind: 'owner_onboarding' }, 'owner')).toEqual({
      name: 'OwnerTabs',
      params: {
        screen: 'Dashboard',
        params: { screen: 'ChooseBusinessType' },
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

import { CommonActions, StackActions } from '@react-navigation/native';

jest.mock('../../src/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => true,
    dispatch: jest.fn(),
  },
}));

import { navigationRef } from '../../src/navigation/navigationRef';

import {
  completeOwnerOnboarding,
  exitOwnerOnboarding,
  resetToCustomerProfile,
} from '../../src/lib/ownerOnboardingNavigation';

function nav(overrides: Record<string, unknown> = {}) {
  return {
    dispatch: jest.fn(),
    getParent: jest.fn(() => undefined),
    getState: jest.fn(() => ({ routeNames: [] })),
    ...overrides,
  };
}

const mockedRootDispatch = navigationRef.dispatch as jest.Mock;

beforeEach(() => mockedRootDispatch.mockClear());

it('pops onboarding to the customer profile when the root stack is found', () => {
  const root = nav({
    getState: jest.fn(() => ({ routeNames: ['CustomerTabs', 'OwnerOnboarding', 'Auth'] })),
  });
  const child = nav({ getParent: jest.fn(() => root) });

  expect(exitOwnerOnboarding(child as any)).toBe(true);
  expect(root.dispatch).toHaveBeenCalledWith(
    StackActions.popTo('CustomerTabs', {
      screen: 'Profile',
      params: { screen: 'ProfileMain' },
    }),
  );
});

it('does not invent a destination outside the owner onboarding root', () => {
  const child = nav();
  expect(exitOwnerOnboarding(child as any)).toBe(false);
  expect(child.dispatch).not.toHaveBeenCalled();
});

it('resets to owner services only after successful activation', () => {
  completeOwnerOnboarding();
  expect(mockedRootDispatch).toHaveBeenCalledWith(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'OwnerTabs',
          params: {
            screen: 'Services',
            params: { screen: 'ServicesMain', params: { openAddService: true } },
          },
        },
      ],
    }),
  );
});

it('resets legacy incomplete owners to the customer profile after server recovery', () => {
  resetToCustomerProfile();
  expect(mockedRootDispatch).toHaveBeenCalledWith(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'CustomerTabs',
          params: { screen: 'Profile', params: { screen: 'ProfileMain' } },
        },
      ],
    }),
  );
});

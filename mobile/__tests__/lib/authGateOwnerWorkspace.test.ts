const mockNavigate = jest.fn();

jest.mock('../../src/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => true,
    navigate: (...args: unknown[]) => mockNavigate(...args),
  },
}));

import { requestOwnerWorkspace } from '../../src/lib/authGate';
import { usePendingAuthIntentStore } from '../../src/store/pendingAuthIntentStore';

beforeEach(() => {
  mockNavigate.mockClear();
  usePendingAuthIntentStore.setState({ intent: null, isHydrated: true });
});

it('opens reversible onboarding without persisting an owner role intent', () => {
  usePendingAuthIntentStore.getState().setIntent({ kind: 'profile' });

  requestOwnerWorkspace();

  expect(usePendingAuthIntentStore.getState().peekIntent()).toBeNull();
  expect(mockNavigate).toHaveBeenCalledWith('OwnerOnboarding', {
    screen: 'ChooseBusinessType',
  });
});

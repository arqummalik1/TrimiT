import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getRoleForPendingIntent,
  usePendingAuthIntentStore,
} from '../../src/store/pendingAuthIntentStore';

describe('pendingAuthIntentStore', () => {
  beforeEach(async () => {
    jest.useRealTimers();
    await AsyncStorage.clear();
    usePendingAuthIntentStore.setState({ intent: null, isHydrated: true });
  });

  it('stores an allowlisted booking destination with a 20-minute expiry', () => {
    const before = Date.now();
    usePendingAuthIntentStore.getState().setIntent({
      kind: 'customer_booking',
      salonId: '11111111-1111-1111-1111-111111111111',
      serviceId: '22222222-2222-2222-2222-222222222222',
    });
    const intent = usePendingAuthIntentStore.getState().peekIntent();
    expect(intent?.kind).toBe('customer_booking');
    expect(intent?.expiresAt).toBeGreaterThan(before);
  });

  it('consumes an intent exactly once', () => {
    usePendingAuthIntentStore.getState().setIntent({ kind: 'my_bookings' });
    expect(usePendingAuthIntentStore.getState().consumeIntent()?.kind).toBe('my_bookings');
    expect(usePendingAuthIntentStore.getState().consumeIntent()).toBeNull();
  });

  it('stores the allowlisted general account sign-in destination', () => {
    usePendingAuthIntentStore.getState().setIntent({ kind: 'account_sign_in' });
    expect(usePendingAuthIntentStore.getState().peekIntent()?.kind).toBe('account_sign_in');
  });

  it('drops expired intents', () => {
    usePendingAuthIntentStore.setState({
      intent: { kind: 'profile', createdAt: 1, expiresAt: 2 },
    });
    expect(usePendingAuthIntentStore.getState().peekIntent()).toBeNull();
  });

  it('drops a persisted destination that is not allowlisted', () => {
    usePendingAuthIntentStore.setState({
      intent: {
        kind: 'admin_console',
        createdAt: Date.now(),
        expiresAt: Date.now() + 60_000,
      } as never,
    });
    expect(usePendingAuthIntentStore.getState().peekIntent()).toBeNull();
  });

  it('drops malformed persisted booking parameters', () => {
    usePendingAuthIntentStore.setState({
      intent: {
        kind: 'customer_booking',
        salonId: '',
        serviceId: 'service-id',
        createdAt: Date.now(),
        expiresAt: Date.now() + 60_000,
      },
    });
    expect(usePendingAuthIntentStore.getState().consumeIntent()).toBeNull();
  });

  it('keeps owner onboarding as customer until salon creation succeeds', () => {
    usePendingAuthIntentStore.getState().setIntent({ kind: 'owner_onboarding' });
    expect(getRoleForPendingIntent()).toBe('customer');
    usePendingAuthIntentStore.getState().setIntent({ kind: 'employee_claim' });
    expect(getRoleForPendingIntent()).toBe('employee');
    usePendingAuthIntentStore.getState().setIntent({ kind: 'profile' });
    expect(getRoleForPendingIntent()).toBe('customer');
  });
});

/**
 * Unit tests for src/services/upiIntentService.ts — the single place that
 * launches a UPI app. We mock react-native Linking and assert the
 * launched/false outcomes (it must NEVER throw, so the booking flow can always
 * fall back to showing the salon's UPI ID).
 */
import { Linking } from 'react-native';
import { upiIntentService, KNOWN_UPI_APPS } from '../../src/services/upiIntentService';

jest.mock('../../src/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const URI = 'upi://pay?pa=glow%40okaxis&pn=Glow&am=499.00&cu=INR&tn=TrimiT%20TRM-1';

describe('upiIntentService.launchUpiApp', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns launched:false for an empty uri', async () => {
    const res = await upiIntentService.launchUpiApp('');
    expect(res.launched).toBe(false);
  });

  it('launches when a UPI app can open the intent', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    const res = await upiIntentService.launchUpiApp(URI);
    expect(res.launched).toBe(true);
    expect(open).toHaveBeenCalledWith(URI);
  });

  it('still tries openURL when canOpenURL is false, and succeeds', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    const res = await upiIntentService.launchUpiApp(URI);
    expect(res.launched).toBe(true);
  });

  it('returns launched:false when no app can open and openURL throws', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no activity'));
    const res = await upiIntentService.launchUpiApp(URI);
    expect(res.launched).toBe(false);
  });

  it('never throws even if canOpenURL rejects', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockRejectedValue(new Error('boom'));
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('boom'));
    const res = await upiIntentService.launchUpiApp(URI);
    expect(res.launched).toBe(false);
  });
});

describe('upiIntentService UPI app catalogue + targeted launch', () => {
  afterEach(() => jest.restoreAllMocks());

  it('KNOWN_UPI_APPS covers the major Indian UPI apps with package names', () => {
    const keys = KNOWN_UPI_APPS.map((a) => a.key);
    expect(keys).toEqual(expect.arrayContaining(['gpay', 'phonepe', 'paytm', 'whatsapp', 'bhim']));
    // Every app must carry an Android package id for intent targeting.
    expect(KNOWN_UPI_APPS.every((a) => a.androidPackage.includes('.'))).toBe(true);
  });

  it('getInstalledUpiApps returns [] on non-Android (iOS uses the generic launch)', async () => {
    // Default test platform is iOS — detection is Android-only.
    const apps = await upiIntentService.getInstalledUpiApps(URI);
    expect(apps).toEqual([]);
  });

  it('launchUpiAppByPackage falls back to the generic launcher on iOS and succeeds', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    const res = await upiIntentService.launchUpiAppByPackage(URI, 'com.phonepe.app');
    expect(res.launched).toBe(true);
    // On iOS the raw upi:// URI is opened (no package-targeted intent).
    expect(open).toHaveBeenCalledWith(URI);
  });

  it('launchUpiAppByPackage returns launched:false for an empty uri', async () => {
    const res = await upiIntentService.launchUpiAppByPackage('', 'com.phonepe.app');
    expect(res.launched).toBe(false);
  });
});

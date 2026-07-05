import { isGoogleSignInNativeAvailable } from '../../src/services/googleAuthService';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: 'expo' },
}));

jest.mock('react-native', () => ({
  NativeModules: { RNGoogleSignin: undefined },
}));

describe('googleAuthService', () => {
  it('isGoogleSignInNativeAvailable is false in Expo Go', () => {
    expect(isGoogleSignInNativeAvailable()).toBe(false);
  });
});

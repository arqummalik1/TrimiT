/**
 * @jest-environment node
 */
const {
  iosUrlSchemeFromClientId,
  rewriteGoogleUrlSchemes,
} = require('../../plugins/withGoogleIosUrlSchemeFromEnv');
const { translateGoogleAuthError } = require('../../src/lib/googleAuthErrors');

describe('withGoogleIosUrlSchemeFromEnv', () => {
  it('builds scheme from iOS client id', () => {
    expect(
      iosUrlSchemeFromClientId('123-abc.apps.googleusercontent.com')
    ).toBe('com.googleusercontent.apps.123-abc');
  });

  it('replaces placeholder googleusercontent scheme', () => {
    const plist = {
      CFBundleURLTypes: [
        { CFBundleURLSchemes: ['trimit'] },
        { CFBundleURLSchemes: ['com.googleusercontent.apps.placeholder'] },
      ],
    };
    rewriteGoogleUrlSchemes(plist, 'com.googleusercontent.apps.real-id');
    expect(plist.CFBundleURLTypes[1].CFBundleURLSchemes[0]).toBe(
      'com.googleusercontent.apps.real-id'
    );
  });
});

describe('translateGoogleAuthError', () => {
  it('explains same-email merge when account already exists', () => {
    const msg = translateGoogleAuthError('User already registered');
    expect(msg.toLowerCase()).toContain('one account');
  });
});

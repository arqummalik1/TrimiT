/**
 * Ensure iOS Google Sign-In URL scheme matches EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.
 *
 * Expo's @react-native-google-signin plugin bakes the scheme at prebuild time.
 * If .env was empty then, Info.plist keeps `com.googleusercontent.apps.placeholder`
 * and Google Sign-In fails on iOS after the account picker.
 *
 * This plugin rewrites any googleusercontent URL scheme to the real iOS client from env.
 */
const { withInfoPlist } = require('@expo/config-plugins');

function iosUrlSchemeFromClientId(clientId) {
  if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
    return null;
  }
  return `com.googleusercontent.apps.${clientId.replace(
    '.apps.googleusercontent.com',
    ''
  )}`;
}

function rewriteGoogleUrlSchemes(infoPlist, scheme) {
  const types = infoPlist.CFBundleURLTypes;
  if (!Array.isArray(types)) {
    infoPlist.CFBundleURLTypes = [{ CFBundleURLSchemes: [scheme] }];
    return true;
  }

  let changed = false;
  let foundGoogle = false;
  for (const entry of types) {
    const schemes = entry.CFBundleURLSchemes;
    if (!Array.isArray(schemes)) continue;
    for (let i = 0; i < schemes.length; i += 1) {
      const s = schemes[i];
      if (typeof s === 'string' && s.startsWith('com.googleusercontent.apps.')) {
        foundGoogle = true;
        if (s !== scheme) {
          schemes[i] = scheme;
          changed = true;
        }
      }
    }
  }
  if (!foundGoogle) {
    types.push({ CFBundleURLSchemes: [scheme] });
    changed = true;
  }
  return changed;
}

function withGoogleIosUrlSchemeFromEnv(config) {
  return withInfoPlist(config, (cfg) => {
    const scheme = iosUrlSchemeFromClientId(
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || ''
    );
    if (!scheme) {
      return cfg;
    }
    rewriteGoogleUrlSchemes(cfg.modResults, scheme);
    return cfg;
  });
}

module.exports = withGoogleIosUrlSchemeFromEnv;
module.exports.iosUrlSchemeFromClientId = iosUrlSchemeFromClientId;
module.exports.rewriteGoogleUrlSchemes = rewriteGoogleUrlSchemes;

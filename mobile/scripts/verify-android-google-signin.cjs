#!/usr/bin/env node
/**
 * Fail if the Android PackageList was generated without RNGoogleSignin.
 * That binary will show Google UI but error: "not available in this build".
 *
 * Usage: after (or during) an Android build — or run:
 *   cd android && ./gradlew :app:generateAutolinkingPackageList
 *   node scripts/verify-android-google-signin.cjs
 */
const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(
    __dirname,
    '..',
    'android',
    'app',
    'build',
    'generated',
    'autolinking',
    'src',
    'main',
    'java',
    'com',
    'facebook',
    'react',
    'PackageList.java'
  ),
];

function main() {
  const file = candidates.find((p) => fs.existsSync(p));
  if (!file) {
    console.warn(
      '[verify-android-google] PackageList.java not generated yet — run an Android Gradle build first.'
    );
    process.exit(0);
  }
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('RNGoogleSigninPackage')) {
    console.error(
      '\n[verify-android-google] FAIL: RNGoogleSigninPackage missing from PackageList.java\n' +
        '  Google Sign-In JS will load but native Android has no module.\n' +
        '  Fix: delete android/app/build and android/build, then rebuild APK/AAB.\n' +
        `  File: ${file}\n`
    );
    process.exit(1);
  }
  console.log('[verify-android-google] OK — RNGoogleSigninPackage is linked');
}

main();

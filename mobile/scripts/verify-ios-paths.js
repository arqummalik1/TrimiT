#!/usr/bin/env node
/**
 * Fail fast before Xcode / pod install if the project path or CocoaPods artifacts
 * still point at a moved/renamed directory (classic cause of:
 *   Unable to open base configuration reference file '...react-native-google-maps.debug.xcconfig'
 *
 * Rules:
 * 1. mobile/ absolute path must NOT contain spaces (CocoaPods + Xcode footgun).
 * 2. If ios/Pods or Podfile.lock exist, they must not reference a different
 *    absolute root than the current mobile/ folder.
 */

const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');
const iosRoot = path.join(mobileRoot, 'ios');

const SCAN_FILES = [
  path.join(iosRoot, 'Podfile.lock'),
  path.join(iosRoot, 'Pods', 'Manifest.lock'),
  path.join(iosRoot, 'Pods', 'Pods.xcodeproj', 'project.pbxproj'),
  path.join(
    iosRoot,
    'Pods',
    'Target Support Files',
    'Pods-TrimiT',
    'expo-configure-project.sh'
  ),
];

function collectAbsoluteRoots(text) {
  const roots = new Set();
  const re = /\/Users\/[^"'`\s]+\/Trimit\/TrimiT\/mobile/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    roots.add(m[0]);
  }
  // Also catch any absolute path that includes "Software Development" under TrimiT
  const spaced = /\/Users\/[^"'`\n]*Software Development[^"'`\n]*/g;
  while ((m = spaced.exec(text)) !== null) {
    roots.add(m[0]);
  }
  return [...roots];
}

function main() {
  const errors = [];

  if (mobileRoot.includes(' ')) {
    errors.push(
      `Project path contains a SPACE:\n  ${mobileRoot}\n` +
        'CocoaPods/Xcode break on spaces. Keep the folder named Software-Development (hyphen).'
    );
  }

  const expectedRoot = mobileRoot;
  for (const file of SCAN_FILES) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes('Software Development')) {
      errors.push(
        `Stale spaced path in ${path.relative(mobileRoot, file)}.\n` +
          '  Fix: npm run ios:pods (reinstall CocoaPods from this folder).'
      );
      continue;
    }
    const roots = collectAbsoluteRoots(text);
    for (const root of roots) {
      // Normalize: some refs are .../mobile, some continue into node_modules/ios
      const normalized = root.includes('/mobile')
        ? root.slice(0, root.indexOf('/mobile') + '/mobile'.length)
        : root;
      if (normalized !== expectedRoot && root.includes('/Users/')) {
        // Only flag if it looks like our machine path but wrong
        if (root.includes('TrimiT') && !root.startsWith(expectedRoot)) {
          errors.push(
            `Stale absolute path in ${path.relative(mobileRoot, file)}:\n` +
              `  found:    ${root}\n` +
              `  expected: ${expectedRoot}/...\n` +
              '  Fix: npm run ios:pods'
          );
        }
      }
    }
  }

  const podfile = path.join(iosRoot, 'Podfile');
  if (fs.existsSync(podfile)) {
    const pod = fs.readFileSync(podfile, 'utf8');
    if (
      pod.includes("pod 'react-native-google-maps'") &&
      !pod.includes('TrimiT relative react-native-google-maps path') &&
      /require\.resolve\(['"]react-native-maps/.test(pod)
    ) {
      errors.push(
        'Podfile still uses absolute node resolve for react-native-google-maps.\n' +
          '  Fix: ensure plugins/withRelativeMapsPodPath.js is in app.config.js, then re-prebuild or run npm run ios:pods after patching Podfile.'
      );
    }
  }

  if (errors.length > 0) {
    console.error('\n=== TrimiT iOS path check FAILED ===\n');
    for (const e of errors) {
      console.error(`• ${e}\n`);
    }
    process.exit(1);
  }

  console.log('\n=== TrimiT iOS path check OK ===');
  console.log(`mobile root: ${mobileRoot}`);
  console.log('(no spaces; no stale CocoaPods absolute paths)\n');
}

if (require.main === module) {
  main();
}

module.exports = { collectAbsoluteRoots, main, mobileRoot };

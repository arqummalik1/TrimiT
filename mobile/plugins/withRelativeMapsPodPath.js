/**
 * Expo prebuild injects react-native-google-maps with:
 *   path: File.dirname(`node --print "require.resolve('react-native-maps/package.json')"`)
 *
 * That resolves to an ABSOLUTE path. CocoaPods then bakes it into Podfile.lock and
 * Pods.xcodeproj. Renaming/moving the repo (e.g. "Software Development" →
 * "Software-Development") leaves Xcode pointing at a dead path:
 *   Unable to open base configuration reference file '.../react-native-google-maps.debug.xcconfig'
 *
 * Permanent fix: force a path relative to the Podfile (__dir__), which survives
 * folder renames as long as mobile/ios ↔ mobile/node_modules layout is unchanged.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'TrimiT relative react-native-google-maps path';

/** Relative path from ios/Podfile to react-native-maps package root. */
const RELATIVE_MAPS_POD =
  "pod 'react-native-google-maps', :path => File.join(__dir__, '..', 'node_modules', 'react-native-maps') # " +
  MARKER;

/**
 * Match Expo's generated absolute resolve line (and any prior absolute :path).
 */
const ABSOLUTE_OR_RESOLVE_LINE =
  /^\s*pod\s+'react-native-google-maps'\s*,\s*(?:path:|:path\s*=>)\s*.+$/m;

function rewritePodfileContents(contents) {
  if (contents.includes(MARKER)) {
    return { contents, changed: false };
  }
  if (!ABSOLUTE_OR_RESOLVE_LINE.test(contents)) {
    return { contents, changed: false };
  }
  const next = contents.replace(ABSOLUTE_OR_RESOLVE_LINE, `  ${RELATIVE_MAPS_POD}`);
  return { contents: next, changed: next !== contents };
}

function withRelativeMapsPodPath(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) {
        return cfg;
      }
      const original = fs.readFileSync(podfilePath, 'utf8');
      const { contents, changed } = rewritePodfileContents(original);
      if (changed) {
        fs.writeFileSync(podfilePath, contents);
      }
      return cfg;
    },
  ]);
}

module.exports = withRelativeMapsPodPath;
module.exports.rewritePodfileContents = rewritePodfileContents;
module.exports.MARKER = MARKER;
module.exports.RELATIVE_MAPS_POD = RELATIVE_MAPS_POD;

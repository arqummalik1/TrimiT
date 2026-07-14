/**
 * Physical-device Debug builds must not depend on Metro over HTTP.
 *
 * Failure mode we hit on TrimiT:
 *   Mac Wi‑Fi is CLAT (en0 = 192.0.0.2) → RN writes that into ip.txt →
 *   app requests http://192.0.0.2:8081 → ATS blocks (not RFC1918 local) →
 *   "No script URL provided" red screen.
 *
 * Permanent fix: on physical device Debug, prefer embedded main.jsbundle
 * (RN xcode.sh already bundles for device Debug). Simulator keeps Metro.
 * Survives `expo prebuild` via DangerousMod on AppDelegate.swift.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'TrimiT device Debug uses embedded JS bundle';

const BUNDLE_URL_IMPL = `  override func bundleURL() -> URL? {
#if DEBUG
#if targetEnvironment(simulator)
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    // ${MARKER}: avoid Metro/ATS when Mac IP is CLAT (e.g. 192.0.0.2) or phone is off LAN.
    if let embedded = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
      return embedded
    }
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#endif
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }`;

const BUNDLE_URL_RE =
  /override func bundleURL\(\) -> URL\? \{[\s\S]*?\n  \}/;

function rewriteAppDelegate(contents) {
  if (contents.includes(MARKER)) {
    return { contents, changed: false };
  }
  if (!BUNDLE_URL_RE.test(contents)) {
    return { contents, changed: false };
  }
  const next = contents.replace(BUNDLE_URL_RE, BUNDLE_URL_IMPL);
  return { contents: next, changed: next !== contents };
}

function withIosDeviceEmbeddedBundle(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const appDelegatePath = path.join(
        cfg.modRequest.platformProjectRoot,
        cfg.modRequest.projectName || 'TrimiT',
        'AppDelegate.swift'
      );
      if (!fs.existsSync(appDelegatePath)) {
        return cfg;
      }
      const original = fs.readFileSync(appDelegatePath, 'utf8');
      const { contents, changed } = rewriteAppDelegate(original);
      if (changed) {
        fs.writeFileSync(appDelegatePath, contents);
      }
      return cfg;
    },
  ]);
}

module.exports = withIosDeviceEmbeddedBundle;
module.exports.rewriteAppDelegate = rewriteAppDelegate;
module.exports.MARKER = MARKER;

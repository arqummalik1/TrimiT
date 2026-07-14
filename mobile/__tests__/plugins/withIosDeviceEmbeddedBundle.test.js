/**
 * @jest-environment node
 */
const {
  rewriteAppDelegate,
  MARKER,
} = require('../../plugins/withIosDeviceEmbeddedBundle');

describe('withIosDeviceEmbeddedBundle', () => {
  const stock = `
class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
`;

  it('rewrites DEBUG device path to prefer embedded main.jsbundle', () => {
    const { contents, changed } = rewriteAppDelegate(stock);
    expect(changed).toBe(true);
    expect(contents).toContain(MARKER);
    expect(contents).toContain('targetEnvironment(simulator)');
    expect(contents).toContain('main", withExtension: "jsbundle"');
  });

  it('is idempotent when already patched', () => {
    const once = rewriteAppDelegate(stock).contents;
    const twice = rewriteAppDelegate(once);
    expect(twice.changed).toBe(false);
  });
});

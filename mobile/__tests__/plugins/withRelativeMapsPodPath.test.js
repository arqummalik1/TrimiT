/**
 * @jest-environment node
 */
const {
  rewritePodfileContents,
  MARKER,
} = require('../../plugins/withRelativeMapsPodPath');
const { collectAbsoluteRoots } = require('../../scripts/verify-ios-paths');

describe('withRelativeMapsPodPath', () => {
  it('rewrites Expo absolute node-resolve maps pod to relative __dir__ path', () => {
    const input = `
target 'TrimiT' do
# @generated begin react-native-maps
  pod 'react-native-google-maps', path: File.dirname(\`node --print "require.resolve('react-native-maps/package.json')"\`)
# @generated end react-native-maps
end
`;
    const { contents, changed } = rewritePodfileContents(input);
    expect(changed).toBe(true);
    expect(contents).toContain(MARKER);
    expect(contents).toContain("File.join(__dir__, '..', 'node_modules', 'react-native-maps')");
    expect(contents).not.toMatch(/require\.resolve\(['"]react-native-maps/);
  });

  it('is idempotent when marker already present', () => {
    const input = `
  pod 'react-native-google-maps', :path => File.join(__dir__, '..', 'node_modules', 'react-native-maps') # ${MARKER}
`;
    const { changed } = rewritePodfileContents(input);
    expect(changed).toBe(false);
  });
});

describe('verify-ios-paths collectAbsoluteRoots', () => {
  it('detects spaced Software Development paths', () => {
    const text =
      'path = "/Users/arqummalik/Software Development/Trimit/TrimiT/mobile/node_modules/react-native-maps"';
    const roots = collectAbsoluteRoots(text);
    expect(roots.some((r) => r.includes('Software Development'))).toBe(true);
  });

  it('detects hyphenated mobile root paths', () => {
    const text =
      'from `/Users/arqummalik/Software-Development/Trimit/TrimiT/mobile/node_modules/react-native-maps`';
    const roots = collectAbsoluteRoots(text);
    expect(
      roots.some((r) =>
        r.includes('/Users/arqummalik/Software-Development/Trimit/TrimiT/mobile')
      )
    ).toBe(true);
  });
});

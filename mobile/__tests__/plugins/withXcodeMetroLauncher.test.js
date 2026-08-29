const {
  addMetroLaunchPreAction,
  MARKER,
} = require('../../plugins/withXcodeMetroLauncher');

const CLEAN_SCHEME = `<?xml version="1.0" encoding="UTF-8"?>
<Scheme version = "1.3">
   <BuildAction>
      <BuildableReference
         BuildableIdentifier = "primary"
         BlueprintIdentifier = "ABC123"
         BuildableName = "TrimiT.app"
         BlueprintName = "TrimiT"
         ReferencedContainer = "container:TrimiT.xcodeproj">
      </BuildableReference>
   </BuildAction>
   <LaunchAction
      buildConfiguration = "Debug"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable />
   </LaunchAction>
</Scheme>`;

describe('withXcodeMetroLauncher', () => {
  it('adds the Metro pre-action to a clean shared scheme', () => {
    const result = addMetroLaunchPreAction(CLEAN_SCHEME);

    expect(result.changed).toBe(true);
    expect(result.contents).toContain(MARKER);
    expect(result.contents).toContain('$SRCROOT/../scripts/ensure-metro-for-xcode.sh');
    expect(result.contents.indexOf('<PreActions>')).toBeLessThan(
      result.contents.indexOf('<BuildableProductRunnable')
    );
    expect(result.contents).toContain('BlueprintIdentifier = "ABC123"');
  });

  it('does not duplicate an existing Metro pre-action', () => {
    const first = addMetroLaunchPreAction(CLEAN_SCHEME);
    const second = addMetroLaunchPreAction(first.contents);

    expect(second.changed).toBe(false);
    expect(second.contents).toBe(first.contents);
    expect(second.contents.match(new RegExp(MARKER, 'g'))).toHaveLength(1);
  });
});

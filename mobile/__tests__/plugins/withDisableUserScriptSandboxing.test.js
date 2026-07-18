const {
  disableUserScriptSandboxingInProject,
} = require('../../plugins/withDisableUserScriptSandboxing');

describe('withDisableUserScriptSandboxing', () => {
  it('sets ENABLE_USER_SCRIPT_SANDBOXING to NO on configs that have it', () => {
    const section = {
      '1': {
        isa: 'XCBuildConfiguration',
        buildSettings: {
          IPHONEOS_DEPLOYMENT_TARGET: '15.1',
          ENABLE_USER_SCRIPT_SANDBOXING: 'YES',
        },
      },
      '2': {
        isa: 'XCBuildConfiguration',
        buildSettings: {
          IPHONEOS_DEPLOYMENT_TARGET: '15.1',
          ENABLE_USER_SCRIPT_SANDBOXING: 'YES',
        },
      },
      '3': { isa: 'XCBuildConfiguration', buildSettings: { PRODUCT_NAME: 'TrimiT' } },
    };
    const project = {
      pbxXCBuildConfigurationSection: () => section,
    };

    const patched = disableUserScriptSandboxingInProject(project);
    expect(patched).toBeGreaterThanOrEqual(2);
    expect(section['1'].buildSettings.ENABLE_USER_SCRIPT_SANDBOXING).toBe('NO');
    expect(section['2'].buildSettings.ENABLE_USER_SCRIPT_SANDBOXING).toBe('NO');
  });

  it('is idempotent when already NO', () => {
    const section = {
      '1': {
        isa: 'XCBuildConfiguration',
        buildSettings: {
          IPHONEOS_DEPLOYMENT_TARGET: '15.1',
          ENABLE_USER_SCRIPT_SANDBOXING: 'NO',
        },
      },
    };
    const project = {
      pbxXCBuildConfigurationSection: () => section,
    };
    expect(disableUserScriptSandboxingInProject(project)).toBe(0);
  });
});

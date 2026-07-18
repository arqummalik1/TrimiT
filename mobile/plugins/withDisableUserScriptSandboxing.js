/**
 * Xcode 15+ defaults ENABLE_USER_SCRIPT_SANDBOXING=YES, which blocks CocoaPods /
 * RN / Hermes build-phase scripts (`find` denied on ios/, Pods/, etc.).
 * React Native + Expo projects need this OFF for Archive / device builds.
 */
const { withXcodeProject } = require('@expo/config-plugins');

function disableUserScriptSandboxingInProject(project) {
  const configurations = project.pbxXCBuildConfigurationSection();
  let patched = 0;
  for (const key of Object.keys(configurations)) {
    const entry = configurations[key];
    if (typeof entry !== 'object' || !entry.buildSettings) {
      continue;
    }
    const prev = entry.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING;
    if (prev === 'NO') {
      continue;
    }
    // Project-level Debug/Release always set this; also force NO if already YES.
    if (prev != null || entry.buildSettings.IPHONEOS_DEPLOYMENT_TARGET != null) {
      entry.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
      patched += 1;
    }
  }
  return patched;
}

function withDisableUserScriptSandboxing(config) {
  return withXcodeProject(config, (cfg) => {
    disableUserScriptSandboxingInProject(cfg.modResults);
    return cfg;
  });
}

module.exports = withDisableUserScriptSandboxing;
module.exports.disableUserScriptSandboxingInProject = disableUserScriptSandboxingInProject;

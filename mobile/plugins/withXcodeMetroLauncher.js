/**
 * Add a Debug Launch pre-action to the generated shared Xcode scheme.
 *
 * The native ios/ folder is intentionally gitignored, so editing the scheme
 * directly would be lost after a clean checkout or `expo prebuild`. This
 * tracked config plugin reapplies the idempotent Metro launcher every time the
 * native project is generated.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'Ensure TrimiT Metro is ready';

function indentXmlBlock(block, spaces) {
  const prefix = ' '.repeat(spaces);
  return block
    .trim()
    .split(/\r?\n/)
    .map((line) => `${prefix}${line.trim()}`)
    .join('\n');
}

function addMetroLaunchPreAction(contents) {
  if (contents.includes(MARKER)) {
    return { contents, changed: false };
  }

  const launchActionOpen = contents.match(/<LaunchAction\b[\s\S]*?>/);
  const buildableReference = contents.match(/<BuildableReference\b[\s\S]*?<\/BuildableReference>/);
  if (!launchActionOpen || launchActionOpen.index == null || !buildableReference) {
    return { contents, changed: false };
  }

  const insertionIndex = launchActionOpen.index + launchActionOpen[0].length;
  const environmentReference = indentXmlBlock(buildableReference[0], 18);
  const preAction = `
      <PreActions>
         <ExecutionAction
            ActionType = "Xcode.IDEStandardExecutionActionsCore.ExecutionActionType.ShellScriptAction">
            <ActionContent
               title = "${MARKER}"
               scriptText = "/bin/bash &quot;$SRCROOT/../scripts/ensure-metro-for-xcode.sh&quot;&#10;">
               <EnvironmentBuildable>
${environmentReference}
               </EnvironmentBuildable>
            </ActionContent>
         </ExecutionAction>
      </PreActions>`;

  return {
    contents: `${contents.slice(0, insertionIndex)}${preAction}${contents.slice(insertionIndex)}`,
    changed: true,
  };
}

function findSharedScheme(iosRoot) {
  const projectDirectory = fs
    .readdirSync(iosRoot, { withFileTypes: true })
    .find((entry) => entry.isDirectory() && entry.name.endsWith('.xcodeproj'));
  if (!projectDirectory) return null;

  const schemesRoot = path.join(
    iosRoot,
    projectDirectory.name,
    'xcshareddata',
    'xcschemes'
  );
  if (!fs.existsSync(schemesRoot)) return null;

  const scheme = fs.readdirSync(schemesRoot).find((name) => name.endsWith('.xcscheme'));
  return scheme ? path.join(schemesRoot, scheme) : null;
}

function withXcodeMetroLauncher(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const schemePath = findSharedScheme(cfg.modRequest.platformProjectRoot);
      if (!schemePath) {
        throw new Error('[TrimiT] Unable to find the generated shared iOS Xcode scheme.');
      }

      const original = fs.readFileSync(schemePath, 'utf8');
      const result = addMetroLaunchPreAction(original);
      if (!result.changed && !original.includes(MARKER)) {
        throw new Error('[TrimiT] Unable to add the Metro launcher to the iOS Xcode scheme.');
      }
      if (result.changed) {
        fs.writeFileSync(schemePath, result.contents, 'utf8');
      }
      return cfg;
    },
  ]);
}

module.exports = withXcodeMetroLauncher;
module.exports.addMetroLaunchPreAction = addMetroLaunchPreAction;
module.exports.findSharedScheme = findSharedScheme;
module.exports.MARKER = MARKER;

/**
 * Xcode 16+ warns "Upload Symbols Failed" when hermes.framework.dSYM is missing from archives.
 * Hermes stays enabled — we run dsymutil on Release builds after Embed Pods Frameworks.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'Generate Hermes dSYM';
const PHASE_ID = 'A7H3RM3E5F6A7890B1C2D3E4';
const SCRIPT_REL = 'scripts/generate-hermes-dsym.sh';

const SCRIPT_SOURCE = `#!/bin/sh
# TrimiT — generate hermes.framework.dSYM for App Store Connect (Xcode 16+ upload warning).
# Hermes stays ON. This only adds crash symbol metadata to the archive; no runtime change.
set -e

if echo "\${CONFIGURATION}" | grep -iq debug; then
  exit 0
fi

DSYM_OUTPUT="\${DWARF_DSYM_FOLDER_PATH}/hermes.framework.dSYM"
if [ -d "$DSYM_OUTPUT" ]; then
  echo "[Hermes dSYM] Already present — skipping"
  exit 0
fi

HERMES_BIN=""
for candidate in \\
  "\${PODS_ROOT}/hermes-engine/destroot/Library/Frameworks/universal/hermes.xcframework/ios-arm64/hermes.framework/hermes" \\
  "\${TARGET_BUILD_DIR}/\${FRAMEWORKS_FOLDER_PATH}/hermes.framework/hermes" \\
  "\${BUILT_PRODUCTS_DIR}/\${FRAMEWORKS_FOLDER_PATH}/hermes.framework/hermes"; do
  if [ -f "$candidate" ]; then
    HERMES_BIN="$candidate"
    break
  fi
done

if [ -z "$HERMES_BIN" ]; then
  HERMES_BIN="$(find "\${PODS_ROOT}/hermes-engine" -path "*ios-arm64/hermes.framework/hermes" -type f 2>/dev/null | head -n 1)"
fi

if [ -z "$HERMES_BIN" ] || [ ! -f "$HERMES_BIN" ]; then
  echo "warning: [Hermes dSYM] Hermes binary not found — skipping (upload may show a harmless warning)"
  exit 0
fi

echo "[Hermes dSYM] Generating from \${HERMES_BIN}"
dsymutil "$HERMES_BIN" -o "$DSYM_OUTPUT"
echo "[Hermes dSYM] Created \${DSYM_OUTPUT}"
`;

function ensureHermesScript(iosRoot) {
  const scriptPath = path.join(iosRoot, SCRIPT_REL);
  fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
  fs.writeFileSync(scriptPath, SCRIPT_SOURCE, { mode: 0o755 });
}

function patchPbxproj(pbxPath) {
  let contents = fs.readFileSync(pbxPath, 'utf8');
  if (contents.includes(MARKER)) {
    return false;
  }

  const embedPhaseId = '1E738626EB40CE4E0D50EDA8';
  const phaseBlock =
    '\t\t' +
    PHASE_ID +
    ' /* ' +
    MARKER +
    ' */ = {\n' +
    '\t\t\tisa = PBXShellScriptBuildPhase;\n' +
    '\t\t\tbuildActionMask = 2147483647;\n' +
    '\t\t\tfiles = (\n' +
    '\t\t\t);\n' +
    '\t\t\tinputPaths = (\n' +
    '\t\t\t);\n' +
    '\t\t\tname = "' +
    MARKER +
    '";\n' +
    '\t\t\toutputPaths = (\n' +
    '\t\t\t);\n' +
    '\t\t\trunOnlyForDeploymentPostprocessing = 0;\n' +
    '\t\t\tshellPath = /bin/sh;\n' +
    '\t\t\tshellScript = "\\"${SRCROOT}/' +
    SCRIPT_REL +
    '\\"\\n";\n' +
    '\t\t\tshowEnvVarsInLog = 0;\n' +
    '\t\t};\n';

  const shellEndMarker = '/* End PBXShellScriptBuildPhase section */';
  if (!contents.includes(shellEndMarker)) {
    return false;
  }
  const embedLine = `\t\t\t\t${embedPhaseId} /* [CP] Embed Pods Frameworks */,`;
  const buildPhaseLine = `\t\t\t\t${PHASE_ID} /* ${MARKER} */,`;
  if (!contents.includes(embedLine) || contents.includes(buildPhaseLine)) {
    return false;
  }

  contents = contents.replace(shellEndMarker, `${phaseBlock}${shellEndMarker}`);
  contents = contents.replace(embedLine, `${embedLine}\n${buildPhaseLine}`);

  fs.writeFileSync(pbxPath, contents);
  return true;
}

function withHermesDsym(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const projectName = cfg.modRequest.projectName || 'TrimiT';
      ensureHermesScript(iosRoot);
      const pbxPath = path.join(iosRoot, `${projectName}.xcodeproj`, 'project.pbxproj');
      if (fs.existsSync(pbxPath)) {
        patchPbxproj(pbxPath);
      }
      return cfg;
    },
  ]);
}

module.exports = withHermesDsym;
module.exports.patchPbxproj = patchPbxproj;
module.exports.MARKER = MARKER;
module.exports.PHASE_ID = PHASE_ID;

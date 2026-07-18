/**
 * Ensure Xcode Archive does not fail when SENTRY_AUTH_TOKEN is missing.
 * Matches Android local builds (SENTRY_DISABLE_AUTO_UPLOAD=true).
 * Crash reporting via DSN still works; only source-map / dSYM upload is skipped.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'SENTRY_DISABLE_AUTO_UPLOAD';
const LINE = 'export SENTRY_DISABLE_AUTO_UPLOAD=true';

function ensureXcodeEnv(filePath) {
  let contents = '';
  if (fs.existsSync(filePath)) {
    contents = fs.readFileSync(filePath, 'utf8');
  }
  if (contents.includes(MARKER)) {
    return;
  }
  const suffix = contents.endsWith('\n') || contents.length === 0 ? '' : '\n';
  fs.writeFileSync(
    filePath,
    `${contents}${suffix}# Skip Sentry source-map / dSYM upload without auth token (Archive still succeeds)\n${LINE}\n`,
    'utf8'
  );
}

function withSentryDisableAutoUpload(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;
      ensureXcodeEnv(path.join(iosRoot, '.xcode.env'));
      return cfg;
    },
  ]);
}

module.exports = withSentryDisableAutoUpload;
module.exports.ensureXcodeEnv = ensureXcodeEnv;

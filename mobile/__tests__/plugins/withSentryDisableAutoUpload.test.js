const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  ensureXcodeEnv,
} = require('../../plugins/withSentryDisableAutoUpload');

describe('withSentryDisableAutoUpload', () => {
  it('appends SENTRY_DISABLE_AUTO_UPLOAD when missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-xcode-'));
    const file = path.join(dir, '.xcode.env');
    fs.writeFileSync(file, 'export NODE_BINARY=node\n', 'utf8');
    ensureXcodeEnv(file);
    const text = fs.readFileSync(file, 'utf8');
    expect(text).toContain('export SENTRY_DISABLE_AUTO_UPLOAD=true');
    expect(text).toContain('export NODE_BINARY=node');
  });

  it('is idempotent when already present', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-xcode-'));
    const file = path.join(dir, '.xcode.env');
    fs.writeFileSync(file, 'export SENTRY_DISABLE_AUTO_UPLOAD=true\n', 'utf8');
    ensureXcodeEnv(file);
    ensureXcodeEnv(file);
    const matches = fs
      .readFileSync(file, 'utf8')
      .match(/SENTRY_DISABLE_AUTO_UPLOAD=true/g);
    expect(matches).toHaveLength(1);
  });
});

/**
 * @jest-environment node
 */
const path = require('path');
const { execFileSync } = require('child_process');

describe('verify-android-push', () => {
  it('exits non-zero when google-services.json is missing', () => {
    const script = path.join(__dirname, '../../scripts/verify-android-push.cjs');
    let code = 0;
    try {
      execFileSync(process.execPath, [script], { stdio: 'pipe' });
    } catch (e) {
      code = e.status;
    }
    // Missing file in CI/dev without Firebase → expect failure (documents root cause).
    const gsfExists = require('fs').existsSync(
      path.join(__dirname, '../../google-services.json')
    );
    if (gsfExists) {
      expect(code).toBe(0);
    } else {
      expect(code).toBe(1);
    }
  });
});

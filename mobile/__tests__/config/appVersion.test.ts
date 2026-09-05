import { APP_VERSION, APP_VERSION_SHORT, formatVersionLine } from '../../src/config/appVersion';

describe('displayed app version', () => {
  it('shows version 1.1.0 in Profile and Settings metadata', () => {
    expect(APP_VERSION).toBe('1.1.0');
    expect(APP_VERSION_SHORT).toBe('1.1.0');
    expect(formatVersionLine()).toContain('v1.1.0');
  });
});

/**
 * Unit tests for src/lib/buildConfig.ts
 * Covers: buildConfig exports and getReleaseConfigIssues
 *
 * Note: buildConfig reads from expo-constants and process.env at module load.
 * We test the structural shape and the getReleaseConfigIssues logic.
 */
import { buildConfig, getReleaseConfigIssues } from '../../src/lib/buildConfig';

describe('buildConfig', () => {
  it('has an apiUrl string', () => {
    expect(typeof buildConfig.apiUrl).toBe('string');
    expect(buildConfig.apiUrl.length).toBeGreaterThan(0);
  });

  it('has a publicSiteUrl ending without trailing slash', () => {
    expect(typeof buildConfig.publicSiteUrl).toBe('string');
    expect(buildConfig.publicSiteUrl).not.toMatch(/\/$/);
  });

  it('has resetPasswordDeepLink as a string', () => {
    expect(typeof buildConfig.resetPasswordDeepLink).toBe('string');
  });

  it('enableOnlinePay is a boolean', () => {
    expect(typeof buildConfig.enableOnlinePay).toBe('boolean');
  });
});

describe('getReleaseConfigIssues', () => {
  // In __DEV__ mode (Jest runs in dev), this always returns []
  it('returns empty array in development mode', () => {
    // Jest always runs with __DEV__ = true
    const issues = getReleaseConfigIssues();
    expect(issues).toEqual([]);
  });
});

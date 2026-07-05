import { describe, it, expect } from 'vitest';
import { GOOGLE_LOGIN_ENABLED } from '../../src/config/auth';

describe('auth config', () => {
  it('enables Google login on web auth screens', () => {
    expect(GOOGLE_LOGIN_ENABLED).toBe(true);
  });
});

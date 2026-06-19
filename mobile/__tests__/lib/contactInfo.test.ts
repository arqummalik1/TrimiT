/**
 * Unit tests for src/lib/contactInfo.ts
 * Covers: SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY, SUPPORT_EMAIL,
 *         PUBLIC_SITE_URL, LEGAL_URLS
 */
import {
  SUPPORT_PHONE,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_EMAIL,
  PUBLIC_SITE_URL,
  LEGAL_URLS,
} from '../../src/lib/contactInfo';

describe('contactInfo', () => {
  it('exports a raw support phone number', () => {
    expect(SUPPORT_PHONE).toMatch(/^\+\d{12}$/);
  });

  it('exports a formatted support phone with spaces', () => {
    expect(SUPPORT_PHONE_DISPLAY).toContain('+91');
    expect(SUPPORT_PHONE_DISPLAY.length).toBeGreaterThan(SUPPORT_PHONE.length);
  });

  it('exports a valid support email', () => {
    expect(SUPPORT_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('PUBLIC_SITE_URL is a valid HTTPS URL', () => {
    expect(PUBLIC_SITE_URL).toMatch(/^https:\/\/.+/);
    expect(PUBLIC_SITE_URL).not.toMatch(/\/$/);
  });

  describe('LEGAL_URLS', () => {
    it('has privacy URL ending with /privacy', () => {
      expect(LEGAL_URLS.privacy).toMatch(/\/privacy$/);
    });

    it('has terms URL ending with /terms', () => {
      expect(LEGAL_URLS.terms).toMatch(/\/terms$/);
    });

    it('has contact URL ending with /contact', () => {
      expect(LEGAL_URLS.contact).toMatch(/\/contact$/);
    });

    it('accountDeletion URL points to contact', () => {
      expect(LEGAL_URLS.accountDeletion).toBe(LEGAL_URLS.contact);
    });

    it('all URLs start with the public site URL', () => {
      expect(LEGAL_URLS.privacy).toMatch(new RegExp(`^${PUBLIC_SITE_URL}`));
      expect(LEGAL_URLS.terms).toMatch(new RegExp(`^${PUBLIC_SITE_URL}`));
      expect(LEGAL_URLS.contact).toMatch(new RegExp(`^${PUBLIC_SITE_URL}`));
    });
  });
});

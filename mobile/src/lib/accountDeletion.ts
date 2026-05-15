/**
 * Public web URL for account deletion (Play Console + in-app link).
 * Set EXPO_PUBLIC_PUBLIC_SITE_URL in EAS secrets after Vercel deploy
 * (e.g. https://your-project.vercel.app). No trailing slash.
 */
function publicSiteBase(): string {
  const raw = process.env.EXPO_PUBLIC_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  return raw || 'https://trimit.app';
}

export const ACCOUNT_DELETION_WEB_URL = `${publicSiteBase()}/contact`;

export const ACCOUNT_DELETION_SUPPORT_EMAIL = 'privacy@trimit.app';

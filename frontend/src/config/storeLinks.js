/** Android package — update listing URL when app is live on Play Console. */
export const PLAY_STORE_URL =
  (process.env.REACT_APP_PLAY_STORE_URL || '').trim() ||
  'https://play.google.com/store/apps/details?id=com.trimit.app';

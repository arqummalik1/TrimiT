import { getEnv } from './env';

/** Google Drive folder with the TrimiT APK (legacy fallback, pre-Play-Store). */
export const APK_DOWNLOAD_FOLDER_URL =
  'https://drive.google.com/drive/u/0/folders/1jZg_nTVk_tnIh1jPm-rG8ABkeINqrsEW';

/** Canonical Google Play listing — the app is LIVE on the Play Store. */
export const DEFAULT_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.trimit.app';

/**
 * Primary Android download link (header, footer, landing).
 * Defaults to the live Play Store listing. Override on Vercel:
 * REACT_APP_DOWNLOAD_APP_URL
 */
export const DOWNLOAD_APP_URL =
  getEnv('DOWNLOAD_APP_URL').trim() || DEFAULT_PLAY_STORE_URL;

/**
 * Footer / badges. Uses an explicit REACT_APP_PLAY_STORE_URL when set,
 * otherwise falls back to DOWNLOAD_APP_URL (the Play Store by default).
 */
export const PLAY_STORE_URL = getEnv('PLAY_STORE_URL').trim() || DOWNLOAD_APP_URL;

/** True only when the resolved link still points at the Drive APK folder. */
export const IS_APK_DRIVE_DOWNLOAD = PLAY_STORE_URL.includes('drive.google.com');

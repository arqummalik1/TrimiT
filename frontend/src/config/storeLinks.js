import { getEnv } from './env';

/** Google Drive folder with the TrimiT APK (until Play Store listing is live). */
export const APK_DOWNLOAD_FOLDER_URL =
  'https://drive.google.com/drive/u/0/folders/1jZg_nTVk_tnIh1jPm-rG8ABkeINqrsEW';

/**
 * Primary Android download link (header, footer).
 * Override on Vercel: REACT_APP_DOWNLOAD_APP_URL
 */
export const DOWNLOAD_APP_URL =
  getEnv('DOWNLOAD_APP_URL').trim() || APK_DOWNLOAD_FOLDER_URL;

/**
 * Footer / badges — uses Play Store URL when set, otherwise same Drive folder as APK.
 * When live: REACT_APP_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.trimit.app
 */
export const PLAY_STORE_URL = getEnv('PLAY_STORE_URL').trim() || DOWNLOAD_APP_URL;

/** True when we are still pointing users at Drive (not the Play listing). */
export const IS_APK_DRIVE_DOWNLOAD =
  !getEnv('PLAY_STORE_URL').trim() || PLAY_STORE_URL.includes('drive.google.com');

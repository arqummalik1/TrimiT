import versionMeta from '../../../shared/app-version.json';

export const PRODUCT_NAME = versionMeta.productName;
export const APP_VERSION = versionMeta.version;
export const APP_VERSION_SHORT = versionMeta.versionShort;
export const APP_RELEASE_CHANNEL = versionMeta.releaseChannel;
export const COPYRIGHT_YEAR = versionMeta.copyrightYear;

export function formatVersionBadge() {
  return `${PRODUCT_NAME} v${APP_VERSION}`;
}

export function formatVersionLine() {
  return `${formatVersionBadge()} · ${APP_RELEASE_CHANNEL}`;
}

export function formatCopyright() {
  return `© ${COPYRIGHT_YEAR} ${PRODUCT_NAME}. All rights reserved.`;
}

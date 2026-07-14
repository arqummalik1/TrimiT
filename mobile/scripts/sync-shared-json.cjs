#!/usr/bin/env node
/**
 * Copy shared/*.json that mobile imports into mobile/src/config/.
 *
 * Metro / Xcode JS bundling cannot resolve files outside mobile/.
 * Source of truth stays in TrimiT/shared/ — backend reads it directly.
 *
 * Always run before Metro (expo start, Xcode "Bundle React Native code").
 * metro.config.js requires this file so Xcode builds cannot skip it.
 */
const fs = require('fs');
const path = require('path');

const mobileRoot = path.join(__dirname, '..');
const sharedRoot = path.join(mobileRoot, '..', 'shared');
const destDir = path.join(mobileRoot, 'src', 'config');

const FILES = ['app-version.json', 'push-constants.json'];

function syncSharedJson() {
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of FILES) {
    const src = path.join(sharedRoot, name);
    const dest = path.join(destDir, name);
    if (!fs.existsSync(src)) {
      console.error(`[sync-shared-json] Missing: ${src}`);
      process.exit(1);
    }
    fs.copyFileSync(src, dest);
    console.log(`[sync-shared-json] Wrote ${path.relative(mobileRoot, dest)}`);
  }
}

syncSharedJson();

module.exports = { syncSharedJson, FILES };

#!/usr/bin/env node
/**
 * Copy shared/app-version.json into the mobile bundle (Metro cannot import outside mobile/).
 * Source of truth: TrimiT/shared/app-version.json
 */
const fs = require('fs');
const path = require('path');

const mobileRoot = path.join(__dirname, '..');
const src = path.join(mobileRoot, '..', 'shared', 'app-version.json');
const dest = path.join(mobileRoot, 'src', 'config', 'app-version.json');

if (!fs.existsSync(src)) {
  console.error('[sync-app-version] Missing:', src);
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log('[sync-app-version] Wrote', path.relative(mobileRoot, dest));

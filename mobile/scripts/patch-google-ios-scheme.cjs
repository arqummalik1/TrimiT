#!/usr/bin/env node
/**
 * Patch ios/TrimiT/Info.plist Google URL scheme from mobile/.env
 * without a full expo prebuild. Safe / idempotent.
 */
const fs = require('fs');
const path = require('path');
const {
  iosUrlSchemeFromClientId,
} = require('../plugins/withGoogleIosUrlSchemeFromEnv');

const mobileRoot = path.join(__dirname, '..');

function loadDotEnv() {
  const envPath = path.join(mobileRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

function main() {
  loadDotEnv();
  const scheme = iosUrlSchemeFromClientId(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || ''
  );
  if (!scheme) {
    console.error(
      '[patch-google-ios-scheme] EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID missing or invalid'
    );
    process.exit(1);
  }

  const plistPath = path.join(mobileRoot, 'ios', 'TrimiT', 'Info.plist');
  if (!fs.existsSync(plistPath)) {
    console.error('[patch-google-ios-scheme] Missing', plistPath);
    process.exit(1);
  }

  let xml = fs.readFileSync(plistPath, 'utf8');
  const re =
    /<string>com\.googleusercontent\.apps\.[^<]+<\/string>/g;
  if (!re.test(xml)) {
    console.error(
      '[patch-google-ios-scheme] No googleusercontent URL scheme found in Info.plist'
    );
    process.exit(1);
  }
  xml = xml.replace(re, `<string>${scheme}</string>`);
  fs.writeFileSync(plistPath, xml);
  console.log(
    '[patch-google-ios-scheme] Wrote',
    scheme.slice(0, 48) + '…'
  );
}

if (require.main === module) {
  main();
}

module.exports = { main };

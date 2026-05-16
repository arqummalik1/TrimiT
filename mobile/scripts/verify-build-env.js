#!/usr/bin/env node
/**
 * Fail fast before a 30+ minute APK/AAB build if required EXPO_PUBLIC_* vars are missing.
 * Loads mobile/.env automatically (same as app.config.js).
 */

const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return false;
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
  return true;
}

const hasEnvFile = loadDotEnv();

const REQUIRED = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
];

const RECOMMENDED = [
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_PUBLIC_SITE_URL',
];

const OPTIONAL = ['EXPO_PUBLIC_SENTRY_DSN'];

function isSet(name) {
  const v = process.env[name];
  return typeof v === 'string' && v.trim().length > 0 && !v.startsWith('$');
}

function main() {
  const missing = REQUIRED.filter((k) => !isSet(k));
  const weak = RECOMMENDED.filter((k) => !isSet(k));

  console.log('\n=== TrimiT build environment check ===\n');
  console.log(hasEnvFile ? 'Loaded: mobile/.env\n' : 'No mobile/.env file — using shell env only\n');

  for (const k of REQUIRED) {
    console.log(`${isSet(k) ? '✓' : '✗'} ${k}${isSet(k) ? '' : ' (REQUIRED)'}`);
  }
  for (const k of RECOMMENDED) {
    console.log(`${isSet(k) ? '✓' : '○'} ${k}${isSet(k) ? '' : ' (recommended — API uses Render fallback)'}`);
  }
  for (const k of OPTIONAL) {
    console.log(`${isSet(k) ? '✓' : '○'} ${k}${isSet(k) ? '' : ' (optional)'}`);
  }

  if (missing.length > 0) {
    console.error(
      '\n❌ Build blocked: missing required variables.\n' +
        '   Create mobile/.env from env.example and fill Supabase + Google Maps keys.\n' +
        '   Then: npm run verify:env\n\n' +
        '   EAS cloud: run ./scripts/push-expo-env.sh or set vars on expo.dev → trimit → Environment variables.\n' +
        '   Then: npx eas-cli env:list --environment preview\n'
    );
    process.exit(1);
  }

  if (weak.length > 0) {
    console.warn('\n⚠️  Some recommended vars are unset; build will continue.\n');
  } else {
    console.log('\n✅ Environment OK for release build.\n');
  }
}

main();

#!/usr/bin/env node
/**
 * Fail fast if Android remote push prerequisites are missing.
 *
 * Android Expo push = FCM:
 * 1. mobile/google-services.json (from Firebase; wired via app.config.js)
 * 2. FCM V1 service account uploaded on expo.dev → Credentials (human step)
 *
 * Without (1), preview/production APKs cannot register a device FCM token →
 * owners only see in-app Realtime modal when the app is open.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const gsf = path.join(root, 'google-services.json');

if (!fs.existsSync(gsf)) {
  console.error(`
[verify:android-push] MISSING mobile/google-services.json

Root cause of “no Android tray push for salon owners”:
  - In-app Accept modal = Supabase Realtime (works when app is open)
  - Background / killed tray alert = Expo Push → FCM (requires Firebase)

Do this once:
  1. Firebase Console → add Android app package com.trimit.app
  2. Download google-services.json → save as mobile/google-services.json
  3. Expo.dev project → Credentials → Android → upload FCM V1 service account JSON
  4. Rebuild: npm run build:apk:local (or AAB)

Customer “appointment soon” on Expo Go is often a LOCAL scheduled reminder,
not proof that Android FCM remote push is configured.
`);
  process.exit(1);
}

try {
  const parsed = JSON.parse(fs.readFileSync(gsf, 'utf8'));
  const clients = parsed.client || [];
  const packages = clients
    .map((c) => c?.client_info?.android_client_info?.package_name)
    .filter(Boolean);
  if (packages.length && !packages.includes('com.trimit.app')) {
    console.warn(
      `[verify:android-push] Warning: google-services.json packages=${packages.join(', ')} — expected com.trimit.app`
    );
  }
  console.log('[verify:android-push] google-services.json present OK');
  console.log(
    '[verify:android-push] Reminder: also upload FCM V1 key at expo.dev → Credentials → Android'
  );
} catch (e) {
  console.error('[verify:android-push] Invalid google-services.json:', e.message);
  process.exit(1);
}

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/load-env-for-build.sh
source scripts/ensure-node-22.sh

export NODE_ENV=production

# Stale PackageList without RNGoogleSignin → "Google sign-in is not available in this build"
echo "→ Cleaning Android autolinking cache (ensures Google Sign-In native module links)…"
rm -rf android/build/generated/autolinking android/app/build/generated/autolinking

echo "→ Building preview APK (env loaded from .env)…"
npx eas-cli@18.13.0 build --profile preview --platform android --local --non-interactive "$@"

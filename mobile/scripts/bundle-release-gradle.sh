#!/usr/bin/env bash
# TEMPORARY: build a signed release AAB directly via Gradle (:app:bundleRelease),
# bypassing the EAS local shallow-clone. Loads mobile/.env so EXPO_PUBLIC_* are
# inlined into the JS bundle, pins Node 22, and injects the real upload keystore
# from credentials.json at runtime (no secrets written into this file).
# Safe to delete.
set -euo pipefail
cd "$(dirname "$0")/.."

source scripts/load-env-for-build.sh
source scripts/ensure-node-22.sh

KS="$PWD/credentials/android/keystore.jks"
STORE_PW="$(node -e "process.stdout.write(require('./credentials.json').android.keystore.keystorePassword)")"
KEY_ALIAS="$(node -e "process.stdout.write(require('./credentials.json').android.keystore.keyAlias)")"
KEY_PW="$(node -e "process.stdout.write(require('./credentials.json').android.keystore.keyPassword)")"

echo "→ Gradle :app:bundleRelease (signed with upload keystore)…"
cd android
./gradlew :app:bundleRelease \
  -PTRIMIT_UPLOAD_STORE_FILE="$KS" \
  -PTRIMIT_UPLOAD_STORE_PASSWORD="$STORE_PW" \
  -PTRIMIT_UPLOAD_KEY_ALIAS="$KEY_ALIAS" \
  -PTRIMIT_UPLOAD_KEY_PASSWORD="$KEY_PW" \
  --no-daemon --stacktrace

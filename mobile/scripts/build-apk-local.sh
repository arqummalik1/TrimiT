#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/load-env-for-build.sh
source scripts/ensure-node-22.sh

export NODE_ENV=production

echo "→ Building preview APK (env loaded from .env)…"
npx eas-cli@18.13.0 build --profile preview --platform android --local --non-interactive "$@"

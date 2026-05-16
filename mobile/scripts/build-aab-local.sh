#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/load-env-for-build.sh
source scripts/ensure-node-22.sh

export NODE_ENV=production

echo "→ Building production AAB (env loaded from .env)…"
npx eas-cli@18.13.0 build --profile production --platform android --local --non-interactive "$@"

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/load-env-for-build.sh
source scripts/ensure-node-22.sh

export NODE_ENV=production
# Sentry source-map upload requires a valid auth token in CI — disable it
# during the Gradle build to prevent sentry-cli from failing the AAB.
# Crash reporting still works at runtime via the DSN.
export SENTRY_DISABLE_AUTO_UPLOAD=true

# TMPDIR must be outside the project tree — EAS local build copies the repo
# root into a temp dir, so if TMPDIR is inside the project it tries to copy
# a directory into a subdirectory of itself (EINVAL).
export TMPDIR="${TMPDIR:-/tmp}/trimit-aab-$$"
mkdir -p "$TMPDIR"

echo "→ Cleaning Android autolinking cache (ensures Google Sign-In native module links)…"
rm -rf android/build/generated/autolinking android/app/build/generated/autolinking

echo "→ Building production AAB (env loaded from .env)…"
npx eas-cli@18.13.0 build --profile production --platform android --local --non-interactive "$@"

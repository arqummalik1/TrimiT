#!/usr/bin/env bash
# TEMPORARY wrapper: identical to build-aab-local.sh but points TMPDIR outside
# the repo so EAS local "shallow clone" doesn't try to copy the monorepo root
# into its own subdirectory (EINVAL). Safe to delete.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/load-env-for-build.sh
source scripts/ensure-node-22.sh

export PATH="$PWD/.tmp/bin:$PATH"
export TMPDIR="$HOME/.trimit-eas-tmp"
mkdir -p "$TMPDIR"
export NODE_ENV=production

echo "→ Building production AAB (TMPDIR outside repo: $TMPDIR)…"
npx eas-cli@18.13.0 build --profile production --platform android --local --non-interactive "$@"

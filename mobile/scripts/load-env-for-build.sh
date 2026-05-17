#!/usr/bin/env bash
# Load mobile/.env into the shell so eas.json "$EXPO_PUBLIC_*" substitution works on local builds.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "❌ mobile/.env not found."
  echo "   Copy env.example → .env and fill Supabase + Google Maps keys."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

# Defaults for public endpoints (match apiClient production fallback)
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://trimit-az5h.onrender.com}"
export EXPO_PUBLIC_PUBLIC_SITE_URL="${EXPO_PUBLIC_PUBLIC_SITE_URL:-https://trimit.online}"
export EXPO_PUBLIC_ENABLE_ONLINE_PAY="${EXPO_PUBLIC_ENABLE_ONLINE_PAY:-false}"
export SENTRY_DISABLE_AUTO_UPLOAD="${SENTRY_DISABLE_AUTO_UPLOAD:-true}"

node scripts/verify-build-env.js

echo ""
echo "Env ready for EAS (exported to shell — not using eas.json \$VAR placeholders)."
echo "  API:      ${EXPO_PUBLIC_API_URL}"
echo "  Supabase: ${EXPO_PUBLIC_SUPABASE_URL:0:40}..."
echo "  Maps:     ${EXPO_PUBLIC_GOOGLE_MAPS_API_KEY:0:12}..."
echo ""

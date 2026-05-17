#!/usr/bin/env bash
# Push environment variables from mobile/.env to Expo (create only).
# Use after you cleared the Expo dashboard — does NOT delete anything.
#
# Usage: cd mobile && ./scripts/push-expo-env.sh

set -euo pipefail
cd "$(dirname "$0")/.."

EAS="${EAS_CLI:-npx eas-cli@latest}"

if [[ ! -f .env ]]; then
  echo "Copy env.example to .env and fill in your values first."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

create_var() {
  local name=$1
  local value=$2
  local visibility=$3
  if [[ -z "${value:-}" ]]; then
    echo "skip $name (empty in .env)"
    return 0
  fi
  echo "Creating $name ($visibility)..."
  $EAS env:create \
    --name "$name" \
    --value "$value" \
    --environment development \
    --environment preview \
    --environment production \
    --visibility "$visibility" \
    --force \
    --non-interactive
}

echo "Pushing TrimiT env vars to Expo (development + preview + production)..."
create_var EXPO_PUBLIC_API_URL "${EXPO_PUBLIC_API_URL}" plaintext
create_var EXPO_PUBLIC_SUPABASE_URL "${EXPO_PUBLIC_SUPABASE_URL}" plaintext
create_var EXPO_PUBLIC_SUPABASE_ANON_KEY "${EXPO_PUBLIC_SUPABASE_ANON_KEY}" sensitive
create_var EXPO_PUBLIC_GOOGLE_MAPS_API_KEY "${EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}" sensitive
create_var EXPO_PUBLIC_SENTRY_DSN "${EXPO_PUBLIC_SENTRY_DSN:-}" sensitive
create_var EXPO_PUBLIC_PUBLIC_SITE_URL "${EXPO_PUBLIC_PUBLIC_SITE_URL:-https://trimit.online}" plaintext

if [[ -n "${SENTRY_AUTH_TOKEN:-}" ]]; then
  echo "Creating SENTRY_AUTH_TOKEN (sensitive)..."
  $EAS env:create \
    --name SENTRY_AUTH_TOKEN \
    --value "$SENTRY_AUTH_TOKEN" \
    --environment development \
    --environment preview \
    --environment production \
    --visibility sensitive \
    --force \
    --non-interactive
else
  echo "skip SENTRY_AUTH_TOKEN (add to .env for EAS source map uploads)"
fi

echo ""
echo "Note: EXPO_PUBLIC_ENABLE_ONLINE_PAY=false is set in eas.json (production) — no Expo variable needed."
echo "Done. Check expo.dev → trimit → Environment variables (no Secret visibility on EXPO_PUBLIC_*)."

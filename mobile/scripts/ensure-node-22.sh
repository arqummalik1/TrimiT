#!/usr/bin/env bash
# EAS local builds expect Node 22 (see eas.json). Node 23 triggers EBADENGINE noise and mismatches.
set -euo pipefail

need_major=22
current="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"

if [[ "$current" == "$need_major" ]]; then
  return 0 2>/dev/null || exit 0
fi

FNM_BIN="$(command -v fnm 2>/dev/null || true)"
if [[ -z "$FNM_BIN" && -x /opt/homebrew/bin/fnm ]]; then
  FNM_BIN=/opt/homebrew/bin/fnm
fi

if [[ -n "$FNM_BIN" ]]; then
  eval "$("$FNM_BIN" env)"
  "$FNM_BIN" use 22 2>/dev/null || { "$FNM_BIN" install 22 && "$FNM_BIN" use 22; }
elif [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  nvm use 22 2>/dev/null || nvm install 22 && nvm use 22
else
  echo "⚠️  Node $(node -v) detected; EAS expects Node 22.x."
  echo "   Install fnm/nvm and run: fnm use 22   OR   nvm use 22"
  echo "   Continuing anyway — build may warn about engine mismatch."
  exit 0
fi

echo "Using Node $(node -v)"

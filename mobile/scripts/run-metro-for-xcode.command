#!/bin/zsh

# Opened by the shared Xcode scheme when a developer presses Run. Keep Metro
# in a visible Terminal tab so its bundle progress and JavaScript errors are
# easy to find.
set -e

TRIMIT_MOBILE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$TRIMIT_MOBILE_ROOT"

# Reuse the Node installation configured for Xcode. This avoids depending on
# whether a developer's interactive shell happens to initialize fnm/nvm before
# this Terminal tab opens.
if [ -f "$TRIMIT_MOBILE_ROOT/ios/.xcode.env" ]; then
  source "$TRIMIT_MOBILE_ROOT/ios/.xcode.env"
fi
if [ -f "$TRIMIT_MOBILE_ROOT/ios/.xcode.env.local" ]; then
  source "$TRIMIT_MOBILE_ROOT/ios/.xcode.env.local"
fi

TRIMIT_NODE_BINARY="${NODE_BINARY:-$(command -v node)}"
if [ -z "$TRIMIT_NODE_BINARY" ] || [ ! -x "$TRIMIT_NODE_BINARY" ]; then
  echo "Unable to find the Node.js executable configured for TrimiT."
  echo "Update mobile/ios/.xcode.env.local or install Node.js, then run again."
  exit 1
fi

TRIMIT_NPM_BINARY="$(dirname "$TRIMIT_NODE_BINARY")/npm"
if [ ! -x "$TRIMIT_NPM_BINARY" ]; then
  echo "Unable to find npm next to $TRIMIT_NODE_BINARY."
  exit 1
fi

if /usr/bin/curl -fsS --max-time 1 http://127.0.0.1:8081/status \
  | /usr/bin/grep -q '^packager-status:running$'; then
  echo "TrimiT Metro is already running on port 8081."
  exit 0
fi

echo "Starting TrimiT Metro for Xcode..."
exec "$TRIMIT_NPM_BINARY" start -- --localhost

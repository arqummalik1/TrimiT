#!/bin/bash

# Xcode LaunchAction pre-action. It is deliberately idempotent: an existing
# healthy Metro server is reused, otherwise a Terminal tab is opened and Xcode
# waits until the server is actually ready before launching the Debug app.
set -u

TRIMIT_MOBILE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRIMIT_METRO_STATUS_URL="http://127.0.0.1:8081/status"
TRIMIT_METRO_COMMAND="$TRIMIT_MOBILE_ROOT/scripts/run-metro-for-xcode.command"

metro_is_ready() {
  /usr/bin/curl -fsS --max-time 1 "$TRIMIT_METRO_STATUS_URL" 2>/dev/null \
    | /usr/bin/grep -q '^packager-status:running$'
}

if metro_is_ready; then
  echo "TrimiT Metro is already ready on port 8081."
  exit 0
fi

echo "Opening TrimiT Metro in Terminal..."
/usr/bin/open -g "$TRIMIT_METRO_COMMAND"

# Prevent the React Native bridge race that previously launched the simulator
# before Metro had bound port 8081. Allow up to 30 seconds for a cold start.
for _attempt in $(/usr/bin/seq 1 60); do
  if metro_is_ready; then
    echo "TrimiT Metro is ready."
    exit 0
  fi
  /bin/sleep 0.5
done

echo "error: TrimiT Metro did not become ready on port 8081 within 30 seconds."
echo "error: Check the Terminal tab opened by Xcode for the Metro startup error."
exit 1

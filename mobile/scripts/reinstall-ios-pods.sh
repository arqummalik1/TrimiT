#!/usr/bin/env bash
# Clean reinstall of CocoaPods for TrimiT iOS.
# Use after moving/renaming the repo, or when Xcode reports missing .xcconfig under Pods.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS="$ROOT/ios"
POD="${POD_BIN:-/opt/homebrew/bin/pod}"

if [[ "$ROOT" == *" "* ]]; then
  echo "ERROR: path contains a space: $ROOT" >&2
  echo "Rename/move to a path without spaces (e.g. Software-Development)." >&2
  exit 1
fi

if [[ ! -x "$POD" ]]; then
  POD="$(command -v pod || true)"
fi
if [[ -z "$POD" ]]; then
  echo "ERROR: CocoaPods 'pod' not found. Install via Homebrew." >&2
  exit 1
fi

cd "$ROOT"
node scripts/verify-ios-paths.js || true

# Patch Podfile maps path before install (idempotent)
node -e "
const fs = require('fs');
const path = require('path');
const { rewritePodfileContents } = require('./plugins/withRelativeMapsPodPath.js');
const podfile = path.join('ios', 'Podfile');
if (!fs.existsSync(podfile)) {
  console.error('Missing ios/Podfile — run: npx expo prebuild --platform ios');
  process.exit(1);
}
const original = fs.readFileSync(podfile, 'utf8');
const { contents, changed } = rewritePodfileContents(original);
if (changed) {
  fs.writeFileSync(podfile, contents);
  console.log('Patched Podfile: relative react-native-google-maps path');
} else {
  console.log('Podfile maps path already relative (or no maps pod line)');
}
"

echo "Removing Pods + Podfile.lock (stale absolute paths)..."
rm -rf "$IOS/Pods" "$IOS/Podfile.lock" "$IOS/build"

echo "pod install (USE_FRAMEWORKS=static) via $POD ..."
cd "$IOS"
USE_FRAMEWORKS=static "$POD" install

cd "$ROOT"
node scripts/verify-ios-paths.js

echo ""
echo "Done. Next:"
echo "  1. Quit Xcode completely (Cmd+Q)"
echo "  2. open \"$IOS/TrimiT.xcworkspace\""
echo "  3. Product → Clean Build Folder, then ▶ Run"
echo ""

#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/OmniPresence.app"
mkdir -p "$APP/Contents/MacOS"
swiftc -O -framework Cocoa -framework WebKit \
  -o "$APP/Contents/MacOS/OmniPresence" \
  "$ROOT/launcher/OmniPresenceWindow.swift"
# Keep project root in Info.plist
/usr/libexec/PlistBuddy -c "Set :OmniPresenceProjectRoot $ROOT" "$APP/Contents/Info.plist" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Add :OmniPresenceProjectRoot string $ROOT" "$APP/Contents/Info.plist"
rm -rf "$HOME/Desktop/OmniPresence.app"
cp -R "$APP" "$HOME/Desktop/OmniPresence.app"
xattr -dr com.apple.quarantine "$APP" "$HOME/Desktop/OmniPresence.app" 2>/dev/null || true
echo "Rebuilt $APP and Desktop copy"

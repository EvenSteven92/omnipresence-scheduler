#!/bin/bash
# Double-click to stop whatever is listening on port 3000
cd "$(dirname "$0")"
PIDS=$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null || true)
if [[ -z "$PIDS" ]]; then
  osascript -e 'display notification "Nothing was running on port 3000" with title "OmniPresence"'
  exit 0
fi
echo "$PIDS" | xargs kill 2>/dev/null || true
sleep 0.5
PIDS=$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null || true)
if [[ -n "$PIDS" ]]; then
  echo "$PIDS" | xargs kill -9 2>/dev/null || true
fi
osascript -e 'display notification "Stopped local server on port 3000" with title "OmniPresence"'

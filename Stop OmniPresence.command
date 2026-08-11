#!/bin/bash
# Quit app if running, free port 3000
osascript -e 'tell application "OmniPresence" to quit' 2>/dev/null || true
sleep 0.3
PIDS=$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null || true)
if [[ -n "$PIDS" ]]; then
  echo "$PIDS" | xargs kill 2>/dev/null || true
  sleep 0.3
  PIDS=$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null || true)
  [[ -n "$PIDS" ]] && echo "$PIDS" | xargs kill -9 2>/dev/null || true
fi
osascript -e 'display notification "OmniPresence stopped" with title "OmniPresence"' 2>/dev/null || true

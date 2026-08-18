#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ ! -d node_modules ]]; then
  echo "Installing worker dependencies…"
  npm install
fi

npm run init-db
exec npm start

#!/bin/bash
# Start the server with hot reload

BUN_PATH="${BUN_PATH:-$HOME/.bun/bin/bun}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

if [ "$1" = "--background" ]; then
  "$BUN_PATH" --watch src/server/index.ts &
  echo "Server started in background (PID: $!)"
else
  exec "$BUN_PATH" --watch src/server/index.ts
fi

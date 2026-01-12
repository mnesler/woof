#!/bin/bash
# Start the TUI in a new Ghostty terminal with hot reload

BUN_PATH="${BUN_PATH:-$HOME/.bun/bin/bun}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

if [ "$1" = "--background" ]; then
  ghostty -e "$BUN_PATH" --watch src/index.tsx &
  echo "UI started in background (Ghostty)"
else
  exec "$BUN_PATH" --watch src/index.tsx
fi

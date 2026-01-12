#!/bin/bash
# Start the full development environment (server + UI)

BUN_PATH="${BUN_PATH:-$HOME/.bun/bin/bun}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$PROJECT_DIR/scripts"

cd "$PROJECT_DIR"

# Parse arguments
UI_MODE="ghostty"  # ghostty or inline
while [[ $# -gt 0 ]]; do
  case $1 in
    --inline)
      UI_MODE="inline"
      shift
      ;;
    --stop)
      exec "$SCRIPT_DIR/dev-stop.sh"
      ;;
    -h|--help)
      echo "Usage: dev.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --inline    Run UI in current terminal (not Ghostty)"
      echo "  --stop      Stop all running dev processes"
      echo "  -h, --help  Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "Starting development environment..."

# Start server in background
echo "Starting server..."
"$BUN_PATH" --watch src/server/index.ts &
SERVER_PID=$!
echo "  Server started (PID: $SERVER_PID)"

# Wait for server to be ready
sleep 1

# Start UI
if [ "$UI_MODE" = "ghostty" ]; then
  echo "Starting UI in Ghostty..."
  ghostty -e "$BUN_PATH" --watch src/index.tsx &
  echo "  UI started in new Ghostty window"
else
  echo "Starting UI inline..."
  exec "$BUN_PATH" --watch src/index.tsx
fi

echo ""
echo "Development environment running!"
echo "  Server: http://localhost:3000"
echo "  UI: Ghostty window"
echo ""
echo "To stop: ./scripts/dev.sh --stop"

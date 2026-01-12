#!/bin/bash
# Stop all running UI and server processes

echo "Stopping UI processes..."
pkill -f "bun.*src/index.tsx" 2>/dev/null && echo "  UI stopped" || echo "  No UI process found"

echo "Stopping server processes..."
pkill -f "bun.*src/server/index.ts" 2>/dev/null && echo "  Server stopped" || echo "  No server process found"

echo "Done."

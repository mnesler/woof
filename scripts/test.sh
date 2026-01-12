#!/bin/bash
# Run tests with optional arguments

BUN_PATH="${BUN_PATH:-$HOME/.bun/bin/bun}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

# Parse arguments
ARGS=()
while [[ $# -gt 0 ]]; do
  case $1 in
    --watch|-w)
      ARGS+=("--watch")
      shift
      ;;
    --coverage|-c)
      ARGS+=("--coverage")
      shift
      ;;
    --update-snapshots|-u)
      ARGS+=("--update-snapshots")
      shift
      ;;
    -h|--help)
      echo "Usage: test.sh [OPTIONS] [FILE...]"
      echo ""
      echo "Options:"
      echo "  -w, --watch             Run tests in watch mode"
      echo "  -c, --coverage          Run with coverage report"
      echo "  -u, --update-snapshots  Update snapshot files"
      echo "  -h, --help              Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./scripts/test.sh                      # Run all tests"
      echo "  ./scripts/test.sh --watch              # Watch mode"
      echo "  ./scripts/test.sh tests/unit/          # Run unit tests only"
      echo "  ./scripts/test.sh -u                   # Update all snapshots"
      exit 0
      ;;
    *)
      ARGS+=("$1")
      shift
      ;;
  esac
done

exec "$BUN_PATH" test "${ARGS[@]}"

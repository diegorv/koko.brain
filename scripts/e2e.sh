#!/usr/bin/env bash
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────
E2E_PORT=1421
MAX_WAIT=30
E2E_LOG="/tmp/kokobrain-e2e-server.log"

# ─── Helpers ──────────────────────────────────────────────────────────
cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  # Force-kill anything left on the E2E port (zombie vite processes)
  lsof -ti:"$E2E_PORT" | xargs kill -9 2>/dev/null || true
}

trap cleanup EXIT

# ─── Pre-cleanup ──────────────────────────────────────────────────────
lsof -ti:"$E2E_PORT" | xargs kill -9 2>/dev/null || true

# ─── Start E2E server ────────────────────────────────────────────────
echo "Starting E2E server on port $E2E_PORT..."
PLAYWRIGHT=true pnpm dev > "$E2E_LOG" 2>&1 &
SERVER_PID=$!

# ─── Wait for server ─────────────────────────────────────────────────
echo -n "Waiting for server"
for i in $(seq 1 "$MAX_WAIT"); do
  if curl -s -o /dev/null http://localhost:"$E2E_PORT"/ 2>/dev/null; then
    echo " ready! (${i}s)"
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo ""
    echo "Error: E2E server process died. Check log: $E2E_LOG"
    exit 1
  fi
  if [ "$i" -eq "$MAX_WAIT" ]; then
    echo ""
    echo "Error: E2E server did not start within ${MAX_WAIT}s. Check log: $E2E_LOG"
    exit 1
  fi
  echo -n "."
  sleep 1
done

# ─── Run tests ────────────────────────────────────────────────────────
echo ""
set +e
npx playwright test --config e2e/playwright.config.ts "$@"
TEST_EXIT=$?
set -e
exit $TEST_EXIT

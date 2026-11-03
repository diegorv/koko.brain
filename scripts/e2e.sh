#!/usr/bin/env bash
# Run the Playwright E2E suite against a fresh dev server.
#
# Usage:
#   bash scripts/e2e.sh                       # run every spec under e2e/specs/
#   bash scripts/e2e.sh path/to/spec.ts ...   # run only the given specs
#   bash scripts/e2e.sh --ui                  # open Playwright UI mode
#
# What this does:
#   1. Kills a server this checkout left listening on the E2E port (zombie
#      vite); a listener started from another checkout stops the run instead
#   2. Starts `PLAYWRIGHT=true pnpm dev` in the background, captures logs to
#      $E2E_LOG so they don't pollute stdout
#   3. Waits up to MAX_WAIT seconds for the server to respond on /
#   4. Forwards every argument to `pnpm exec playwright test`
#   5. Cleans up the server (and any leaked processes on its port) on exit
#
# Port: E2E_PORT when set; otherwise 1421 in the main checkout (and CI), and a
# port from 1422-1499 derived from the checkout path in a linked git worktree,
# so runs in two worktrees do not kill each other's server. Two worktrees can
# still hash to the same port (about 1 in 78): the second run then exits with
# "port in use" and leaves the first one's server alone; set E2E_PORT to retry.

set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────
default_port() {
  local git_dir common_dir top hash
  git_dir=$(git rev-parse --path-format=absolute --git-dir 2>/dev/null) || { echo 1421; return; }
  common_dir=$(git rev-parse --path-format=absolute --git-common-dir)
  if [ "$git_dir" = "$common_dir" ]; then
    echo 1421
    return
  fi
  top=$(git rev-parse --show-toplevel)
  hash=$(printf '%s' "$top" | cksum | cut -d' ' -f1)
  echo $((1422 + hash % 78))
}

E2E_PORT="${E2E_PORT:-$(default_port)}"
if ! [[ "$E2E_PORT" =~ ^[0-9]+$ ]]; then
  echo "Error: E2E_PORT must be a port number, got '$E2E_PORT'"
  exit 1
fi
export E2E_PORT
MAX_WAIT=30
# CI uploads the 1421 log by this name (.github/workflows/e2e.yml).
if [ "$E2E_PORT" = 1421 ]; then
  E2E_LOG="/tmp/kokobrain-e2e-server.log"
else
  E2E_LOG="/tmp/kokobrain-e2e-server-${E2E_PORT}.log"
fi
CHECKOUT=$(pwd -P)

# ─── Helpers ──────────────────────────────────────────────────────────
# Kills the processes listening on the E2E port that run from this checkout.
# With "strict", a listener from anywhere else ends the script instead.
kill_own_listeners() {
  local pid cwd
  for pid in $(lsof -tiTCP:"$E2E_PORT" -sTCP:LISTEN 2>/dev/null || true); do
    cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')
    case "$cwd" in
      "$CHECKOUT"|"$CHECKOUT"/*) kill -9 "$pid" 2>/dev/null || true ;;
      *)
        if [ "${1:-}" = strict ]; then
          echo "Error: port $E2E_PORT is in use by another checkout (pid $pid, $cwd). Set E2E_PORT to a free port."
          exit 1
        fi
        ;;
    esac
  done
}

cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  kill_own_listeners
}

trap cleanup EXIT

# ─── Pre-cleanup ──────────────────────────────────────────────────────
kill_own_listeners strict

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
pnpm exec playwright test --config e2e/playwright.config.ts -x "$@"
TEST_EXIT=$?
set -e
exit $TEST_EXIT

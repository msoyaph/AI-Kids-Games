#!/bin/sh
# Run a heavy task only when no other session's tests, captures or long simulations are running.
#   sh scripts/when-quiet.sh e2e [playwright args…]   (browser tests)
#   sh scripts/when-quiet.sh sim [vitest args…]        (playthrough bot and pacing sims)
# The task names keep this script's own command line free of "playwright test", so other
# sessions' idle checks don't mistake a waiting script for a running one. Exit 75: still busy
# after 2 hours, nothing was started. (Copied from Agentmon.)
cd "$(dirname "$0")/.." || exit 1
node scripts/quiet-check.mjs --wait >/dev/null || { echo "Still busy after 2 hours; not starting." >&2; exit 75; }
task="$1"; shift
case "$task" in
  e2e) exec npx playwright test "$@" ;;
  sim) exec npx vitest run tests/sim "$@" ;;
  *) echo "unknown task $task" >&2; exit 2 ;;
esac

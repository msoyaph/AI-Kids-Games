#!/bin/sh
# Run a heavy task on a frozen copy of the game, so editing can go on while it waits its turn.
#   sh scripts/snap-run.sh e2e [playwright args…] | sim | unit | shots …
# Copies the game (not dist, reports or test results) to reports/tmp/snap, then runs
# scripts/when-quiet.sh there (or the unit tests). Results land in reports/tmp/snap.
cd "$(dirname "$0")/.." || exit 1
SNAP=reports/tmp/snap
rm -rf "$SNAP" && mkdir -p "$SNAP" || exit 1
cp -R src tests scripts index.html package.json tsconfig.json vite.config.ts playwright.config.ts game.json "$SNAP"/ || exit 1
[ -d public ] && cp -R public "$SNAP"/
cd "$SNAP" || exit 1
task="$1"; shift
case "$task" in
  unit) node scripts/quiet-check.mjs --wait >/dev/null && exec npx vitest run tests/unit "$@" ;;
  *) exec sh scripts/when-quiet.sh "$task" "$@" ;;
esac

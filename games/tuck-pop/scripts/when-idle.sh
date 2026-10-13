#!/bin/sh
# Runs a command only when no other test run is active on this machine (other sessions share it):
#   sh scripts/when-idle.sh npx playwright test
# Waits up to 30 minutes, checking every 10 seconds, then gives up. Not counted: this script's own
# parent shells (their command lines mention the test command), and orphaned leftovers (a test
# worker whose run already ended, now owned by launchd).
ancestors=" $$ "
p=$$
while [ "$p" -gt 1 ] 2>/dev/null; do p=$(ps -o ppid= -p "$p" | tr -d ' '); ancestors="$ancestors$p "; done
busy() {
  for pid in $(pgrep -f "[p]laywright test|[v]itest|[c]apture-previews"); do
    case "$ancestors" in *" $pid "*) continue ;; esac
    [ "$(ps -o ppid= -p "$pid" | tr -d ' ')" = "1" ] && continue
    return 0
  done
  return 1
}
i=0
while busy; do
  i=$((i + 1))
  if [ "$i" -gt 180 ]; then echo "Other tests are still running after 30 minutes; not starting." >&2; exit 75; fi
  [ "$i" -eq 1 ] && echo "Waiting for other test runs to finish…" >&2
  sleep 10
done
exec "$@"

#!/usr/bin/env bash
# Spike #78 driver: prove the two acceptance checks for the CEO daemon prototype.
#  1. kill -9 the prototype mid-turn; restart; conversation resumes.
#  2. reset(handoff) starts a new conversation whose first request is only handoff+prompt.
#
# No package install: the SDK is already in the nix store; we symlink it into
# ./node_modules so `import "@earendil-works/pi-coding-agent"` resolves.
set -euo pipefail
cd "$(dirname "$0")"

SDK=$(find /nix/store -maxdepth 7 -path "*/pi-monorepo/node_modules/@earendil-works/pi-coding-agent" 2>/dev/null | head -1)
if [ -z "$SDK" ]; then
  echo "BLOCKED: @earendil-works/pi-coding-agent not found in /nix/store" >&2
  exit 3
fi

mkdir -p node_modules/@earendil-works
ln -sfn "$SDK" node_modules/@earendil-works/pi-coding-agent

rm -f sessions/*.jsonl wake-journal.json run1.log run2.log

# --- acceptance 1: kill -9 mid-turn, restart, resumes ---
node spike.mjs first >run1.log 2>&1 &
pid=$!
sleep 1
kill -9 "$pid"
echo "[run.sh] killed the prototype mid-turn (pid $pid); restarting"

node spike.mjs recover >run2.log 2>&1

if grep -q "recovered:" run2.log; then
  echo "[run.sh] PASS acceptance-1: restart resumed the conversation (see run2.log)"
else
  echo "[run.sh] FAIL acceptance-1: no 'recovered' line" >&2
  cat run2.log >&2
  exit 1
fi

# --- acceptance 2: handoff conversation's first request = handoff + prompt only ---
if grep -q 'handoff] first request has ONLY handoff+prompt: YES' run2.log; then
  echo "[run.sh] PASS acceptance-2: first request is only [handoff, prompt] (see run2.log)"
else
  echo "[run.sh] FAIL acceptance-2: first request not as expected" >&2
  grep "first request" run2.log >&2 || true
  exit 1
fi

echo "[run.sh] DONE: see run1.log, run2.log"

#!/usr/bin/env bash
# test-ticket.sh — tests for `ticket new` validation (ticket #61).
# Runs the real ./ticket binary. Rejections happen before the GitHub token is
# fetched, so no network/creds are needed; a valid ticket proceeds to the token
# step (which may fail in a sandbox), so we only assert no *validation* error.
set -uo pipefail
D=$(cd "$(dirname "$(readlink -f "$0")")" && pwd)
T="$D/ticket"
pass=0; fail=0
ok(){ printf 'ok - %s\n' "$1"; pass=$((pass+1)); }
notok(){ printf 'not ok - %s\n' "$1"; fail=$((fail+1)); }

# 1. reject unscoped: missing Files: line and missing ## Acceptance section.
out=$("$T" new -t "unscoped" -k Task -S M -b "just prose, no structure" 2>&1) && rc=0 || rc=$?
if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -qF "must have a Files: line"; then
  ok "reject unscoped body (no Files: line)"
else
  notok "reject unscoped body (no Files: line): rc=$rc out=$out"
fi

# 1b. Files: present but missing ## Acceptance section.
out=$("$T" new -t "no-acceptance" -k Task -S M -b $'Files: tools/ticket\n\nno acceptance here' 2>&1) && rc=0 || rc=$?
if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -qF "must have a ## Acceptance section"; then
  ok "reject body missing ## Acceptance"
else
  notok "reject body missing ## Acceptance: rc=$rc out=$out"
fi

# 1c. Files: + ## Acceptance present, but no Verify: line.
out=$("$T" new -t "no-verify" -k Task -S M -b $'Files: tools/ticket\n\n## Acceptance\n- does something' 2>&1) && rc=0 || rc=$?
if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -qF "must have a Verify: line"; then
  ok "reject ## Acceptance with no Verify: line"
else
  notok "reject ## Acceptance with no Verify: line: rc=$rc out=$out"
fi

# 2. reject size L with the required "split into S/M tickets" message.
valid=$'Valid ticket.\n\nFiles: tools/ticket tools/test-ticket.sh\n\n## Acceptance\n- Verify: `shellcheck tools/ticket tools/test-ticket.sh` reports no findings'
out=$("$T" new -t "big" -k Task -S L -b "$valid" 2>&1) && rc=0 || rc=$?
if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -qF "split into S/M tickets"; then
  ok "reject size L: split into S/M tickets"
else
  notok "reject size L: rc=$rc out=$out"
fi

# 3. accept a well-formed ticket: validation emits none of the rejection strings.
out=$("$T" new -t "valid" -k Task -S M -b "$valid" 2>&1) && rc=0 || rc=$?
for e in "must have a Files: line" "must have a ## Acceptance section" "must have a Verify: line" "split into S/M tickets"; do
  if printf '%s' "$out" | grep -qF "$e"; then notok "valid ticket rejected: $e"; fi
done
if ! printf '%s' "$out" | grep -qE "must have a (Files|## Acceptance|Verify)|split into S/M"; then
  ok "accept a well-formed ticket (no validation rejection)"
fi

echo "# pass=$pass fail=$fail"
[ "$fail" -eq 0 ] || exit 1

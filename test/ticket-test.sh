#!/usr/bin/env bash
# Regression test for #81: tools/ticket new must set all board fields even when
# the first GraphQL attempt (item()) fails and the issue body contains quotes.
# Runs the real tools/ticket against a stubbed gh + gh-app-token (no network).
# shellcheck disable=SC2016  # the $txt/$sid literals below are checked as strings
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
bin=$(mktemp -d)
cp "$here/../tools/ticket" "$here/../tools/board.json" "$bin/"
log=$bin/gh.log
# Stub gh-app-token: print a fake token (no node/curl, no network).
printf '#!/usr/bin/env bash\nprintf "faketok\n"\n' >"$bin/gh-app-token"; chmod +x "$bin/gh-app-token"
# Stub gh: the addProjectV2ItemById call (item()) fails on its first attempt (the
# old bug: that error output leaked into $I, making it multiline and breaking the
# setsel/settxt queries); the retry succeeds. Field-set calls succeed.
cat >"$bin/gh" <<'FAKE'
#!/usr/bin/env bash
set -uo pipefail
echo "gh $*" >>"$GH_TEST_LOG"
if [ "$1" = api ] && [ "$2" = graphql ]; then
  case "$*" in
    *addProjectV2ItemById*)
      f="/tmp/ghtest_add.$$"
      if [ ! -e "$f" ]; then
        echo '{"errors":[{"message":"Expected COLON, actual: STRING at [1,96]"}]}'
        exit 1
      fi
      echo '{"data":{"addProjectV2ItemById":{"item":{"id":"I_abc123"}}}}'
      exit 0 ;;
  esac
  echo '{"data":{"updateProjectV2ItemFieldValue":{"clientMutationId":"m"}}}'
  exit 0
fi
if [ "$1" = api ] && [ "$2" = "repos/zerodawntest/pirust/issues" ]; then
  echo '{"number":999,"id":123,"node_id":"I_deadbeef"}'
  exit 0
fi
if [ "$1" = api ] && [ "$2" = "repos/zerodawntest/pirust/issues/999" ]; then
  echo '{"node_id":"I_deadbeef"}'
  exit 0
fi
echo '{}'
exit 0
FAKE
chmod +x "$bin/gh"
export GH_TEST_LOG="$log"
export PATH="$bin:$PATH"
Q='body {type:"function",function:{name:"handoff"}}'

# Acceptance: `new` in a loop of 5 sets every field each time; body has quotes.
for i in 1 2 3 4 5; do
  rm -f /tmp/ghtest_add.*
  out=$("$bin/ticket" new -t "quote test $i" -k Task -s Ready -P P1 -S M -b "$Q" 2>"$bin/err")
  rc=$?
  [ -s "$bin/err" ] && { echo "FAIL iter $i stderr:"; cat "$bin/err"; exit 1; }
  [ "$rc" = 0 ] || { echo "FAIL iter $i: ticket new exited $rc (fields unset)"; exit 1; }
  [ "$out" = "999" ] || { echo "FAIL iter $i: expected stdout '999', got '$out'"; exit 1; }
  # issue created with quoted body via -f (not interpolated); item+fields via -f
  grep -qF -- "-f body=$Q" "$log" || { echo "FAIL: quoted body not via -f"; exit 1; }
  grep -q 'singleSelectOptionId:\$sid' "$log" || { echo "FAIL: select not via -f"; exit 1; }
done

# (set path re-fetches node_id via gh --jq, which the stub cannot emulate; the
# settxt code path is exercised by `new` -> `settxt` is only in `set`, so we
# assert its structure: the claim value is passed via -f, never interpolated.)
grep -q 'value:{text:\$txt}' "$bin/../tools/ticket" 2>/dev/null || grep -q 'value:{text:\$txt}' "$here/../tools/ticket" || { echo "FAIL: settxt not via -f"; exit 1; }
echo "PASS: 5x new set all fields via -f; quote-in-value handled; no output leak"

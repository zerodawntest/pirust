#!/usr/bin/env bash
# Regression test for #81: tools/ticket `new` and `set` must set all board fields
# even when the first GraphQL attempt (item()) fails and the value contains quotes.
# Runs the real tools/ticket against a stubbed gh + gh-app-token (no network).
# The stub gh mirrors real gh: it applies `--jq` to stdout and REJECTS any `-f`
# (and `--raw-field`) whose operand has no `key=` — the old `set`/`settxt` code
# passed the query as a bare `-f 'mutation(...)'` (no key=) which real gh rejects.
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

# Collect args, extracting `--jq <expr>` (real gh applies the filter to stdout).
jq_expr=''
args=()
prev=''
for a in "$@"; do
  if [ "$prev" = "--jq" ]; then jq_expr="$a"; prev=''; continue; fi
  args+=("$a"); prev="$a"
done

# Real gh rejects `-f`/`--raw-field` whose operand lacks `key=value`.
for ((i=0;i<${#args[@]};i++)); do
  if [ "${args[$i]}" = "-f" ] || [ "${args[$i]}" = "--raw-field" ]; then
    case "${args[$((i+1))]}" in
      *=*) : ;;
      *) printf 'gh: invalid %s argument (expected key=value): %s\n' "${args[$i]}" "${args[$((i+1))]}" >&2; exit 1 ;;
    esac
  fi
done

# Real gh (and the GitHub schema) rejects a mutation declaring `$sid:ID!` for
# singleSelectOptionId (String). Fail like the real API so a regression is caught.
for a in "${args[@]}"; do
  case "$a" in
    *'$sid:ID!'*) printf 'gh: Type mismatch on variable $sid and argument singleSelectOptionId (ID! / String)\n' >&2; exit 1 ;;
  esac
done

out='{}'
if [ "${args[0]}" = api ] && [ "${args[1]}" = graphql ]; then
  case "${args[*]}" in
    *addProjectV2ItemById*)
      f="/tmp/ghtest_add.$$"
      if [ ! -e "$f" ]; then
        # First attempt fails: emit error JSON on stdout AND exit non-zero, exactly
        # as real gh does (this is the output that must not leak into $I).
        echo '{"errors":[{"message":"Expected COLON, actual: STRING at [1,96]"}]}'
        exit 1
      fi
      out='{"data":{"addProjectV2ItemById":{"item":{"id":"I_abc123"}}}}'
      ;;
    *)
      out='{"data":{"updateProjectV2ItemFieldValue":{"clientMutationId":"m"}}}'
      ;;
  esac
elif [ "${args[0]}" = api ] && [ "${args[1]}" = "repos/zerodawntest/pirust/issues" ]; then
  out='{"number":999,"id":123,"node_id":"I_deadbeef"}'
elif [ "${args[0]}" = api ] && [ "${args[1]}" = "repos/zerodawntest/pirust/issues/999" ]; then
  out='{"node_id":"I_deadbeef"}'
fi

if [ -n "$jq_expr" ]; then
  printf '%s' "$out" | jq -r "$jq_expr"
else
  printf '%s\n' "$out"
fi
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

# `set` path exercises settxt + the item() refetch (gh --jq). The claim value has
# quotes and must go via -f, never interpolated. The old broken form (`-f
# 'mutation(...)'`, no key=) is rejected by the stub gh, so this fails if regressed.
rm -f /tmp/ghtest_add.*
out=$("$bin/ticket" set 999 -s Done -c "$Q" 2>"$bin/err"); rc=$?
[ "$rc" = 0 ] || { echo "FAIL set: ticket set exited $rc (fields unset)"; cat "$bin/err"; exit 1; }
[ -s "$bin/err" ] && { echo "FAIL set stderr:"; cat "$bin/err"; exit 1; }
grep -qF -- "-f txt=$Q" "$log" || { echo "FAIL: quoted claim not via -f"; exit 1; }
grep -q 'value:{text:\$txt}' "$log" || { echo "FAIL: settxt not via -f"; exit 1; }

echo "PASS: 5x new + set set all fields via -f; quote-in-value handled; no output leak"

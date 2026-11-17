#!/usr/bin/env bash
# Regression test for #176: tools/kpi computes 24h factory KPIs from the usage ledger
# and the digest. Uses the fixtures (3 ledger rows; a digest with 2 merges, one ticket
# done twice). Expects merged=2, firstPass=0.5. Runs offline (no network, no live files).
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d)
cp "$here/../tools/kpi" "$tmp/kpi"
cp "$here/fixtures/kpi/usage.jsonl" "$tmp/usage.jsonl"
cp "$here/fixtures/kpi/digest.log" "$tmp/digest.log"

out="$tmp/kpi.jsonl"
# KPI_SINCE is early so every fixture record is inside the window.
out_json=$(KPI_LEDGER="$tmp/usage.jsonl" KPI_DIGEST="$tmp/digest.log" \
	KPI_SINCE="2026-11-16T00:00:00Z" KPI_OUT="$out" \
	"$tmp/kpi")
rc=$?
[ "$rc" = 0 ] || { echo "FAIL: kpi exited $rc"; exit 1; }

# One JSON object on stdout.
[ "$(printf '%s' "$out_json" | jq -s 'length')" = 1 ] || { echo "FAIL: not one JSON object on stdout"; exit 1; }

get() { printf '%s' "$out_json" | jq -e "$1"; }
get '.runs==3' >/dev/null || { echo "FAIL: runs"; exit 1; }
get '.input==4000' >/dev/null || { echo "FAIL: input"; exit 1; }
get '.output==1000' >/dev/null || { echo "FAIL: output"; exit 1; }
get '.cacheRead==70000' >/dev/null || { echo "FAIL: cacheRead"; exit 1; }
get '.cacheHit==0.95' >/dev/null || { echo "FAIL: cacheHit"; exit 1; }
get '.toolErrorRate==0.33' >/dev/null || { echo "FAIL: toolErrorRate"; exit 1; }
get '.merged==2' >/dev/null || { echo "FAIL: merged"; exit 1; }
get '.firstPass==0.5' >/dev/null || { echo "FAIL: firstPass"; exit 1; }
get '.reverts==1' >/dev/null || { echo "FAIL: reverts"; exit 1; }
get '.strayLaunches==1' >/dev/null || { echo "FAIL: strayLaunches"; exit 1; }
get '.tokensPerMerged==2500' >/dev/null || { echo "FAIL: tokensPerMerged"; exit 1; }

# The JSON object is appended to $KPI_OUT (one line).
[ "$(wc -l <"$out")" = 1 ] || { echo "FAIL: KPI_OUT not appended"; exit 1; }

# One digest line is appended: "kpi: merged=2 firstPass=0.5 cacheHit=0.95 tokensPerMerged=2500".
tail -n 1 "$tmp/digest.log" | grep -qE '^[^ ]+ kpi: merged=2 firstPass=0\.5 cacheHit=0\.95 tokensPerMerged=2500$' \
	|| { echo "FAIL: digest line not appended"; exit 1; }

echo "ok"

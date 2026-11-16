---
name: factory-merge
description: Verify and fast-forward merge an agent PR into integration with signed commits. Use when a PR is ready and no reviewer has merged it.
---
1. `tools/gh-bot pr view N --json files,body`: scope matches the ticket `Files:`; body has `Verified:`.
2. Via factory-bg: copy under ~/.pig/cache/merge-N, `git rebase -S origin/integration`, run the ticket's Verify commands, `git log --format=%G? origin/integration..` all `G`.
3. Extensions touched: pi-extension-check skill.
4. `tools/gh-bot pr checks N` no failures; push `t/N` (force) and `integration` (ff only); `tools/ticket set T -s Done`; close the issue.
5. Any step fails: comment the command and output on the ticket, `tools/ticket set T -s Ready`.

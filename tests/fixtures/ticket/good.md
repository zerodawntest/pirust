Files: tools/ticket, tools/agent, tests/fixtures/ticket/good.md

Add a `lint` function and wire it in.

## Done when
- Verify: `tools/ticket lint tests/fixtures/ticket/good.md; echo $?` -> `0`
- Verify: `tools/ticket lint tests/fixtures/ticket/bad.md` lists `no Files: line` and `no Verify line`, exit 1

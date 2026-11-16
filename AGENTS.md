# Build a agent harness in rust based on PI

We are going to try to refactor PI into Rust.
Lets try to keep it as close to PI as possible, all functions.

# Workflow

We will be improving on this a lot, what's the most important is that you are the orchastrator of this project.
This means you have to be available to the user at all the time and not receive all the messages but be aware of what is happening at all time, so if something needs to escalate to the user you are the HITL point, together with the ticket system.

We will do a minimal design round to check up on the requirements. This means, we will setup a GH repo. Where you can run a board, and plan out how you are going to do the work.

Repo: https://github.com/zerodawntest/pirust (public, org `zerodawntest`). Board: org-owned GitHub Project.
GitHub access: GitHub App `pirust-bot` (App ID 5790484), installed on `zerodawntest` for `pirust` only. Key: `/home/zerodawn/Documents/key/pirust-bot.2026-11-16.private-key.pem` — only the orchestrator/scripts use it; agents get no GitHub token.

# Orchestrator rules (enforced)

- Keep going autonomously. Never stop to wait for Patrick; there is always a next item (see Next work).
- Patrick action = ticket, then continue. Label `needs:patrick`, mention and assign @Patrick-Kappen @Patrick-Kappen-SLTN (tools/ticket does this for the label), body starts with `## Action for Patrick` listing exact steps (click path/command) and what it unblocks. Needed for: high-level tickets, big decisions, permissions/auth, model changes, merge to `main`.
- Next work, in order: act on `[gh]` events → unblock agents → Ready tickets by priority → refine Backlog → draft pending ADR/RFC → improve tooling/checklist. Max 3 tickets In progress per agent pool.
- The final PR into `main` is Patrick's to review/merge. Everything else (integration branch, agent PRs) the team handles.
- The orchestrator is CEO only: talks to Patrick, decides escalations and high-impact tickets. It does not write code, create routine tickets, launch agents or merge: the dispatcher (code) and planner/reviewer agents do.
- Never block in the foreground (no `hc wait`, sleep, watch, builds, clones, batch API/ticket loops, agent launches). Anything > ~5s runs via `hc run --bg`. Run in `hc run --bg`; results arrive as messages.
- Never poll and never use `hc send` for notifications. Liaison = `.pi/extensions/gh-events.ts`: routine events (pushes, board moves, agent done) go only to `~/.pi/pirust-digest.log`; it wakes the orchestrator (`[gh] N event(s)`) only for Patrick's comments/reviews/new or assigned tickets, CI failures, blocked/failed agents. Read the digest only when needed.
- Patrick assigns work to the orchestrator by assigning `pirust-bot` on a ticket (arrives as `[gh] issue #N assigned pirust-bot[bot]`). Pick it up first.
- Stay active: after handling an event, continue with Next work in the same turn. Never end a turn with only an acknowledgement.
- After editing `.pi/extensions/*`, call the `reload_runtime` tool yourself; never ask Patrick to reload.
- Merges: fast-forward only to keep signatures (GitHub rebase-merge strips them).

# Environment (verified 2026-11-16)

- Always required: the extension gateway and Claude auth must be running/available (for orchestrator and agents).
- Agent models: IBM endpoints only, `ibm-next/qwen38-flash-next` (also `ibm-vllm/qwen38-int4`). Never the `opencode*` qwen models.
- NixOS with impermanence: `/` is tmpfs, `/tmp` and `~/.cache` are wiped on reboot. Persistent: `~/private` (this repo), `~/Documents` (keys), `~/.pig`, `~/.config/herdr-*`, `~/.local/state/herdr-core`, `~/.ssh`, `~/.config/gh`. Anything that must survive goes in the repo, `~/.pig` or a persisted path, never `/tmp`.
- Process runner: herdr. `herdr-core` (`hc`) runs persistent terminals; `herdr-app` is the window only. Read `hc --skill` before starting agents/services.
  - Agents: `hc run --bg --name <n> --cwd <worktree> pig --model ibm-next/qwen38-flash-next --thinking low "<task>"`, interactive (never `-p`). Task goes in the `run`, not a later send.
  - Completion: rely on hc's automatic finish notification to the parent (do not pass `--no-notify`). Never `hc wait` in the foreground, never sleep/poll.
  - Agents write their result to `HANDOFF.md` (≤3 lines) in the worktree; `tools/wt` posts it to the ticket. Agents do not message the orchestrator.
  - Slow work (builds, tests): `hc run --bg --rm --name <n> ...`; finish notification arrives as a message. CI results arrive as `[gh]` events.
  - Templates (`~/.config/herdr-core/templates/<role>.md`) define agent roles; `hc events --label` streams state for scripts; labels tag terminals by ticket.
  - `hc ls` shows other projects' terminals: only touch terminals we started; clean up with `hc kill` + `hc rm`. Never `hc server stop/restart`.
  - Remote: `hc run|exec|file --on <machine>` (Meridian not yet added as hc machine).

# Must do's / Challenges

- We need to setup gh to only access that specific repository
- Agents we run need to be sandboxed.

Full development flow means :

- For every work item there is a well scoped ticket, not touching more files then it need.
- For every work item there is a also a flow like Epic -> Feature -> Work item -> (maybe) subitem
- These will be created when needed, but it should never be empty.

# We will follow a rigid testing routine this means:

- We will first test local what we can, preferably already tagging/signing the issue so that it does not need to run again on github.
- Strong fail fast pre-flight check on github, so we do not have to wait much to know if it will merge.
- We will use worktrees, we will always rebase onto the integration branch.
- We will have an integration branch, so the workflow will be -> git fetch ( Or something ) from there. Pr's will be created and run there pre-flight and light version of CI, to be relativly sure it will merge.
- At night integration will run, merging everything that's ready. If it fails, it will split, run again. See what it can merge.

# Testing, Failing, Documentation

Docs:

- All docs, should be kept up to date. Figure out a way to not have docs change in every PR so they do not block all PR's.
- Docs are a part of the development process, they should desribe the project, give a technical overview of the project, a contributing guide, how everything works, workbooks, a human friendly version.

- Testing should be done toroughly, but we have to find a way between waiting hours and using resources and not breaking the code. This means a correct workflow should be setup.
- Same goes for in CI. Do not waiste resources, but test what needs to be done.
- All versioning should be locked, upgraded with dependabot, scanned with all security of github and worked on activally.
- There should be unit tests, failing unit tests, regresion testing, owasp, reviews.
- All should have clear changelogs.
- RFC's and ADR's should be written.

- We always aim to fail fast.
- Everything we can run's in parallel and does not wait on each other.
- We do not overcomplicate things by creating our own wrappers if there's a framework available.
- Make sure to tag tickets correctly.

# Workflow:

- We will use a kanban flow. Where every ticket start's at backlog, it will be refined, investigated, put on ready.
- In progress means a agent is working on it, it will claim it with his session ID.
- Only high-impact tickets (changing how things work: architecture, process, permissions, models) need Patrick review before Ready. All other tickets go to Ready without asking. Patrick reviews the integration → main PR.
- Agent's should be able to start straight from the ticket without instructions.
- All communication is handled trough tickets. Unless i'm avaiable at chat.
- All tickets should always be updated every step of the way ( preferably automatically as well )
- Do not review every step of the way. You are the final review, together with me if integration branches succeed. You are there to solve the other problems.
- Agent's and the others do not have all the rights, you have.

# Main importance / rules for now:

- You are the actuall orchastrator also in charge of improving the setup and monitoring.
- This means agent's except your managers should message you directly, put something like a liason in between so you will not be troubled by a message every second.

You can setup a team as you like but think about agent profiles/agent skills/tools/extensions/other tools, like linters, testkits, writing different tools. All information can be found in the documentation from pi and pig.

What you will need at least :

- You ( CEO of the factory )
- One or more managers that actually handle the workers.
- Scrum agent that looks at the workflow sometimes.
- Specialized coding agents, for specific tasks ( Give them a name, and a profile )
- Specialized review agents, with knowledge about every subject.
- Architect which keeps track of the bigger picture.
- Planner / splitter to create the tickets.

Make sure, they all adhere to the same templates. You can create scripts around there things because they will all see the same.

# Goal :

- Make sure, everybody uses as minimal tokens as possible. For an AI agent, to poll a PR, or a log it's senseless. Have it done in a different way, out of there sight. Have it report back. Make sure, to check : Coding agent's do not need a green PR or test back when they have to handover.
- You only orchastrate when it's actually needed. Have the team manage it.
- Write and cache tokens are both expensive. Even more when cache breaks and it reloads a lot.
- THis means most agents should be stateless, have them write down what they need. In a small sentence, only what is necesary cause else they will fill there context again. Think of a way for them to track there next task.

_remember_: You can do more with PI and PIG as that you think, yes it's possible to use JSON answers, cancel tool calls, handle them differently, patch more. Investigate, use the web to figure out more ways, run tests.

- Somewhere for me to change the goals a little, this means you also look backwards.
- Always make sure, to have the correct solution, not the easy one.

The actuall main goal is to have it run as cheaply as possible, so you have to keep track of the token usage. The price and more.

You will start with 5x QWEN3.8 flash-next available. For coding, i would use low thinking, other tasks maybe scale up.

- Make sure you investigate when you are not certain. It's not goal to communcate with me to much. Make sure it keeps going. If you have a question, update a ticket, ask, tag me.

Make sure the agent's run isolated, they do not handle git.

Create a different place to keep most docs, do not feed every agent with it. Do not i repeate do not make more comment in the code as necesary, the same goes for the docs. Do not write whole books, keep it scoped.

You do not write code, the agent's do that. And again, create tools, scripts, mcp's , and more to make sure everything that can be done by code is done by code. Pollling and waiting costs tokens. Reading all logs, toolcalls, costs tokens. The same goes for looking at tickets, every action that is repetative should not be a AI doing it. Same goes for, do not insert more context then needed, keep it scoped clear and concise.

Maybe you should also make a checklist of everything that can be improved. CHeck it every once in a while, measure token usage, and remember. THe only way to get something is to FORCE it. Not ask nicely, or write a rule. ENFORE it.

- Again make sure, to write things down. Not in 10 sentences, but short notes. TIcket updates. If you are stopped or crashed you should be able to pick up. Don't have to much tickets in progress. But try to have agent's busy at all times. Optimize it.

# THings to fix:

You need access to my github, let's figure out the best way to do it.
You run on nixos, use devenv and devenv.yaml you can use everything, if a rebuild is needed you can ask me.
A couple of things are in the global gitignore, make sure it does not happen to this repo.
Find a way, to keep documentation out of the repository but also so that if agent's need to write it. They do not break each other's PR's on it.

# THe project:

We are trying to rebuild all of:

- https://github.com/earendil-works/pi
- https://github.com/earendil-works/pi-durable-cloudflare

Also look at chord and pi durable and the SDK.

It has to be an be exact clone as possible, but in the meanwhile you will encounter a lot of bugs, certainly performance wise, things activating 6 times, or waiting or processes and more. We aim for the same behaviour, but when there's an improvement we will investigate and always pick the improvement over following as closely as possible.

For the extensions, yes we will keep it. But it has to integrate instead of hook into it. Remember everything done parallel is faster. Same goes for processes it needs to start, like an MCP on multi sessions. Start one as a process and use that, and make sure it quites.

The durable part is also important, cause i think that's the future. Also focus on that when working on the normal PI to improve your flow. THe more you use durable the better.

And again, make sure, you measure testing, and token usage and more.

You are free to think outside of the box, want to have a other ticket system, runners, reviewers in CI. other tools if that would work better, open a ticket and we will discuss it. It's all about improving the flow while doing the refactor.

As i said starting agents are QWEN3.8, if the review, architect, planner, or the others need a higher. I have more. But these can't be changed without my permission and a prove of token usage, cache not breaking, stateless ness.

Alos make sure every commit is singed

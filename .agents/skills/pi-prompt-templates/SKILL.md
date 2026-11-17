---
name: pi-prompt-templates
description: "Pi prompt templates (reusable / commands from Markdown) and the full slash-command list, plus how skills add /skill:name commands. Use when creating a reusable prompt, editing a template, or checking which /commands exist. Templates are inert text; for executable tools/handlers see pi-hooks, for task skills see docs skills.md."
---
Docs: `/nix/store/w3j2zc6sidwg028h4b1wqw6yillkf9jm-pi-1.5.1/libexec/pi/docs` (D).

## Prompt templates (D/prompt-templates.md)
- A `.md` file in a prompts dir becomes a `/` command named after the file. Create `~/.pi/agent/prompts/review.md` (or `.pi/prompts/` — project, needs trust, see pi-security) (D/prompt-templates.md:9).
- Frontmatter: `description` (shown in completion; falls back to the first non-empty line), optional `argument-hint` (`<req>` / `[opt]`). Body is the prompt text with substitutions. Run `/reload` after adding/changing one in a live session (D/prompt-templates.md:19-23).
- Substitutions (D/prompt-templates.md:39-48): `$1`,`$2`,… positional; `$@`/`$ARGUMENTS` all; `${1:-default}`; `${@:-default}`; `${@:N}` and `${@:N:L}` slices. Shell-like quoting; apostrophes inside words stay text.
- Invoke: `/review`, `/review concurrency`. Pi expands the template BEFORE the text enters the agent; extensions get the raw input first via the `input` event (see pi-hooks) unless an extension command with the same name handles it (D/prompt-templates.md:36).
- Convention: a plain prompts dir loads direct `.md` children only; settings/packages can select nested `.md` with globs (D/prompt-templates.md:55, see pi-packages).

## Slash commands (D/slash-commands.md)
- Models/settings: `/settings` `/model [p/m]` `/thinking [lvl]` `/scoped-models` `/login [p]` `/logout` `/llama`.
- Sessions: `/new` `/resume` `/name` `/session` `/tree` `/fork` `/clone` `/compact [instr]` `/import <path>` (details in pi-sessions).
- Export/share: `/copy` `/export [path]` `/share` `/bug [desc]` (details in pi-sessions).
- Runtime/project: `/trust` `/mcp` `/reload` `/hotkeys` `/changelog` `/quit` (`/mcp` see pi-mcp; `/trust` see pi-security).
- Resources add commands: extensions register their own; each prompt template is its file name; skills are `/skill:<name>` when `enableSkillCommands` (default true) (D/slash-commands.md:57-59, D/settings.md:160). `/reload` after adding a discovered command resource.

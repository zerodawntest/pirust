---
name: pi-packages
description: "Bundle and distribute pi extensions, skills, prompt templates, and themes as one installable unit (npm/git/local). Use when publishing a customization to share, installing a third-party package, or declaring packages in settings.json. Covers peer-dep rules and scope/identity."
---
Docs: `/nix/store/w3j2zc6sidwg028h4b1wqw6yillkf9jm-pi-1.5.1/libexec/pi/docs` (D). A package = an ordinary dir or npm package exposing conventional dirs, `package.json` `pi` paths, and its own runtime deps (D/packages.md:5-7).

## Install / manage (D/packages.md:8-31, D/cli.md:252-303)
- `pi install <source>` (npm/git/local), `pi list`, `pi remove <source>` (alias `pi uninstall`), `pi update [target]` (see below). Add `--local`/`-l` to write `.pi/settings.json` (project; loaded only after trust — see pi-security).
- Sources: `npm:@scope/pkg@1.2.3` (pinned), `git:github.com/o/r@v1`, `https://github.com/o/r` (treated as git), `./local` (loaded in place, no copy). Relative local paths resolve from the settings file that lists them (D/packages.md:33-44).
- Try without persisting: `pi -e npm:@example/pi-tools` (cached under `~/.pi/agent/tmp/extensions/`; exact-pinned versions aren't re-checked) (D/packages.md:25-31).
- If a configured package fails to install at startup, pi warns, skips its resources, keeps running, retries next start/`/reload`.

## Create a package (D/packages.md:46-98)
- Simplest: conventional dirs `extensions/ skills/ prompts/ themes/` discovered without a manifest. Explicit manifest under the `pi` key: `"pi": { "extensions":["./src/extension.ts"], "skills":[…], "prompts":["./resources/prompts/*.md"], "themes":[…] }`; paths relative to package root, globs + `!` exclusions allowed (D/packages.md:55-76).
- `keywords:["pi-package"]` makes an npm package eligible for the pi.dev gallery; optional `pi.image`/`pi.video` previews (D/packages.md:78).

## Dependencies (D/packages.md:100-116)
- Put runtime packages your extensions import in `dependencies`. Declare host-provided packages in `peerDependencies` as `"*"` and do NOT bundle them: `@earendil-works/pi-ai`, `@earendil-works/pi-agent-core`, `@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, `typebox` (D/packages.md:104-112).
- Do NOT list host-provided packages in `dependencies` — a physical copy bypasses pi's module mapping and creates duplicate classes/registries; pi warns on this (D/packages.md:114). Local packages are never installed/modified — their dep tree is your responsibility.

## Select resources + scope (D/packages.md:118-152)
- `packages` entries in settings can narrow per-type: omit a type = load all it exposes, `[]` = none, `!pattern` exclude, `+path`/`-path` include/exclude one. Filters narrow the manifest; they can't expose undeclared resources (D/packages.md:118-143).
- Same package in personal + project settings: a project entry replaces it; `autoload:false` makes it a filtering delta. Identity: npm by name, git by repo URL (no ref), local by resolved abs path — prevents double-load (D/packages.md:147-151).
- Design each resource first: see skills pi-models (custom provider), pi-codemode, and docs `skills.md`/`prompt-templates.md` (see pi-prompt-templates).

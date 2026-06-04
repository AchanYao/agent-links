# agent-links

Shared global instructions and skills for AI coding tools.

This repo is the single source of truth:

- `global/GLOBAL_AGENTS.md`: global agent instructions source
- `AGENTS.md`: project-level instructions for agents working in this repo
- `skills/`: global skill folders
- `agent-links.config.json`: target locations for each tool
- `scripts/link-agents.js`: creates and repairs symlinks

## Commands

```sh
npm run sync
npm run dry-run
npm run watch
```

You can also run dry run mode directly:

```sh
node scripts/link-agents.js --dry-run
```

## Cross-platform Notes

The script runs on Windows, macOS, and Linux with Node.js. Target entries can be limited to specific Node platforms with the optional `platforms` field in `agent-links.config.json`, for example `["win32"]`, `["darwin"]`, or `["linux"]`.

Path variables use `${HOME}` by default. On Windows, the script falls back between `${HOME}` and `${USERPROFILE}` when one of them is missing.

`npm run watch` uses Node's native `fs.watch`. Recursive directory watching is platform-dependent, so the script falls back to non-recursive watching when recursive mode is unavailable.

## Link Behavior

The sync script only creates symlinks. It does not copy content and does not overwrite existing real files or directories.

- If a target path does not exist, it creates a symlink.
- If a target path is already the correct symlink, it leaves it alone.
- If a target path is a symlink to another location, it replaces that symlink.
- If a target path is a normal file or directory, it skips it and prints a warning.

On Windows, creating symlinks may require Developer Mode or an elevated terminal. If that is not enabled, run PowerShell as Administrator or enable Developer Mode in Windows settings.

## Targets

Default targets are configured for:

- opencode: `${HOME}/.opencode/AGENTS.md` and `${HOME}/.opencode/skills`
- codex: `${HOME}/.codex/AGENTS.md` and `${HOME}/.codex/skills`
- VS Code Copilot Insiders on Windows: `${APPDATA}/Code - Insiders/User/prompts/AGENTS.md` and `${HOME}/.copilot/skills`
- VS Code Copilot Insiders on macOS: `${HOME}/Library/Application Support/Code - Insiders/User/prompts/AGENTS.md` and `${HOME}/.copilot/skills`
- VS Code Copilot Insiders on Linux: `${HOME}/.config/Code - Insiders/User/prompts/AGENTS.md` and `${HOME}/.copilot/skills`
- Claude Code: `${HOME}/.claude/CLAUDE.md` and `${HOME}/.claude/skills`

Edit `agent-links.config.json` if a tool expects a different global path on your machine.

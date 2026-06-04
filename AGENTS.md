# agent-links Agent Instructions

This repo manages shared AI assistant instructions and skills by linking one source tree into multiple tools' global customization directories.

## Key Files

- [global/GLOBAL_AGENTS.md](global/GLOBAL_AGENTS.md): global instruction source that is linked into tool-specific global instruction files.
- [skills/](skills/): global skill source directory that is linked into tool-specific global skill directories.
- [agent-links.config.json](agent-links.config.json): declarative source and target mapping.
- [agent-links.schema.json](agent-links.schema.json): JSON schema for the config format.
- [scripts/link-agents.js](scripts/link-agents.js): dependency-free Node.js symlink manager.

## Workflow

- Edit source files in this repo; do not edit generated target links in assistant config directories.
- Run `npm run dry-run` before `npm run sync` to preview link operations.
- Use `npm run watch` when actively editing global instructions or skills.
- When changing config shape, update [agent-links.schema.json](agent-links.schema.json) and [README.md](README.md) together.

## Constraints

- Preserve conservative symlink behavior: create missing links, repair stale links, and skip real target files or directories.
- Do not add copy-based fallback behavior unless the user explicitly asks for it.
- Keep the project dependency-free unless a cross-platform need clearly justifies a package.
- Keep path mappings cross-platform by using `${HOME}` where possible and `platforms` for OS-specific targets.

## Verification

- No test framework is configured.
- Use `npm run dry-run` for normal validation.
- Use `npm run sync` when symlink permissions are available; on Windows this may require Developer Mode or an elevated terminal.

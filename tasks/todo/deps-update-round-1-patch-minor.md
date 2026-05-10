# Dependency Update — Round 1 (patch/minor)

Bring all npm and Cargo dependencies up to date for the safe (patch/minor) range. No breaking changes are expected. Major bumps (typescript 6, marked 18, lucide 1.x, sha2 0.11, similar 3, sysinfo 0.39, tokenizers 0.23, todoist-sdk 10) are deliberately deferred to a later round.

## Tasks

- [x] Task 1: NPM patch/minor updates (`pnpm update -L` for non-major upgrades), then `pnpm check` + `pnpm vitest run`. Commit.
- [ ] Task 2: Cargo patch/minor updates (`cargo update`), then `cargo test --manifest-path src-tauri/Cargo.toml`. Commit.

## Notes

- `@tauri-apps/plugin-http` is deliberately pinned with `~2.5.x` — leave the spec alone.
- `pnpm.overrides` (cookie, dompurify, lodash-es, uuid) are already at their latest pin — leave alone.
- `tauri-plugin-updater` (2.10.0) and `tauri-plugin-process` (2.3.1) are pinned to exact versions — leaving alone in this round; can be relaxed in a follow-up.
- After each task: run the relevant tests, verify staging (`git diff --cached --stat`), commit using the full Conventional Commits format from `docs/COMMITS.md`.

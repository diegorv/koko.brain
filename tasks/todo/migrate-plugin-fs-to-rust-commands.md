# Migrate `@tauri-apps/plugin-fs` to Rust commands

Replace every frontend call to `@tauri-apps/plugin-fs` that targets vault paths with a Rust Tauri command (or, for binary asset reads, with the Tauri asset protocol). Eliminates the entire class of "forbidden path" ACL bugs and lifts the hardcoded vault-root restriction (`$DOCUMENT`, `$HOME/MyFiles`, `$HOME/kokobrain-vault`) so vaults can live anywhere on disk.

## Motivation

The Tauri 2 plugin-fs ACL is path-glob based and statically configured in `src-tauri/capabilities/default.json`. Today it grants access only to three hardcoded vault roots. Bugs already observed in production:

1. **Canvas image rendering broken** — `canvas-image.logic.ts:35` calls `readFile()` but `fs:allow-read-file` is not in capabilities at all (silent failure on every canvas image).
2. **Stale recent-vault detection broken** — `vault.service.ts:23` calls `exists(vaultRoot)`; bare root is rejected; catch swallows the error and the app proceeds to open a non-existent vault.
3. **Deep-link captures targeting vault root fail** — `deep-link.service.ts:234/248/330` call `mkdir(parentDir, {recursive:true})` where `parentDir` can equal the vault root, which is not covered by the `/**` scope glob.
4. **Already fixed** (`06ca724`) — right-click "New File/Folder/Canvas/Kanban" on vault root rejected for the same root-glob reason.
5. **Latent** — 18 additional services and plugins write configs to `${vault}/.kokobrain/*.json` via plugin-fs; all break if the vault is moved outside the three hardcoded roots.

Going through Rust commands (which use `validate_vault_path` + canonicalize for path security per ADR 0020) removes the ACL coupling entirely. Vault can be at any path the user chooses, and the bug class disappears.

## Strategy

- Build Rust primitives once, then migrate every TS caller mechanically to a typed wrapper (`fs-rust.service.ts`).
- One logical context per slice. Each slice is its own task and its own commit per `docs/COMMITS.md`.
- After every slice: run the relevant tests per `CLAUDE.md` Quick Reference rule 6, spawn `caveman:cavecrew-reviewer` on the diff for an independent double-check, address any findings, then commit.
- Tightly-coupled changes only (e.g., a service migration and its test file in the same commit). No grab-bag commits.
- `log.service.ts` writes to `$APPLOG`, not a vault path. It stays on plugin-fs (different domain, different scope). All `$APPLOG` capability entries remain after the migration.
- `settings.service.ts` path is resolved per-slice; if it lives in `$APPCONFIG` (outside vault), keep plugin-fs; otherwise migrate.

## Priority tiers

Order = current user-impact, NOT engineering convenience. Active visible bugs first, foundation second, hot paths next, then by feature frequency. Corner cases (vault relocation, stale recent vaults, config decisions) ship last.

- **P0** — Active bug visible to user today.
- **P1** — Foundation. No user-visible change, but unblocks all subsequent slices.
- **P2** — Hot paths of the most-used features (note open/save/create/rename/delete). High regression risk if broken; migrate early to fail fast.
- **P3** — Features in active use, lower regression risk.
- **P4** — Features used occasionally.
- **P5** — Corner cases, decision-required slices, and final cleanup.

## Slice workflow (mandatory per task)

1. Implement the change for the slice.
2. Verify test coverage exists for every touched source file (`docs/TESTING.md` § Task Completion Gate).
3. Run the matching test suite:
   - Rust touched -> `cargo test --manifest-path src-tauri/Cargo.toml`
   - Frontend touched -> `pnpm check` + `pnpm vitest run`
   - Both -> all three
4. Spawn `caveman:cavecrew-reviewer` agent with a focused diff prompt (file paths, slice scope). Address any severity-tagged finding before committing. Skip nits flagged "style only."
5. Stage only the files in this slice. Run `git diff --cached --stat` to confirm.
6. Commit with the full Context / Problem / Solution / Behavior / Files (with line ranges) format.
7. Mark the task `[x]` in this file before moving on.

## Tasks

### P0 — Active bug

- [x] Task 1 (P0): Canvas image rendering via Tauri asset protocol. Migrate `src/lib/features/canvas/canvas-image.logic.ts` `resolveImageSrc` to `convertFileSrc` from `@tauri-apps/api/core`, matching the pattern from commit `fdddb0ef` (live-preview images). Update component tests under `src/tests/lib/features/canvas/`. Smoke: add an image node referencing a vault-relative `.png` -> renders without devtools "forbidden path" rejection. Independent slice — does NOT depend on the rest of the migration.

### P1 — Foundation

- [x] Task 2 (P1): ADR 0026 — record the migration decision. File: `docs/adr/0026-rust-fs-commands-replace-plugin-fs.md`. Cover: motivation (the bug class above), alternatives considered (cap-patch hack vs partial Tauri asset protocol vs full Rust migration), scope (vault paths only — `$APPLOG` stays on plugin-fs), rollout strategy (slice-by-slice via this plan), and security boundary (every new command uses `vault_fs::validate_vault_path` per ADR 0020). Cross-link from `docs/adr/README.md`.
- [x] Task 3 (P1): Add Rust FS primitives. Implement `path_exists`, `read_text`, `write_text` (overwrite allowed), `rename_path`, `copy_path`, `delete_path`, `read_dir` in `src-tauri/src/commands/` (probably new module `commands/fs_primitives.rs`). Each command must canonicalize + reject path traversal via `vault_fs::validate_vault_path` (ADR 0020). Register in `src-tauri/src/lib.rs::run`. Add Rust unit tests for each command: happy path, missing file, traversal attempt, permission error. No TS changes in this slice.
- [x] Task 4 (P1): Add TS wrapper module `src/lib/core/filesystem/fs-rust.service.ts`. Expose typed wrappers (`pathExists`, `readText`, `writeText`, `renamePath`, `copyPath`, `deletePath`, `readDir`) that call `invoke(...)` with proper error propagation (do not swallow). Add `src/tests/lib/core/filesystem/fs-rust.service.test.ts` covering happy / missing / error-propagation paths via mocked `@tauri-apps/api/core`. No call-site migrations yet.

### P2 — Hot paths

- [x] Task 5 (P2): Migrate `src/lib/core/filesystem/fs.service.ts` plugin-fs internals (readDir, exists, writeTextFile, readTextFile, mkdir, remove, rename, copyFile) to the wrappers. `createFile`/`createFolder` already go through Rust commands; finish the remaining read/write/exists/move/copy/delete paths. Update `src/tests/lib/core/filesystem/`.
- [x] Task 6 (P2): Migrate `src/lib/core/editor/editor.service.ts` -> wrappers. Hot path; verify `markRecentSave` wiring stays intact, watcher self-save guard still fires correctly. Update tests.
- [ ] Task 7 (P2): Migrate `src/lib/core/note-creator/note-creator.service.ts` -> wrappers. Update tests.
- [ ] Task 8 (P2): Migrate `src/lib/core/filesystem/link-updater.service.ts` -> wrappers. Bulk rewrite on rename. Update tests.
- [ ] Task 9 (P2): Migrate `src/lib/core/trash/trash.service.ts` -> wrappers. Atomic manifest writes need care; review for partial-write recovery. Update tests.

### P3 — Active features

- [ ] Task 10 (P3): Migrate `src/lib/features/canvas/canvas.service.ts` AND `src/lib/features/canvas/FileNode.svelte` together (tightly coupled — file creation + linked-file content read). Update tests.
- [ ] Task 11 (P3): Migrate `src/lib/plugins/kanban/kanban.service.ts` -> wrappers. Board creation + linked content load. Update tests.
- [ ] Task 12 (P3): Migrate `src/lib/features/deep-link/deep-link.service.ts` -> wrappers. Closes the root-level mkdir bug as a side effect. Smoke: `kokobrain://create?path=test.md&silent` at vault root -> file created, no errors. Update tests.
- [ ] Task 13 (P3): Migrate `src/lib/features/bookmarks/bookmarks.service.ts` -> wrappers. Update tests.
- [ ] Task 14 (P3): Migrate `src/lib/features/file-icons/file-icons.service.ts` -> wrappers. Update tests.

### P4 — Occasional features

- [ ] Task 15 (P4): Migrate `src/lib/core/markdown-editor/extensions/wikilink/completion.ts` -> wrappers. Autocomplete read path. Update tests.
- [ ] Task 16 (P4): Migrate `src/lib/features/auto-move/auto-move.service.ts` -> wrappers. Update tests.
- [ ] Task 17 (P4): Migrate `src/lib/plugins/queryjs/queryjs.service.ts` -> wrappers. Update tests.
- [ ] Task 18 (P4): Migrate `src/lib/plugins/templates/templates.service.ts` -> wrappers. Update tests.
- [ ] Task 19 (P4): Migrate `src/lib/features/file-history/file-history.service.ts` -> wrappers (note this file already uses some Rust commands; finish the remaining plugin-fs calls). Update tests.
- [ ] Task 20 (P4): Migrate `src/lib/features/tasks/todoist.service.ts` -> wrappers. Update tests.
- [ ] Task 21 (P4): Migrate `src/lib/plugins/one-on-one/one-on-one.service.ts` -> wrappers. Update tests.

### P5 — Corner cases + cleanup

- [ ] Task 22 (P5): Migrate `src/lib/core/vault/vault.service.ts` (exists -> `pathExists`). Closes the stale-recent-vault detection bug. Smoke: delete a recent vault folder externally, click recent -> toast appears, entry removed. Update `src/tests/lib/core/vault/`.
- [ ] Task 23 (P5): Decide and migrate `src/lib/core/settings/settings.service.ts`. Resolve where the settings file lives (vault vs `$APPCONFIG`). If vault -> wrappers. If `$APPCONFIG` -> keep plugin-fs but document the boundary in the commit message. Update tests.
- [ ] Task 24 (P5): Cleanup pass. `grep -rn "@tauri-apps/plugin-fs" src/lib` must return only `log.service.ts` (and `settings.service.ts` if it stayed on `$APPCONFIG`). Remove redundant vault-path entries from `src-tauri/capabilities/default.json` (`fs:allow-read-text-file`, `fs:allow-write-text-file`, `fs:allow-mkdir`, `fs:allow-remove`, `fs:allow-rename`, `fs:allow-copy-file`, `fs:allow-exists`, `fs:allow-watch`, `fs:allow-unwatch`, `fs:allow-read-dir`, `fs:allow-read-file`) keeping only `$APPLOG` entries needed by `log.service.ts` (and `$APPCONFIG` if applicable). If zero callers remain, also remove `@tauri-apps/plugin-fs` from `package.json` and the Rust plugin registration in `src-tauri/src/lib.rs`. Smoke: move the vault to a non-hardcoded path (e.g., `$HOME/Documents/Brain`), open it, exercise file create/rename/move/delete, canvas image render, kanban create, deep-link capture, bookmarks/file-icons/auto-move config writes. Move this plan file to `tasks/done/` once everything passes.

## Notes

- Each slice MUST end with a commit. Per `CLAUDE.md` Plan Mode Workflow rules: "**COMMIT after EVERY task. This is NON-NEGOTIABLE.**" No batching across tasks even if the changes look small.
- Subagent review is part of the workflow, not optional. Prompt the reviewer with the slice's diff scope and ask only for blockers (correctness, security, missing tests). Acceptance: 0 high-severity findings.
- If a slice grows beyond ~500 LOC (typical PR ceiling), split it before committing — append the split as new tasks under the same priority tier.
- If a Rust command from Task 3 turns out to be missing during a TS migration slice, do NOT bolt it on in that slice. Stop, add the command as a new Task 3.x (separate context, P1 tier), commit, then resume.
- Tasks within the same tier are roughly intercheangeable but the listed order is a sane default (most-used / highest-volume first within the tier).
- After Task 24 ships, downstream codebases / nightly builds should be smoke-tested before tagging a release.

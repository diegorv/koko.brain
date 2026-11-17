# 02: Quick switcher offers Create while notes match (Shift+Enter), creates Folder/Note paths, and a failed create says why

**Origin:** design review 2026-11-17, proposal P57 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html`, research `.scratch/finders-ux/research/verdict-command-dialogs.md` (ticket T3) and `.scratch/finders-ux/research/breakdown.md` (06). Absorbs `.scratch/open-itens/issues/164-quick-switcher-create-folder-path-projects-idea.md`.

**What to build:** in `src/lib/features/quick-switcher/QuickSwitcher.svelte`:

1. **Folder paths (from 164).** `createAndOpenNote` (`:41-60`) splits the trimmed query on `/`. A query with an empty segment, or any segment that starts with `.` (which covers `.` and `..`), creates nothing and shows a toast that says why. Dot segments are refused in the frontend because `ensure_safe_write_path` (`src-tauri/src/commands/vault.rs:1119-1131`) rejects only `..` and would accept `.kokobrain/x` (the app data dir, ADR-0019), and `insertTreeNode` drops any path with a dot segment (`src/lib/core/filesystem/fs.logic.ts:588`), so such a note would never appear in the tree. Otherwise the last segment is the note name (`.md` appended unless present) and the segments before it are the target folder under the vault. Follow the existing pattern in `src/lib/features/rail-shell/new-note.service.ts:36-38`: one `call('create_folder', { path: targetFolder })` (recursive, a no-op for an existing folder), then `createFile(targetFolder, name, content)` with the same `applyExplicitOrganization('', settingsStore.explicitOrganization)` content it passes today. Do not use `fs.service` `createFolder`, which renames on a collision, and do not call it or `addToTree` per level: `createFile` calls `addToTree` (`fs.service.ts:158-165`), and `insertTreeNode` already inserts the missing parent folder nodes (`fs.logic.ts:602-610`). Skip `create_folder` when the target is the vault root.
2. **Target folder.** The target is the folder typed in the query, else the vault root. No other rule (active note's folder, capture folder).
3. **Failure reason (from 164).** The bare `catch` at `:51-53` becomes a toast that includes the error's reason, not only "Failed to create file.".
4. **Create row while notes match (P57).** Render the Create `Command.Item` as the last row after the matches whenever the trimmed query is not empty, except when a note with that exact name (case-insensitive) already exists in the target folder: `createFile` resolves a clash with `generateUniqueName` (`fs.service.ts:198-203`) and would otherwise make `Ideas 1.md`. The selection stays on the first match, so Enter opens it. Enter with no match still creates (resolved Issue 042 behaviour).
5. **Shift+Enter.** `onkeydown` on `Command.Input`: Shift+Enter (not `isComposing` and `keyCode !== 229`, mirroring bits-ui's own IME guard) with a Create row present calls `preventDefault` and `stopPropagation`, then runs `createAndOpenNote`. `stopPropagation` is required because bits-ui's root handler (`node_modules/bits-ui/dist/bits/command/command.svelte.js:957-968`) treats Shift+Enter as Enter and does not check `defaultPrevented`.
6. **Row label.** The Create row shows its target, "in <folder>" or "in vault root", from the same split as step 1.
7. **Footer.** Pass the Shift+Enter Create hint to the command-dialog footer from 01.
8. **Help.** Update the "Create new note" bullet in `help/documentation/06-search-and-navigation.md:15`.

**Blocked by:** 01

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first, in `src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts`: with no files in the tree, type `Projects/Idea` and run Create; `create_folder` is invoked for `/vault/Projects` before `create_note` is invoked with `/vault/Projects/Idea.md`, and the note opens.
- [ ] A nested path (`Area/Projects/Idea`) creates every missing folder level.
- [ ] An existing folder is reused, not duplicated as `Projects 1`.
- [ ] A query with an empty, `.` or `..` segment creates nothing and shows a toast that says why.
- [ ] A query with a segment that starts with `.` (for example `.kokobrain/x` or `Projects/.hidden`) creates nothing (no `create_folder` or `create_note` invoke) and shows a toast that says why.
- [ ] After `Projects/Idea` is created with no `Projects` folder in the tree, `fsStore.fileTree` holds a `Projects` folder node containing `Idea.md`.
- [ ] When creation fails, the toast includes the error reason; the existing "toasts and opens nothing" test keeps passing with its assertions adjusted only for the new text.
- [ ] Failing test first: invert the test at `QuickSwitcher.test.ts:215-227`. With `Ideas.md` present, typing "Idea" renders the match and then `Create "Idea"` last; Enter opens `/vault/Ideas.md`; Shift+Enter creates and opens `/vault/Idea.md`.
- [ ] Typing "Ideas" with `Ideas.md` present renders no Create row, and Shift+Enter creates no `Ideas 1.md`.
- [ ] `Projects/Idea` shows "in Projects" on the row and creates there; a plain `Idea` shows "in vault root".
- [ ] The 042 tests (Enter on no match, both query transitions) stay green.
- [ ] The switcher footer shows the Shift+Enter Create hint; the help doc describes the Create row, Shift+Enter and folder paths.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P57.** The quick switcher cannot create a note when any fuzzy match exists. Always add a Create row, bound to Shift+Enter, that shows the target folder. Include the cause when creation fails.
- **164 (absorbed).** Quick Switcher Create with a folder path (`Projects/Idea`) creates the note in that folder, and a failed create says why. Split the query on `/`, refuse empty, `.` and `..` segments with a clear message, create the missing folders under the vault and add them to the tree, then `createFile` in the target folder with the last segment. The error toast names the reason.

## Problem

Create appears only when no note matches, so a new note whose name fuzzy-matches an existing one cannot be created from the switcher. A path-style name whose folder does not exist fails with "Failed to create file." and no reason: Rust `create_note` does not create parents, so the temp write fails. When the folder exists the same query works, so the result depends on state the user cannot see.

## Evidence

Checked at `bb57e6165`.

- `src/lib/features/quick-switcher/QuickSwitcher.svelte:41-60`: `name = query + '.md'`, `createFile(vaultStore.path, name, applyExplicitOrganization(...))`; `:51-53` bare catch, `toast.error('Failed to create file.')`; `:72-106` Create renders only in the `{:else if}` branch after no results.
- `src/lib/core/filesystem/fs.service.ts:198-224`: `createFile` reads the parent folder, `generateUniqueName`, then `call('create_note', ...)`, `addToTree`. `:158-165` `addToTree` calls `insertTreeNode`. `:227` `createFolder` renames on a collision.
- `src/lib/core/filesystem/fs.logic.ts:588`: `insertTreeNode` returns the tree unchanged when any segment starts with `.`; `:602-610` creates missing parent folder nodes.
- `src-tauri/src/commands/vault.rs:1119-1131`: `ensure_safe_write_path` rejects only non-absolute paths and `..` components.
- `src/lib/features/rail-shell/new-note.service.ts:36-38`: `call('create_folder', ...)` then `createFile(folder, ...)`, the pattern to follow.
- `src-tauri/src/commands/vault.rs:1145-1170`: `create_note` runs `ensure_safe_write_path`, rejects an existing file and calls `write_atomic` with no `create_dir_all`. `:1179-1183`: `create_folder` is `create_dir_all`, a no-op for an existing folder. (164 cited `:984-995` and `:1012-1022`; the functions moved.)
- `src-tauri/src/utils/fs.rs:27`: the temp `std::fs::write` fails when the parent is missing.
- `src/lib/core/filesystem/file-entries.logic.ts:31-56`: `filterAndRank` fuzzy-matches `nameWithoutExt` only.
- `src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts:215-227`: "offers no create item and opens the first match on Enter when a note matches", which this ticket inverts on purpose.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided: Create targets the typed folder (creating missing folders, per 164), else the vault root. The Create row hides when the exact name already exists in the target folder. Any segment starting with `.` is refused.

# Issue 28: forgetNote — first slice of the note-change owner

Status: ready-for-agent
Phase: P3 Track C step 3 (cluster C08)
Source: ARCH 5.1 slice 1, LB6, ADR-0009:63 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track C — Filesystem/paths)
Blocked by: 26-sort-option-removal, 24-autosave-scheduling

## What

Ship `forgetNote` — the index-dedupe clear plus the Rust index removal — and call it from the
rename/move sites that today omit what the delete site already does. Closes live bug LB6: a file
renamed away and later recreated at the old path is silently skipped by the index dedupe, so real
content never gets re-indexed.

## How

- Extract `forgetNote(path)` = `clearIndexedEntry(path)` + `remove_note_from_index(path)`.
- Wire it at `fs.service.ts:229` and `fs.service.ts:269` (rename/move), which today omit what the
  delete site at `fs.service.ts:184` already does.
- **Per the P1 C06/C03 decision, `forgetNote` is the FIRST SLICE of the single note-change owner
  (arch 3.1 `applyNoteChange`) — never a second, competing module.** Issue 29 absorbs it; issue 35
  and the later path-change owner reuse it. Do not build a parallel owner.
- Closes the **ADR-0009:63 violation**: the named enforcer `removeFileFromIndex` no longer exists.
  **Amend ADR-0009 in this same commit series** to name the real enforcer.
- Drop the `vi.mock` at `fs.service.test.ts:40-42` — the real path must be exercised.
- Test collateral in the same commit: a regression test reproducing LB6 (rename away → recreate at
  the old path with identical bytes → the file is re-indexed), asserting real store/dedupe state,
  not a mock-call count.

## Gate

Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build` before the commit. Stage only the
files for this step, verify with `git diff --cached --stat`, and commit as one commit using the
repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

### 2026-08-19 — resolved

**Red-green evidence.** Both LB6 probes were written first and run against the unfixed code:

```
FAIL src/tests/lib/core/filesystem/fs.service.test.ts > renameItem >
     clears the dedupe signature for the abandoned path on rename (LB6)
AssertionError: expected true to be false // Object.is equality
  ❯ src/tests/lib/core/filesystem/fs.service.test.ts:614:64
    expect(isAlreadyIndexed('/vault/old.md', 'identical bytes')).toBe(false)

FAIL src/tests/lib/core/filesystem/fs.service.test.ts > moveItem >
     clears the dedupe signature for the abandoned path on move (LB6)
AssertionError: expected true to be false // Object.is equality
  ❯ src/tests/lib/core/filesystem/fs.service.test.ts:712:65
    expect(isAlreadyIndexed('/vault/note.md', 'identical bytes')).toBe(false)

Test Files  1 failed (1)
     Tests  2 failed | 51 passed (53)
```

Only those two failed, and for the right reason: the real `index-dedupe` Map still held the
signature for the abandoned path. After wiring `forgetNote` into `renameItem` and `moveItem`,
`src/tests/lib/core/filesystem/` is `7 passed (7) / 249 passed (249)`. The `vi.mock` at
`fs.service.test.ts:40-42` is gone, so the probes exercise the real module and assert real dedupe
state, not a mock-call count; `clearAllIndexed()` was added to the `deleteItem` / `renameItem` /
`moveItem` `beforeEach` blocks because `vi.clearAllMocks()` does not touch a module-level Map.
The existing delete assertion was converted from `expect(clearIndexedEntry).toHaveBeenCalledWith(...)`
to the same real-state form, keeping its sibling `remove_note_from_index` IPC assertion so the
extraction's parity at the delete site stays pinned.

**What discovery found.** The bug is real and is an asymmetry inside one file: `deleteItem` cleared
the dedupe signature, `renameItem` and `moveItem` only issued the Rust `remove_note_from_index`.
`isAlreadyIndexed` is read at `index-updater.service.ts:40` and `editor.hooks.ts:88`, both of which
early-return, so a note re-created at an abandoned path with identical bytes never produced its
collection record, frontmatter icon or calendar entry. The ADR-0009 enforcer it named,
`removeFileFromIndex`, does not exist in any `.ts` or `.rs` file — only in doc prose. `forgetNote`
now carries that name. The live-bug window is narrower than LB6 implies: the watcher usually papers
over a single-file rename ~500 ms later via `watcher-handler.service.ts:155`. The deterministic
holes are a bulk change over `INCREMENTAL_THRESHOLD` falling to the full-rebuild branch (which never
clears), an `incrementalUpdateFiles` throw, `areAllRecentSaves` skipping the batch, and anything
inside the debounce. The ADR invariant was violated regardless.

**Plan discrepancies.**
- Line numbers in `## How` are off by one block: `fs.service.ts:229` / `:269` are the
  `const { invoke } = await import('@tauri-apps/api/core')` lines; the actual `invoke(
  'remove_note_from_index')` calls sat at `:232` and `:272`. `:184` for the delete-site
  `clearIndexedEntry` was exact. Substance unaffected.
- The three in-function `await import('@tauri-apps/api/core')` lines shadowed the module-level
  `invoke` from `fs.service.ts:1` and became orphans; all three were deleted per root CLAUDE.md
  rule 3. The `quickSwitcherStore` dynamic import, `clearViewParseCache(itemPath)` and
  `quickSwitcherStore.removeRecentPath(itemPath)` at the delete site were preserved untouched.
- `## How` cites ADR-0009:63 only, but `:46` carries the identical dead `removeFileFromIndex`.
  Both were amended — fixing one would have been a half-amend.
- Root `CLAUDE.md:276` (Indexing rule 8) said `clearIndexedEntry` is called by `deleteItem` and the
  watcher. Not mentioned by the issue, stale the moment rename/move also clear. Updated in one line.
- `Blocked by: 26-sort-option-removal, 24-autosave-scheduling` are both already in history
  (`85853a88`, `c0331fa1`). Nothing gated this worktree.

**Follow-ups worth an issue (all deliberately out of scope here).**
- A fourth hand-written copy of the `clearIndexedEntry` + `remove_note_from_index` pair still lives
  at `watcher-handler.service.ts:155-158`. Issue 29 explicitly claims `:156`, so the duplication
  survives for exactly one issue.
- `renameItem` / `moveItem` still omit the `clearViewParseCache` and
  `quickSwitcherStore.removeRecentPath` fixups that `deleteItem` does for the abandoned path.
  The first is conflict C02's territory, the second belongs to issue 39's `applyPathChange`.
- Folder renames are NOT fixed. `forgetNote(dirPath)` is a no-op on both halves and every child note
  keeps its stale signature. Pre-existing, unchanged, owned by issue 39.
- `fs.service.race-audit.test.ts:52` keeps its `vi.mock('$lib/utils/index-dedupe')`. It stays valid
  only because `forgetNote` imports nothing else from that module; importing another export there
  would return `undefined` and break it.

**Gate.** `pnpm check` 191 files / 0 errors / 0 warnings. `pnpm vitest run` 284 test files passed,
6333 passed + 1 todo. `pnpm build` succeeded. No e2e collateral touched, so `scripts/e2e.sh` was not
run. Note: the full suite came back fully green — the `pipeline-dom` failure the discovery brief
recorded as a red baseline did not reproduce on this branch.

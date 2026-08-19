# Issue 26: Delete sortTree and the dead sort-option feature

Status: ready-for-agent
Phase: P3 Track C step 1
Source: PONY B2 + #39 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track C — Filesystem/paths)
Blocked by: none

## What

The file-explorer sort-option feature is dead: `sortTree` and the option surface around it have no
live path. Delete both in one commit, including the orphaned store state left behind. Doing it now
pays the heavy `fs.service.test.ts` churn **before** the ARCH filesystem refactors add lines to the
same file.

## How

- **B2 + #39 in ONE commit** — they are the same feature; splitting them leaves a half-dead surface.
- Delete `sortTree` and the dead sort-option feature.
- **Decide the orphaned `sortBy` store state in the same commit** — do not leave it dangling for a
  later pass to rediscover. State the decision (delete vs keep) in the commit message.
- Delete by symbol, never by line range.
- The heavy `fs.service.test.ts` churn is paid here **before** Track C step 3 (`forgetNote`) and arch
  3.1 add lines to that file, so it is rewritten once.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Test collateral (the `fs.service.test.ts` churn included) lands in the same commit as the source
  deletion.
- Stage only the files related to this step (`git add <specific files>`), verify with
  `git diff --cached --stat`.
- One commit, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with
  line ranges).

## Comments

### 2026-08-19 — implemented (working tree, not yet committed)

**Scope executed.** One commit-step. Deleted, by symbol: `sortTree` + the `SortOption` import
(`fs.logic.ts`), `export type SortOption` (`fs.types.ts`), the `sortBy` state / getter / `setSortBy` /
`sortBy = 'name'` reset line + the narrowed type import (`fs.store.svelte.ts`), `changeSortOption`,
the `sortVersion` counter, the `sortVersion = 0` line in `resetFileSystem`, the `expectedSortVersion`
param and stale-discard branch on both `loadDirectoryTree` and `refreshTree`, and the `SortOption`
import (`fs.service.ts`). Both `scan_vault` reads of `fsStore.sortBy` became the literal `'name'`
(`fs.service.ts:82`, `fs.watcher.ts:175`). The `applyFolderOrder` jsdoc phrase "Original sort order
(name or modified)" is now "Original name order from scan_vault".

**Decision on the orphaned store state: `fsStore.sortBy` is DELETED, not kept.** Its only non-reset
writer was `changeSortOption`; its only two readers now send a literal. Nothing else in the repo
reads or writes it (verified by repo-wide grep for `sortBy` / `setSortBy` / `SortOption` /
`sortVersion` / `changeSortOption` across `src`, `src-tauri`, `e2e`, `docs`).

**Red-green evidence.** No red-first test exists: this is a pure deletion of code with zero
production callers, so nothing can fail before and pass after. Two substitutes were run.

1. *Repo-wide caller trace.* `sortTree` — one recursive self-call plus `fs.logic.test.ts`, nothing
   else. `changeSortOption` — no production caller at all; only `fs.service.test.ts`. `setSortBy` —
   only `changeSortOption` plus two test files. `fsStore.sortBy` — read at `fs.service.ts:85` and
   `fs.watcher.ts:175`, both `scan_vault` args, both invariantly `'name'` because nothing ever called
   `setSortBy` in production. `expectedSortVersion` — the only argument-passing call site was
   `changeSortOption`; all 14 other `refreshTree()` / `loadDirectoryTree()` call sites
   (createFile/createFolder/deleteItem/renameItem/moveItem/duplicateItem, three watcher paths,
   note-creator, trash, templates, deep-link, tauri-listeners, app-lifecycle) pass no version, so
   dropping the optional param is a no-op for them.

2. *Mutation probe on the three surviving IPC-payload parity assertions* (the real hazard here is
   dropping the `sortBy` key instead of hardcoding it: Rust `scan_vault(path, sort_by: String)` at
   `src-tauri/src/commands/vault.rs:72` takes a required non-`Option` String, and neither `pnpm check`
   nor `pnpm build` nor `mockResolvedValue([])` would catch a missing key). Probe run and reverted:

   - `fs.service.ts:82` literal flipped to `'modified'` -> `pnpm vitest run
     src/tests/lib/core/filesystem/fs.service.test.ts` = **2 failed | 49 passed**, both at the parity
     assertions (`:249` and `:300`), diff `- "sortBy": "name" / + "sortBy": "modified"`.
   - `fs.watcher.ts:175` literal flipped to `'modified'` -> `pnpm vitest run
     src/tests/lib/core/filesystem/fs.watcher.test.ts` = **1 failed | 25 passed** at `:353-355`,
     same diff shape.
   - Both reverted; the guards are non-vacuous.

**Gate (all real, all run).** `pnpm check` 191 files / 0 errors / 0 warnings. `pnpm vitest run`
284 files, 6331 passed + 1 todo (baseline 6346 + 1 todo; 15 `it` blocks removed: 7 in
`fs.logic.test.ts`, 1 in `fs.store.test.ts`, 7 in `fs.service.test.ts`). `pnpm build` succeeded.
No `cargo test` (Rust untouched) and no `bash scripts/e2e.sh` (no e2e collateral touched) — the
`scan_vault` IPC payload is byte-identical, so `e2e/mocks/virtual-fs.ts` and `e2e/mocks/tauri-core.ts`
keep working unchanged.

**Plan discrepancies.** None. `plan-2026-08-12.md:132` (P3 Track C step 1) and `:178`
("Pairs kept: ... #39+B2") match this issue exactly: one commit, `sortTree` plus the dead sort-option
feature, orphaned `sortBy` decided in-commit, `fs.service.test.ts` churn paid before Track C step 3
and arch 3.1. Numbering note (not a discrepancy): the plan's "#39" is an audit finding id, not the
tracker file `39-apply-path-change.md`, which is an unrelated arch 0.0 / P4 issue.

**Review verdicts.** adversarial review: see commit.

**Deliberate non-changes / follow-up candidates.**
- Rust `scan_vault`'s `sort_by` parameter and `sort_nodes` (`src-tauri/src/commands/vault.rs:72`,
  `:1310`), their 20 tests in `src-tauri/tests/commands/vault_test.rs`, the `'modified'` branch in
  `e2e/mocks/virtual-fs.ts:281`, and `docs/adr/0018-batch-ipc-pattern.md:21,30` are untouched — the
  issue's gate is frontend-only and touching Rust would pull in `cargo test` plus an ADR edit.
  **Worth a follow-up issue:** the Rust `sort_by` argument is now provably a constant `'name'` from
  the only client, so the parameter, `sort_nodes`, the e2e mock branch and the ADR wording could all
  collapse.
- `FileTreeNode.modifiedAt` (`fs.types.ts:11-12`) is kept even though `sortTree` was its last
  production TS reader: it is the wire shape of the unchanged Rust `scan_vault` response and is
  populated by the e2e virtual-fs mock. Deleting it would misdescribe the IPC payload.
- `resetFileSystem` now only calls `fsStore.reset()`. Kept, not inlined —
  `app-lifecycle.service.ts:435` calls it on vault teardown and inlining is out of scope.
- `fs.watcher.ts`'s own `watchVersion` staleness counter uses the same `if (x !== version) return;`
  shape as the deleted `sortVersion` guard. Deliberately untouched: it guards concurrent watcher
  batches and has live callers.

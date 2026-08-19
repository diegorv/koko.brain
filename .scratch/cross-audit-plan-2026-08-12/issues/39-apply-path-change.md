# Issue 39: applyPathChange — the path-change owner

Status: ready-for-agent
Phase: P4 (last of the filesystem track)
Source: ARCH 0.0 — plan-2026-08-12.md §P4 — Worth-exploring variants and heavy-collateral PARTIALs

Blocked by: 29-apply-note-change, 34-dead-vault-commands

## What

"A note's path changed" (delete, rename, move, restore) has no owning module — four hand-picked
consumer subsets drift apart. Introduce `applyPathChange({from, to, isDirectory})` as the single
owner of ordering and fan-out, and give it the Rust half for folder re-keying.

## How

- `applyPathChange({from, to, isDirectory})` owns the **ordering**, via a **disk-op callback** so
  `deleteItem` keeps `closeTabsForDeletedPath` **before** `moveToTrash`. The callback exists exactly
  to preserve that per-operation ordering — do not flatten it.
- Do the **folder-prefix walk once**, inside the owner, instead of per consumer.
- Wire the icon / calendar / collection **per-path removals built by issue 29** (`applyNoteChange`) —
  they already exist by the time this lands; do not write new ones.
- Rust `rename_note` must be **written against the post-issue-34 `index.rs`** (the dead-command cuts
  land first), per ADR-0025.
- **Amend ADR-0009 and ADR-0025** in this same commit series.
- Test collateral in the same commit: the fs-service ordering pattern (failing-first audit tests
  pinning "tabs close before trash move" and its siblings) extended to each operation, plus a
  folder-rename case asserting every path-keyed consumer was re-keyed.

## Gate

- Both surfaces: `cargo test --manifest-path src-tauri/Cargo.toml` **and** `pnpm check` +
  `pnpm vitest run` + `pnpm build`.
- Stage only this change's files (`git add <specific files>`), verify with `git diff --cached --stat`.
- Commit per step (TS owner + wiring; Rust `rename_note`), each with its tests and the ADR
  amendments, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments


### Follow-up candidates deferred out of the Rust step

- `NoteEntry::with_path` has no direct unit test in `entry.rs`'s own `mod tests`; it is exercised
  only transitively through `vault_file_ops_test.rs::rename_note_inner_*`, which assert the `title`
  recompute and the path swap but not the "every other field is preserved" half of the contract.
  Adding that assertion grows the step's diff past its scope contract, so it is recorded here rather
  than applied: a future edit that reset a field inside `with_path` would still pass the suite.
- `rename_note_inner` re-keys a child whose lowercase stem is shared with a note OUTSIDE the renamed
  subtree without reclaiming the `by_path` slot that `remove_entry`'s promotion pass handed to the
  duplicate. Documented in the command's doc comment; a full rebuild can land on the same end state,
  so it is a wart rather than a divergence. Fixing it would mean re-pointing `by_path[stem]` at the
  new path when it pointed at the old one before removal.

### Closing note 2026-08-19

Resolved by two commits: the Rust `rename_note` re-key first, then the TS owner
`src/lib/core/filesystem/path-change.service.ts` plus the `fs.service.ts` rewiring.

**Red-green evidence.** Eight probes written first, all red against the unfixed tree
(`pnpm vitest run src/tests/lib/core/filesystem/fs.service.test.ts
src/tests/lib/core/filesystem/fs.service.race-audit.test.ts` -> `Tests 8 failed | 59 passed`):

- `invokes rename_note before remove_note_from_index on a folder rename` -> `expected -1 to be greater than or equal to 0` (neither command fired).
- `evicts every child of a deleted FOLDER from the collection property index` -> `expected true to be false`.
- `evicts every child of a renamed FOLDER from the collection property index` -> `expected true to be false`.
- `evicts every child of a moved FOLDER from the collection property index` -> `expected true to be false`.
- `clears the dedupe signature for every child of a renamed FOLDER` -> `expected true to be false`.
- `drops every child .view of a renamed FOLDER from the view parse cache` -> `expected 1 to be 2`.
- `drops the stale quick-switcher recent path on rename` -> `expected [ '/vault/old.md' ] to not include '/vault/old.md'`.
- `calls the tab updater on move, and the link updater with an unchanged note name` -> `expected "vi.fn()" to be called with arguments: [ '/vault/note.md', ... ]`.

Plus five pure-logic probes for `collectFilePathsUnder`, red with
`TypeError: collectFilePathsUnder is not a function`.

Green after the owner landed: `src/tests/lib/core/filesystem/` `294 passed`, full gate
`cargo test` 0 failed across every binary, `pnpm check` 0 errors, `pnpm vitest run`
`287 files / 6408 passed | 1 todo`, `pnpm build` ok.

The side channel the discovery brief warned about is real and the probes are designed
around it: `refreshTree()` runs inside every operation with `invoke` mocked to `[]`, which
calls `fsStore.setFileTree([])`. A probe that seeded the tree after the call, or an owner
that walked the tree after the disk op, would both look green for the wrong reason. The
owner snapshots `collectFilePathsUnder(fsStore.fileTree, from)` as its first statement.

**What discovery found.** The three tails really were three hand-picked subsets of the same
consumer set: rename/move never cleared the view-parse cache and never touched the
quick-switcher recents, delete never touched bookmarks. Delete's omission is deliberate (a
trashed file is restorable, its bookmark must survive) and is preserved by the owner's
`to !== null` guard; the other two were drift and are now uniform. The severe half was the
folder case: `forgetNote(dirPath)` removes exactly one key, no note-change consumer is
keyed by a directory path, and nothing recovers afterwards, because `refreshTree` only
re-scans the tree and the watcher handler filters to dot-bearing basenames and returns
early on an empty list. A folder rename produced zero index work of any kind.

**Ordering, as implemented.** `closeTabsForDeletedPath` before `diskOp` (the reason the disk
operation is a callback), `updateTabAfterRenameOrMove` immediately after it,
`updateLinksAfterRename` before the sweep because its `get_backlinks_v2(from)` reads the very
Rust entry the sweep prunes, then `refreshTree`, then an AWAITED `rename_note`, then the
per-path sweep. Awaiting `rename_note` is what makes the race-audit ordering assertion
deterministic; reversed, the sweep's `remove_note_from_index` would delete the entries the
re-key needs and the children would vanish instead of following the folder. The stale
comment at the old `fs.service.ts:232-235` (which justified the link-update position by
citing `findFilesLinkingTo` / `noteContents` / `excludePath`, none of which that function
uses since it moved to `get_backlinks_v2`) was rewritten, not carried forward.

**Plan discrepancies surfaced.**

- RESTORE IS NOT WIRED, deliberately. The issue's `## What` names four operations, but
  routing `trash.service.ts::restoreItem` (:101) through the owner produces four consecutive
  no-ops: the trash source lives under `.kokobrain/trash/<uuid>/`, which the Rust watcher's
  `is_inside_hidden_dir` filter never indexes, so `updateTabAfterRenameOrMove` finds no tab,
  `forgetNote` finds no indexed key, `rename_note` finds no entry to re-key, and
  `refreshTree` is already called there. Zero behaviour change for a new call site. The
  `## How` section, which is the scope contract, never mentions `trash.service`.
- `isDirectory` IS NOT THREADED into rename/move. Their entry points
  (`FileTreeItem.svelte:122` and `:201`, `FileExplorer.svelte:253`) do not carry the flag,
  and adding a parameter to three call sites buys nothing: the tree walk is already a no-op
  for a file path. The field is declared optional and read only as a fast-path skip, so
  `deleteItem(path, false)` avoids the walk while an omitted flag means "unknown, walk it".
  Passing a hardcoded `isDirectory: false` from a folder rename would have been a lie.
- "RE-KEYED" MEANS TWO DIFFERENT THINGS and the tests are split accordingly. Only the Rust
  `VaultIndex` can literally re-key; the TS consumer interface exposes `remove(path)` only,
  so the TS tests assert eviction of the old child keys and the Rust tests
  (`vault_file_ops_test.rs::rename_note_inner_*`) assert presence under the new ones. No
  re-key method was added to `NoteChangeConsumer` to make the wording literal.
- ADR-0009:67 named the wrong home for `forgetNote` and told new code to reach for it.
  Amended: `applyPathChange` is what a path change calls, `forgetNote` (now in
  `path-change.service.ts`) is reserved for a single note vanishing on its own. `CLAUDE.md`
  Indexing rules 6 and 8 carried the same stale `fs.service::forgetNote` reference and were
  corrected in the same commit. ADR-0025's index-only amendment landed with the Rust step.

**Deliberate behaviour changes beyond de-drifting.**

- Quick-switcher recents are now DROPPED on rename and move, not just on delete. They are
  dropped rather than re-keyed, which is strictly better than the current dead-path
  behaviour but is not a follow-the-file fix.
- `updateLinksAfterRename` is now reached on move as well as rename, because the owner has
  one step for both. A move never changes the note name, so the function's own same-name
  guard (`link-updater.service.ts:26`, pinned by `link-updater.service.test.ts:78`) makes it
  inert. `moveItem`'s test was updated from "not called" to "called with an unchanged name".

**Follow-up candidates.**

- RE-POPULATION AFTER A FOLDER RENAME IS PARTIAL. The collection property index recovers
  (Rust re-key -> `vault-index-updated` -> issue 35's `buildPropertyIndex` producer), but the
  frontmatter-icon index and the calendar day index do not: their only builders are
  `buildFrontmatterIconIndex` / `scanFilesForCalendar`, called from
  `app-lifecycle.service.ts` and the watcher's full-rebuild branch, and the watcher skips
  directory events. Those two panels stay stale for the renamed subtree until the next full
  rebuild. Out of scope here ("wire the per-path removals built by issue 29, do not write
  new ones"), worth its own issue.
- A RESTORED FOLDER IS NEVER INDEXED AT ALL. The inverse of the bug this issue fixed, and
  the real restore gap: the watcher's dot-in-basename filter drops the directory-create
  event and the empty-list skip returns early, so nothing indexes the restored subtree.
  Closing it needs a subtree re-index mechanism the owner does not have.
- FTS5 AND SEMANTIC ROWS ARE NOT MOVED. `forgetNote` passes no `vaultPath`, so `ftsKey`
  returns null and the FTS removal is skipped. Old paths linger in the search index after
  any rename or move. Pre-existing and identical today for a single-file rename, unchanged
  by this work, but a reviewer will notice it.

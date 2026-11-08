# 04: A rail toolbar edit writes only its key and refuses a conflict

**What to build:** This is the data loss in the view review. `persistViewState` (`RailNoteList.svelte:251`) always sends `filters`, `viewFilters` and `sort` from toolbar state (`type-note-list.logic.ts:133-138`), and `updateViewQuery` writes them over the fresh file (`yaml-parser.ts:183-189,215-221`).

Scenario: a pinned view shows on the rail, and its filter changes in a tab or another editor. The user changes only the Sort. The old filter is written over the new one, the latch adopts the new hash with no re-seed (`view-lens-seed.logic.ts:43-46`), and nothing shows that it happened. `viewRunIndex` also comes from the stale parse, so a reorder on disk sends the write to the wrong view. Even with nothing stale, a Sort click normalizes filters: `and: [x]` becomes `x` (`filter.logic.ts:157-160`) and unknown keys are dropped (`:111-130`).

Pure logic in `type-note-list.logic.ts`:

- `toolbarKeyBase(definition, key)`: the value of a key after the toolbar's own round trip, in a **key-sorted canonical form**.
- `applyToolbarEdit(yaml, key, next, base)`: parses the YAML, derives the view with `railViewIndex` from the fresh bytes, and compares that key to `base`. Same: apply only that key through `updateCollectionYaml`. Different: a conflict. Unparsable: an error, replacing the silent no-op at `yaml-parser.ts:178-180`.

Service: `updateViewToolbarKey(path, key, next, base)` calls `rewriteViewFile` (Issue 03), refreshes, rejects with `ViewWriteConflict`, and otherwise returns the post-write definition.

`RailNoteList.svelte`:

- The three handlers name their key.
- A `toolbarBase` record is set at seed time and advanced at call time.
- If another key on disk differs from local state after the write, call `stepSeed({ kind: 'save-failed' })`, so newer values are not hidden by the latch.
- On conflict the existing catch re-seeds from the file. The toast reads "This view changed. Your edit was not saved." Do not say "on disk": with a dirty tab holding other filters, the disk is not what changed.

Remove what this orphans: `viewRunIndex` (`:132,198,231,251`), `buildViewYamlUpdates`, `updateViewQuery` if no caller remains, and `ViewQueryResult.viewIndex`, whose only read is `RailNoteList.svelte:231`.

**Blocked by:** 03

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing tests first:
  - Component: change disk filters with no bump, click Sort. `files[VIEW]` keeps the new filters and gains the sort. This reproduces the loss.
  - Component: the same disk change, then edit a filter. The file is unchanged, the toast shows, and the toolbar shows the file.
  - Component: a dirty tab with different filters refuses a filter edit and leaves the buffer intact.
  - Logic: a sort edit on `and: [x]` keeps that shape and unknown filter keys.
  - Logic: views reordered on disk write to the view `_rail_view` names.
  - Logic: two consecutive edits in one session never self-conflict, including first group `or`, then `and`. `filterGroupsToFilter` emits keys in group order, while a re-read yields `and`, `or`, `not`.
- [x] A Sort click leaves filter bytes structurally unchanged.

## Notes

- A touched filter key may still normalize. That is accepted and should be stated in the commit.
- A conflict false positive (a reformat that reorders keys) fails on the safe side.
- Toolbar writes still drop YAML comments, which is documented behavior.
- **Size:** M.

## Comments

- 2026-11-05, branch `issue/04-rail-toolbar-writes-one-key`: added `toolbarKeyBase` and `applyToolbarEdit` (one-key write, conflict and parse-error results) in `type-note-list.logic.ts`, the `updateViewToolbarKey` service over `rewriteViewFile`, and per-key handlers with a `toolbarBase` record and a stale-key re-seed in `RailNoteList.svelte`; removed `viewRunIndex`, `buildViewYamlUpdates`, `updateViewQuery` and `ViewQueryResult.viewIndex`. Full suite at 31baf0b2f: 540 files, 12861 passed, 1 skipped, 1 todo; `pnpm build` passed. Review round 1: APPROVED with two nits, neither fixed (the non-typechecking intermediate commit is squashed; the optional re-seed assertion guards a harmless case), see `work/04/review.md` Resolution.

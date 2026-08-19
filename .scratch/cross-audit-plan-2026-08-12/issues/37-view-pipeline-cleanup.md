# Issue 37: TypeNoteList view pipeline cleanup

Status: ready-for-agent
Phase: P4
Source: ARCH 6.0 (remaining after issue 16 discharged its cache wiring) — plan-2026-08-12.md §P4 — Worth-exploring variants and heavy-collateral PARTIALs

Blocked by: 16-view-parse-cache-wire

## What

Arch 6.0's cache-clear leg was already discharged by issue 16 (the C02 commit). What remains is the
small view-pipeline cleanup in `TypeNoteList`: a reactive effect that should read its inputs
synchronously, a seed marker that never resets, and a comment that no longer describes the code.

## How

- Make the `TypeNoteList` effect read `propertyIndex` / `isIndexReady` **synchronously** (not through
  a deferred/async hop).
- **Reset `seededViewPath` on `contentHash` change** — today it stays set, so a changed view is not
  re-seeded.
- Fix the stale comment in the same file.
- **No store+service pair.** Do not create a new store or service module for this: ADR-0004 forbids
  preemptive store+service pairs, and nothing here needs shared reactive state.
- The cache wiring from arch 6.0 is already done in issue 16 — do not redo it or re-add the clears.
- Test collateral in the same commit: assert the re-seed happens on a `contentHash` change and that
  the effect sees the index-ready value in the same tick, against real store state.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only this change's files (`git add <specific files>`), verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

### 2026-08-19 — implemented (not yet committed)

**Confirmed: two independent defects plus a false comment, all three real.**

LEG 1 (async-hop read). `TypeNoteList.svelte`'s notes effect read `collectionStore.propertyIndex`
only at the old line 220, i.e. after `await getCachedViewDefinition(...)`. Svelte 5 collects effect
dependencies during the synchronous run only, so the effect was never subscribed to the index. A view
selected before the deferred `buildPropertyIndex()` (`app-lifecycle.service.ts:263`, `setTimeout(0)`)
landed stayed permanently on "No notes": `executeQuery` builds its record set from
`Array.from(index.values())`, and nothing bumps `entriesVersion` when the index is published.

LEG 2 (seed marker never resets). `seededViewPath` was set at the parse-failure and seed branches and
cleared only when the selection stopped being a view, so an external edit to the SAME `.view` never
re-seeded the toolbar. Worse than a stale toolbar: `buildOverriddenQuery`
(`type-note-list.logic.ts:79-84`) REPLACES `definition.filters` / `view.filters` with the local state,
so the stale seed actively wiped the freshly-parsed filter.

LEG 3 (comment). The old comment claimed re-seeding happened "after a remote/external YAML change"
(false — that is leg 2) and named a function `persistState` that does not exist (`persistViewState`).

**Fix.** Read `collectionStore.propertyIndex` + `isIndexReady` synchronously inside the
`sel.kind === 'view'` branch (branch-local so non-view selections stay unsubscribed from per-note
index churn) and pass them into `loadViewNotes`; both call sites updated. New
`getViewContentHash(path)` export in `view-parse-cache.ts`; `seededViewHash` tracked alongside
`seededViewPath` and re-seeded IN PLACE (never nulled, so `viewToolbarReady` does not flicker and
unmount an open popover) when either differs. Both markers are set in the seed branch, the
parse-failure branch and the `selfUpdate` branch — the last one matters because `persistViewState`
-> `updateViewQuery` -> `refreshViewDefinition` mints a new hash for our own write, and without
adopting it the next effect run would re-seed and fight the user's just-applied filter. `isIndexReady`
short-circuits the query before the index exists (behaviourally identical to querying an empty map,
minus the wasted work). No new store or service module (ADR-0004). Cache clears from issue 16 untouched.

**Red-green evidence.**

New `src/tests/lib/features/type-definitions/TypeNoteList.view.test.ts` (jsdom, real `mount()`,
the ResizeObserver + `offsetParent` shims that virtua's VList needs, real stores throughout).

Red against unfixed code:

```
× fills the list when the property index lands after the view is selected
  AssertionError: expected [] to deeply equal [ 'Alpha', 'Beta', 'Gamma' ]
× re-seeds the toolbar filters when the .view content hash changes
  AssertionError: expected [ 'Alpha', 'Beta', 'Gamma' ] to deeply equal [ 'Gamma' ]
Tests  2 failed | 3 passed (5)
```

Probe A drives ONLY `collectionStore.setPropertyIndex(...)` after the view is selected — no
`setEntries`, no selection change, no sub-filter click, no vault/settings write, i.e. none of the six
side channels that would re-fire the effect and mask the missing subscription.

`view-parse-cache.test.ts` red by construction: `TypeError: getViewContentHash is not a function`
(4 new cases: uncached path, stable across identical refreshes, changes on content change, undefined
after `clearViewParseCache`).

Green after the fix: `Test Files 9 passed (9) / Tests 267 passed` for the type-definitions suite.

Per-leg mutation checks (each mutation applied alone, then reverted):

- `seededViewHash !== contentHash` removed from the re-seed guard -> only probe B fails.
- both effect reads wrapped in `untrack(...)` -> only probe A fails.

**Collateral.** `TypeNoteList.perf.test.ts`'s `view-parse-cache` mock factory gained
`getViewContentHash` — without it Vitest throws "No 'getViewContentHash' export is defined on the
mock" at import time and a currently-green test breaks.

**Gate.** `pnpm check` 0 errors / 0 warnings (191 files) - `pnpm vitest run` 285 files, 6342 passed,
1 todo - `pnpm build` exit 0.

**Plan discrepancies.** None. The issue file and the discovery brief agreed; arch 6.0's cache-clear
leg was already discharged by issue 16 and was not touched.

**Minor findings, worth follow-up issues (NOT fixed here — out of scope):**

1. `loadViewNotes`'s `entries` parameter is dead. Every use inside the function re-derives
   `freshEntries` from `typeDefinitionsStore.entries` (TypeNoteList.svelte:257-261). Both call sites
   compute and pass an argument that is discarded.
2. `getViewContentHash(path)` is a second cache lookup after `await getCachedViewDefinition(path)`.
   A concurrent `refreshViewDefinition` (TypeSidebar's 1s-debounced count updater,
   `TypeSidebar.svelte:100`) can land between them and pair a newer hash with the definition already
   returned. Worst case is one extra re-seed with correct data. Returning `{ definition, contentHash }`
   from a single call removes it, at the cost of touching `view-parse-cache.test.ts`,
   `app-lifecycle.service.test.ts` and `fs.service.test.ts`.
3. The sort half of the view toolbar has no effect on the rendered list. `executeQuery`'s ordering is
   discarded (only `new Set(result.records.map(r => r.path))` survives) and the list is re-sorted by
   the frontmatter `_sort` via `getNotesForViewPaths`. `localSort` only reaches the persisted YAML.

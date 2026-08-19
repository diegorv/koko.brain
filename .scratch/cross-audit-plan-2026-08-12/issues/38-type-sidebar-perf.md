# Issue 38: Type sidebar lookup/sort performance

Status: ready-for-agent
Phase: P4
Source: ARCH 6.1 (reduced) — plan-2026-08-12.md §P4 — Worth-exploring variants and heavy-collateral PARTIALs

Blocked by: 15-inbox-type-sidebar-cleanup

## What

Arch 6.1 as filed was broad; only one part is a genuine hotspot. Three linear entry lookups should
go through `getEntryByPath`, and `sortViewFiles` should take a `Map` so its comparator stops doing a
scan per comparison. Everything else in 6.1 is optional.

## How

- Swap the **three** linear lookups to `getEntryByPath`.
- Change `sortViewFiles` to take a `Map` and use it in the comparator — **this is the only genuine
  hotspot** in the finding.
- Memoized `visibleEntries` is **optional**; skip it unless it is measurably needed. Do not build it
  speculatively.
- This **rebases free over issue 15's deletes** (the C05 inbox/system-folder deletions) — apply on
  top of them, do not re-derive or resurrect anything issue 15 removed.
- Test collateral in the same commit: sort-order assertions over the `Map` comparator (stable order,
  empty map, missing entry) plus coverage for the swapped lookups, asserting real returned data.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only this change's files (`git add <specific files>`), verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

### 2026-08-19 — implemented (pending commit)

**Red-green evidence.**

Red (before the change, `pnpm vitest run src/tests/lib/features/type-definitions/`): 10 failures.

- `type-sidebar.logic.test.ts > sortViewFiles` — all 5 cases:
  `TypeError: entries.find is not a function` at `type-sidebar.logic.ts:461` (the comparator
  received the new `Map` while the signature still declared `NoteEntryV2[]`).
- `type-definitions.store.test.ts > entriesByPath` — all 5 cases:
  `TypeError: Cannot read properties of undefined (reading 'size'|'get')` — the getter did not exist.

Green (after): `9 passed (9) / 278 passed (278)` for the feature folder.

**Mutation checks** (the collateral is parity coverage for a behavior-preserving refactor, so each
new assertion was verified to actually die when the swapped lookup is broken):

- `TypeNoteList.svelte` lines 120/134 forced to `const entry = undefined` →
  `TypeNoteList.view.test.ts` fails `labels the header from the .view entry _sidebar_label` and
  `renders a pill per _list_properties_display value on each row` (2 failed | 6 passed).
- `TypeSidebar.svelte:233` forced to `{@const viewEntry = undefined}` AND `sortViewFiles`'s
  comparator forced to `getViewOrder(undefined)` → `TypeSidebar.test.ts` fails both ordering/label
  cases: `expected [ 'alpha', 'beta' ] to deeply equal [ 'Beta View', 'Alpha View' ]` and
  `expected [ 'alpha', 'beta' ] to deeply equal [ 'beta', 'alpha' ]`.
- Reverting `sortViewFiles`'s parameter to an array is additionally caught by `pnpm check`
  (the single production caller passes `Map<string, NoteEntryV2>`).

**What discovery found.**

- `sortViewFiles` (`type-sidebar.logic.ts:459`) was the only genuine hotspot: two `entries.find(...)`
  scans per comparison, so O(V log V × N). Its single production caller is `TypeSidebar.svelte:43`,
  a `$derived` that re-runs on every `setEntries` (fired from the 300 ms-debounced
  `vault-index-updated`).
- `entriesByPath` was module-private in the store, so the `Map` change required exposing
  `get entriesByPath()`. Reactivity is equivalent: `entries` and `entriesByPath` are both `$state`
  and are always reassigned together (`setEntries` lines 53/63, `reset` lines 75/78);
  no writer touches one without the other, and no code mutates entry objects in place. A comment on
  the new getter records that invariant.
- `getEntryByPath` returns pre-proxy objects (the index is built from the raw `value` argument).
  That tradeoff is pre-existing and already relied on by `icon-resolver.ts:63`; none of the three
  swapped sites used nested-field reactivity.

**Plan discrepancies.**

- The issue says "the **three** linear lookups", but four `.find((e) => e.path === ...)` sites
  existed. The three swapped are the ones over the store's own `entries`
  (`TypeNoteList.svelte:120`, `TypeNoteList.svelte:134`, `TypeSidebar.svelte:233`). The fourth,
  `TypeNoteList.svelte:266`, scans `freshEntries` (the `excludeSystemFolder`-filtered array) and was
  deliberately left alone — see the follow-up below.
- Memoized `visibleEntries` was explicitly optional and was NOT built.
- `TypeSidebar.test.ts` was listed as optional (mounting cost). It mounted cleanly with nine mocks
  and is included; it is the only coverage for the `TypeSidebar.svelte:233` swap and for the
  end-to-end `entriesByPath → sortViewFiles` wiring.

**Follow-up worth an issue (minor).**

`TypeNoteList.svelte:266` resolves the selected `.view`'s `_sort` via
`freshEntries.find((e) => e.path === viewPath)`, where `freshEntries` excludes the templates system
folder. `collectViewFiles` (`type-sidebar.logic.ts:413`) walks the whole tree with no such
exclusion, so a `.view` stored inside the system folder IS selectable from the sidebar but resolves
to `undefined` there, silently falling back to `getViewSort(undefined) === 'modified'` and ignoring
its `_sort`. Swapping it to `getEntryByPath` would fix that but is a behavior change, out of this
issue's scope.

**Gate.** `pnpm check` 0 errors / 191 files; `pnpm vitest run` 286 files, 6356 passed | 1 todo;
`pnpm build` succeeded. No e2e collateral changed (`e2e/specs/` has no type-sidebar or `.view`
spec), so `scripts/e2e.sh` was not run.

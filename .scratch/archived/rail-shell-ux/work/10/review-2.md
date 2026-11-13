VERDICT: APPROVED

Re-review, round 2, of the fix commit 520b64c10 (`git diff 20ddda6f2..HEAD`): `RailNoteList.svelte`, `lens.logic.ts`, `RailNoteList.view.test.ts`, `lens.logic.test.ts`, plus the Resolution section of review.md.

## Previous findings

| # | Severity | Decision | Evidence |
|---|----------|----------|----------|
| 1 | minor | resolved | `RailNoteList.svelte:134-142`: for a view lens whose `viewLoaded.path` is not `viewPath`, `resolved` now returns `resolveViewLens(viewPath, { kind: 'loading' }, lensContext())`, so the body takes the `resolved?.status` Loading branch (`:516-520`) instead of "No notes here", and `viewToolbarReady` (`:145`, `!resolved.status`) hides Sort, Filter and New here. The same path covers a switch to another uncached view (the old view's `viewLoaded` is tagged with its own path). New test "shows Loading, not an empty list, while the first read of the .view is in flight" (`RailNoteList.view.test.ts:444-460`) parks `readTextFile`, asserts Loading text, no `[data-note-list-empty]`, no toolbar, then releases and asserts the rows; without the fix `resolved` is null and the empty branch renders, so the test would fail. |
| 2 | nit | rejection stands | No change asked: the slot keeps the same class pending and counted, which is what the criterion requires. |
| 3 | nit | resolved | `lens.logic.ts:580` message is "The .view has no views to run"; `lens.logic.test.ts:1076` asserts it. No other test or e2e spec reads the old text (grep of `src` and `e2e`). |

## Acceptance criteria re-checked

- [met] `resolveViewLens(viewPath, load, ctx)` takes a view-load state instead of `ViewQueryResult | null`: `loading`, `missing`, `error` with a message, or `ran` with the query result. `ResolvedLens` carries the matching status (`loading`, `missing`, or `error` with its message; absent for a view that ran). A `ran` result that carries Issue 06's filter error resolves to `error` with that message. Logic test per case, the parse message taken from the real `parseCollectionYaml` (`views: [` and a file with no `views`) — `resolveViewLens` loading branch unchanged and reused by the fix; message text change in `viewLoadFromQuery` is asserted in `lens.logic.test.ts`; the file passes.
- [met] `RailNoteList` renders the message and an "Open view" button for an errored view lens (parse failure, read failure, filter error), "This view no longer exists" with no Open button for a missing one, a Loading state while `collectionStore.isIndexReady` is false, and "No notes here" only for a view that ran and matched nothing (component test, real stores) — Loading now also covers the in-flight first read (new component test, real stores); error, missing, index-not-ready Loading and "No notes here" tests still pass in `RailNoteList.view.test.ts`.
- [met] Sort, Filter and New here show only for a view that ran; they are hidden in the Loading, missing and error states (component test) — The new in-flight test calls `expectNoToolbar()` during Loading; `viewToolbarReady` still requires `!resolved.status`; the ran tests still find Sort/Filter.

## Findings

None open or new. Regression check: the only consumer that tests `resolved` for null is the folder-lens branch of `currentNewNoteRule` (`RailNoteList.svelte:276`), unaffected since a view lens returns before it. During the in-flight read the header label now shows the view's label (from `resolveViewLens`) instead of an empty string, which is an improvement, not scope creep. No test weakened or deleted; no layer-baseline, `BASELINE_SIZE` or composition-root change; `src-tauri/` untouched.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings (213 files).
- `pnpm vitest run src/tests/lib/features/rail-shell/ src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts`: exit 0, 16 files, 547 tests passed (includes both changed test files).
- Not run: full suite, `pnpm build`, E2E (deliver's).

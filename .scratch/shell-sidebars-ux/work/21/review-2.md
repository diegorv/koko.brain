VERDICT: APPROVED

Re-review, round 2, of the fixes after `review.md` was first committed: `git diff 0f894b6a1..HEAD` (commits b8d6c64b9 and ab41923f1).

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | minor: pin or unpin leaves fades and badge stale (`EditorTabs.svelte:77-81`) | rejection stands | `togglePin` and `setPinned` assign `tabs = result.tabs` (`editor.store.svelte.ts:147-162`), and the `tabs` getter returns the `$state` variable (`editor.store.svelte.ts:34`). The length effect reads `editorStore.tabs.length`, so it depends on the `tabs` signal itself and re-runs on every reassignment, even when the length stays the same. The new test "updates the count when a tab is pinned or unpinned, with no resize or scroll" gives pinned tabs a 40 px stub width and walks `[One,Two,Three]` (450 px, badge 1) to two pinned plus one unpinned (230 px, no badge, no right fade) and back to 340 px (badge 1, right fade). The `ResizeObserver` stub never fires and no scroll happens, so only the length effect can update the badge. It passes. |
| 2 | nit: dark hover weakens the pressed toggle's fill (`AppShell.svelte:191`) | resolved | `dark:hover:bg-accent/50` moved into the unpressed branch of the ternary, so the pressed toggle keeps `bg-accent` under the pointer and the unpressed one keeps its hover fill. `AppShell.test.ts:396,406` assert the class is present while unpressed and absent while pressed. `Rail.test.ts:538` asserts the same class on a different button (the rail toggle), which this diff does not touch. |

The third fix (badge `text-[9px]` to `text-[11px]`, `EditorTabs.svelte:198`) was not a review finding. It brings the badge to the 11 px floor that `src/tests/lib/chrome-type-scale.test.ts` holds, and that test now passes. The badge is `absolute`, so the larger text does not move the list button or the strip edge the E2E specs measure.

No test was weakened or deleted: the `EditorTabs.test.ts` geometry stub changed from `i * TAB_WIDTH` to a per-tab sum, which gives the same numbers when no tab is pinned, and every earlier case still passes. No scope creep. No change to `layer-baseline.json`, `BASELINE_SIZE` or the composition roots.

## Acceptance criteria re-checked

- [met] `EditorTabs.test.ts` (real stores, `ResizeObserver` stub as `EventCalendarView.test.ts:8-13`, stubbed geometry): an overflowing scroller scrolled to the middle shows both fades and the badge; nothing overflowing shows neither; opening one more tab without a resize updates the badge. — The earlier cases still pass with the per-tab width stub, which gives the same widths when no tab is pinned. The pin case was added. The file passes.
- [met] `AppShell.test.ts`: the toggle has `aria-label="Right sidebar"`, `aria-pressed` follows `rightSidebarVisible` both ways, and it has the ring classes; "renders one right-sidebar toggle" passes unchanged. — The attributes, title and ring classes are unchanged in `AppShell.svelte:190-195`. The pressed-state test adds two class assertions and passes. The existing toggle test is not in the fix diff.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (235 files, 0 errors, 0 warnings). Targeted vitest exit 0: 4 files, 73 tests (`EditorTabs.test.ts`, `AppShell.test.ts`, `chrome-type-scale.test.ts`, `editor-tabs.logic.test.ts`). The full `pnpm vitest run` is deliver's to run.

## Findings

None open or new.

## Checks run

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/core/markdown-editor/EditorTabs.test.ts src/tests/lib/app/AppShell.test.ts src/tests/lib/chrome-type-scale.test.ts src/tests/lib/core/markdown-editor/editor-tabs.logic.test.ts`: exit 0, 73 passed.
- I searched `e2e/` and `src/tests/` for `9px` and `dark:hover:bg-accent`: only the assertions named above refer to the changed strings.
- I did not run E2E in this round (the fixes change only a class on the toggle and the badge's font size), I did not disable the length effect myself to confirm that the pin test fails without it, and I did not look at the running app.

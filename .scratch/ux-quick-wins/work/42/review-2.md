VERDICT: APPROVED

Re-review round 2 of the fixes after `.scratch/ux-quick-wins/work/42/review.md` (first committed in f13eb5c07): `git diff f13eb5c07..HEAD` is the single fix commit 33a72a151, which changes one line of `src/lib/plugins/kanban/KanbanView.svelte` (:588, the chip `title`), appends "## Resolution" to review.md and adds follow-up Issue `.scratch/ux-quick-wins/issues/50-kanban-card-menu-opens-from-keyboard.md`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | rejection stands | No key opens the card menu; adding one is outside Issue 42's acceptance criteria (none names a key). Follow-up Issue 50 exists with a concrete scope (`Shift+F10` / ContextMenu key on the focused card, failing test first in KanbanView.test.ts, help update), Status needs-triage. The help page still makes no keyboard claim (21-kanban.md:73,76,193 describe right-click only). |
| 2 | nit | rejection stands | No change, as the review allowed: KanbanView.svelte:585 `{#if !canReorder && currentViewMode === 'board'}` unchanged; the list-view test ("is absent in list view, which has no drag and no card menu") still pins it. Deliver should note the board-only default in the closing commit. |
| 3 | nit | resolved | KanbanView.svelte:588 now reads "Drag is off while the board is sorted or filtered. To move a card to another lane, use Move to in the card menu.", matching the review's suggested text and the help page (21-kanban.md:193). No test asserted the old first sentence (`grep "Drag to reorder"` in src/help/e2e finds only unrelated lane-grip and properties-picker labels); the chip tests still assert "card menu" and "Move to" in the title and pass. A test-free copy change is acceptable for a tooltip string, and the commit carries a Test-Exempt trailer. |

## Acceptance criteria re-checked

- [met] The chip shows with a sort other than manual and with a filter, and not in manual order with no filter; it names the card menu. — The fix touches only the chip title; KanbanView.test.ts chip tests (absent in manual/no filter, present with `date-asc` with title containing "card menu" and "Move to", present with a filter and gone when it clears, absent in list view) pass in this re-review's run.
- [met] Frontend gate: pnpm check and pnpm vitest run pass. Not checked in WKWebView: submenu placement near the board edge. — `pnpm check` exit 0 (236 files, 0 errors, 0 warnings), run by this re-review. Targeted vitest exit 0 (4 files, 105 tests): src/tests/lib/plugins/kanban/KanbanView.test.ts, chrome-state-styles, menu-item-anatomy, chrome-type-scale. The full suite is deliver's to run. WKWebView placement is out of scope per the criterion.

## Findings

None open or new. The fix is a one-line copy change with no behavior, test or scope impact; Issue 50 is the workflow's own follow-up record.

## Other checks

- No test weakened or deleted: the fix commit touches no file under src/tests/.
- No layer-baseline entry, BASELINE_SIZE change or composition root added.
- Worktree clean before this review file.
- Not checked: E2E, WKWebView tooltip rendering, the full vitest suite (deliver's).

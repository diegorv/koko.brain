VERDICT: APPROVED

## Previous findings

| # | Sev | Status | Evidence |
|---|---|---|---|
| 1 | major | resolved | `src/routes/(app)/+page.svelte:48` chevron is `text-muted-foreground`, hover `group-hover:text-foreground`; `:57` remove-vault X is `text-muted-foreground` (still hovers to `text-foreground`). `muted-text-alpha.test.ts` now scans `SCAN_DIRS = ['src/lib', 'src/routes']`, asserts `src/routes/(app)/+page.svelte` is in the file list (so the widening cannot silently scan nothing), and keeps the `components/ui` skip. No allow-list entry added; the two `text-foreground/80` paths at `:44` went to `text-foreground`, a stronger color, which is in the spirit of the Issue. Guard passes. |
| 2 | minor | resolved | `EventMonthGrid.svelte:145` and `EventAllDayLane.svelte:90` locks lose `opacity-70`. `EventMonthGrid.test.ts:189-190` and `EventAllDayLane.test.ts:247-248` assert the lock's class has no `opacity-` token; the preceding `aria-hidden` assertion on the same selector proves the lock exists, so the regex check cannot pass on a missing element. |
| 3 | nit | resolved (deferred to deliver) | Accepted as a squash-body item; the Resolution lists the kept decorative dims (calendar dashed grid lines, Properties type-picker chevron, NoteActionBar breadcrumb separator `opacity-60`, toolbar select chevrons `opacity-50` in CalendarConfigPanel, FilterRow, FilterPanel, SortPanel). Deliver must carry it into the squash commit. |

## Acceptance criteria re-checked

- [met] Failing test first, a source scan in `src/tests/lib/architecture/` (style of the existing scan tests, comments stripped): no `.svelte` file under `src/lib` outside `components/ui/` has `text-(muted-foreground|right-sidebar-muted-fg|tab-text-inactive|file-explorer-muted-fg|foreground)/[0-9]+` or `placeholder:text-*/NN`. An explicit allow-list names the decorative exceptions with a reason each. It fails today on the sites above. — The fix widens the scan to `src/routes` without loosening it: same regex, same comment blanking, same allow-list, `components/ui` still skipped and still asserted absent. `pnpm vitest run src/tests/lib/architecture/muted-text-alpha.test.ts` passes on HEAD.
- [met] Frontend gate passes; tests that pinned an old opacity class move on purpose and the commit says why. — `pnpm check`: exit 0, 0 errors, 0 warnings. Targeted vitest over `muted-text-alpha.test.ts`, `EventMonthGrid.test.ts`, `EventAllDayLane.test.ts`, `EventCalendarView.test.ts`: exit 0, 4 files, 142 tests. No test pinned `opacity-70` on the lock or the welcome page `/50` and `/80` classes (searched `src/tests` and `e2e`; the only `text-foreground/80` hit is `text-roles.test.ts`, a `cn()` merge test unrelated to the page). The full suite is deliver's to run.

## Findings

None open or new.

## Checks run

- `pnpm check` in the worktree: exit 0.
- `pnpm vitest run` on the four files above: exit 0.
- Scope: commit 9805ff45c touches only the two finding sites, their tests, the guard and `review.md`. `layer-baseline.json` and `BASELINE_SIZE` untouched.
- Not checked: the running app; the welcome page has no component test, so its change is covered only by the source scan.

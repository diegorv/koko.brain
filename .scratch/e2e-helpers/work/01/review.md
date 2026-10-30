VERDICT: APPROVED

# Review: e2e-helpers issue 01, active-tab helpers

Reviewed `git diff main...HEAD` (734ad06f, d4d446ad, 0978fe7f) in
`.claude/worktrees/e2e-helpers-01-active-tab-helpers`. Only `e2e/fixtures/helpers.ts`
and `e2e/specs/properties-cross-note.spec.ts` change outside `.scratch/`.

## Acceptance criteria

- [x] **`activeTab` matches exactly one element, the active tab, and its JSDoc names the attribute.** Met.
  - `EditorTabs.svelte:19` is the only `.editor-tabs-bar` (a `role="tablist"`), and `:35-37` renders `role="tab"` + `aria-selected={index === editorStore.activeIndex}`. `EditorTabs` is mounted once (`EditorView.svelte:49`, which is mounted once in `AppShell.svelte:159`). The only other `role="tab"` in `src/` is `EventCalendarHeader.svelte:110-111`, outside the scope.
  - Review probe (temporary spec, not committed) with the Calendar tab open: bare `[role="tab"][aria-selected="true"]` has count 2, `activeTab(page)` has count 1, `expectTabActive(page, 'Calendar')` passes, and the result does not contain the daily note name. Passed.
  - Review probe on a minimal page: `expect(locator).toContainText()` over two matches fails with "strict mode violation ... resolved to 2 elements", so dropping `.first()` makes a future multi-match fail loudly, as the JSDoc says.
  - JSDoc at `helpers.ts:76-84` names `aria-selected="true"` and the `.editor-tabs-bar` scope and gives the reason.
- [x] **At least one spec calls `expectTabActive` after a tab switch and passes via `bash scripts/e2e.sh`.** Met. `properties-cross-note.spec.ts:84` (after clicking back to A) and `:116` (`switchToB`). The local `expectActive` duplicate is removed. My run, `bash scripts/e2e.sh e2e/specs/properties-cross-note.spec.ts e2e/specs/zz-review-probe.spec.ts --retries=0`, finished with 5 passed and exit=0 (3 spec tests + 2 probes). Log: `.claude/worktrees/test-logs/e2e-helpers-01-review-e2e.log`.
- [x] **Shown failing first: with the old `data-state` selector the updated spec fails.** Met, reproduced by me: I swapped the old `[role="tab"][data-state="active"]` + `.first()` back in temporarily and got 1 failed + 2 interrupted, "element(s) not found", exit=1. Then I restored the file (`git status` clean). Log: `.claude/worktrees/test-logs/e2e-helpers-01-review-red.log`.

## Other checks

- `pnpm check`: 211 files, 0 errors, 0 warnings (`test-logs/e2e-helpers-01-review-check.log`). `e2e/` is outside its tsconfig. A standalone `tsc --strict` over the two changed files reports only the existing `window.__e2e` typing errors, on lines this diff does not touch; there are none in `helpers.ts`.
- Scope: two files, both named by the Issue's Touches. Helper names kept. No `src/` or `src-tauri/` change, so vitest, build and cargo do not apply. Tabs used.
- Commits follow docs/COMMITS.md (Context/Problem/Solution/Behavior/Files, trailer present). The Issue's `Status` stays `ready-for-agent`, as the workflow requires while the Issue is in flight.

Test verdict rests on: `e2e/specs/properties-cross-note.spec.ts` (green and red runs above) plus two temporary probes (calendar-open count, Playwright strict mode). The probes were deleted and not committed.

## Findings

1. **Low (non-blocking), `e2e/fixtures/helpers.ts:80-82`.** No committed spec runs `activeTab` while a Calendar tab is open, so the scope that the JSDoc justifies has no regression test. Only the review probe covers it. Fix (optional, follow-up): call `expectTabActive(page, 'Calendar')` in `e2e/specs/event-calendar.spec.ts:113` in place of the inline selector.
2. **Info (non-blocking), `e2e/specs/*.spec.ts` (about 15 sites, e.g. `tabs.spec.ts:23`, `event-calendar.spec.ts:157`, `:422`).** These specs still inline the unscoped `[role="tab"][aria-selected="true"]`, so the helper can still drift from what the suite uses. The Issue asks for one spec only, so this is out of scope here. Fix (follow-up issue, if wanted): migrate them to `activeTab` / `expectTabActive`.

## Resolution

1. Fixed. `e2e/specs/event-calendar.spec.ts:113` now calls `expectTabActive(page, 'Calendar')`, so the committed suite runs `activeTab` while the calendar's Day/Week/Month tablist is also on screen (a second `role="tab"` + `aria-selected="true"`). Strict mode would fail that assertion if the `.editor-tabs-bar` scope were dropped. `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts --retries=0`: 34 passed, exit=0 (`.claude/worktrees/test-logs/e2e-helpers-01-deliver-e2e.log`).
2. Not fixed here. The Issue scopes the change to one spec, and migrating about 15 inline sites is a separate change. Left as a candidate follow-up Issue.

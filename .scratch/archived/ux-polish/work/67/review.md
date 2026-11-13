VERDICT: APPROVED

## Acceptance criteria

- [met] A grep-style test fails on `group-hover:opacity-100` without a matching `group-focus-within` outside `components/ui` — `src/tests/lib/chrome-state-styles.test.ts` scans `src/lib` + `src/routes` (`.svelte`, `.ts`), skips `src/lib/components/ui/`, and reports `file:line` for any `group-hover[/name]:opacity-100` whose class string has no `group-focus-within[/same name]:opacity-100` (or the element's own `focus-within:opacity-100`, the existing KanbanLane:358 form). Red probe re-run by me: the branch's test pointed at `git archive main src/lib src/routes` failed this scan with the 8 sites EditorTabs:87, PropertiesView:289, PropertyField:148/159/176, TodoistPopover:113, AppearanceSection:189, `routes/(app)/+page.svelte:57`; on the branch it passes. My own grep of `group-hover[^ "]*:opacity-` outside `components/ui` finds only paired reveals plus the `opacity-60` drag grips / resize handle (not `opacity-100`, see finding 2).
- [met] No `transition-all` or `hover:scale` left in chrome components (same test) — the second scan in the same file failed on main with 15 sites (CollectionLinearCalendarView:199, IconPicker:238/246/265/273, PropertiesView:289, PropertyField:148/159/176, TodoistPopover:113, KanbanCard:252, KanbanCardText:54, +page.svelte:31/50/57) and passes on the branch. `grep -rnE 'transition-all|hover(/name)?:scale'` over `src/lib` + `src/routes` outside `components/ui` returns nothing. The 8 `hover:scale` and 9 non-ui `transition-all` sites match the counts in `work/states.md` (11 classes, of which Switch and the Button base are shadcn).

## Findings

1. nit — `src/lib/features/canvas/CanvasInner.svelte:733`, `src/lib/features/canvas/CanvasToolbar.svelte:62` — two scoped CSS `transition: all 0.15s` rules remain and the scan does not look for them. Not an AC miss: the criterion names the `transition-all` utility, `work/states.md` counts these CSS rules separately, and the review's work item 4 (motion tokens, "scoped 0.15s ease CSS") owns them. Fix: none in this Issue; leave for the motion-tokens work.
2. nit — `src/lib/plugins/kanban/KanbanCard.svelte:227`, `src/lib/plugins/kanban/KanbanLane.svelte:236`, `:393` — `opacity-0 group-hover:opacity-60` grips/resize handle are not matched by the scanner. They are non-focusable `div`s, so there is no keyboard focus to reveal on, and Issue 15 owns the lane grip. Fix: none.
3. nit — `src/tests/lib/chrome-state-styles.test.ts:38-46` — a class built with `class={...}` or `class='...'` falls back to line-by-line units, so a hover reveal and its focus reveal written on two lines of one expression would be reported as a violation. Conservative (a false positive, never a miss) and no such site exists today. Fix: none needed.

## Correctness checks

- Each new `group-focus-within` sits inside a per-row `group`, so focus cannot reveal a sibling row's controls: EditorTabs:52 tab (`role=tab`, `tabindex=0`; focusing the tab itself matches `:focus-within`), AppearanceSection:172 theme card (`tabindex=0`), PropertyField:106 field row, PropertiesView:269 `group/rel` (the unnamed group at :176 closes at :215, before the `PropertyField` list at :221), TasksView:201 task row wrapping `TodoistPopover`, `+page.svelte:47` recent row.
- `transition-[filter] duration-100` on the calendar bar fits its `hover:brightness-110` (a `filter` change `transition-colors` would not animate); `transition-all` also animated its `left`/`width`. A justified deviation from the Issue's `transition-colors` wording.
- Swatch `hover:scale-110` -> `hover:opacity-80` follows from "no `hover:scale` in chrome"; reveal sites use `transition-opacity`, per `states.md` ("Reveal states use transition-opacity").
- Open Vault `Button` (`+page.svelte:31`) still gets the shadcn base transition; only the `hover:scale-[1.02]` motion is gone.
- The diff changes class strings and one HTML comment only; no script logic, no `src/tests/lib/architecture/layer-baseline.json` or `BASELINE_SIZE` change. Earlier review findings 1 and 3 (stale `states.md` pointer, contradictory fixture comment) are fixed in `ad5b59585`.
- Worktree clean (`git status --short` empty). No other test in `src/tests` or `e2e` asserts the changed class names.

## Checks run (by me, in the worktree)

- `taskpolicy -c background pnpm check`: exit 0, 217 files, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/chrome-state-styles.test.ts src/tests/lib/core/markdown-editor/EditorTabs.test.ts src/tests/lib/core/settings/AppearanceSection.test.ts src/tests/lib/features/properties src/tests/lib/features/file-icons/IconPicker.test.ts src/tests/lib/features/collection src/tests/lib/features/tasks src/tests/lib/plugins/kanban src/tests/lib/chrome-type-scale.test.ts src/tests/lib/radius-scale.test.ts src/tests/lib/pane-toolbar.test.ts`: exit 0, 67 files, 1714 tests passed. The test verdict rests on these files. TodoistPopover, KanbanCard, KanbanCardText and `routes/(app)/+page.svelte` have no dedicated test file; their folders' suites are included where they exist.
- Red probe: the new test run against main's `src/lib` + `src/routes` failed 2 of 6 (both scans), sites listed above.
- Not run: the full suite and `pnpm build` (deliver's). The CSS was not checked in a running app; jsdom applies no CSS, so the source scan is the only test.

## Resolution

- Nit 1 (CSS `transition: all` rules in CanvasInner/CanvasToolbar): no change. The criterion names only the `transition-all` utility; the scoped rules belong to the motion-tokens work.
- Nit 2 (KanbanCard/KanbanLane `opacity-0 group-hover:opacity-60` grips): no change. They are non-focusable divs, so focus cannot reveal them; Issue 15 owns the lane grip.
- Nit 3 (line-unit fallback for `class={...}` / `class='...'` in the scan): no change. It can only over-report, never miss, and no split site exists today.

VERDICT: APPROVED

## Acceptance criteria

- [met] Write failing tests first in `src/tests/lib/plugins/mods/ModActionPicker.test.ts`, through the real `modPickerStore` and `modsRunsStore` (no mocked stores), asserting the rendered rows. — New `describe('the running mark')` (ModActionPicker.test.ts:328-439) uses the real host (`startModsHost`), `modPickerStore`, `modsRunsStore` and `modCommandsStore`; no store mocks. Probe: with main's `ModActionPicker.svelte` checked out over the branch's, the file ran 5 failed / 29 passed (the four mark tests and the keyword test failed); restored, 34/34 pass.
- [met] A row whose `busy()` is true shows the text `Running` (the run view's existing label, `STATUS_LABELS.running` at `ModActionPicker.svelte:10`) after its title, and carries `data-mod-action-running`. Idle rows show neither. — ModActionPicker.svelte:170 computes `busy = action.busy?.() ?? false`, :177 sets `data-mod-action-running={busy ? '' : undefined}`, :183 renders `{STATUS_LABELS.running}` inside the title span after the title. Test at :360 asserts "Quiet job Running" plus the attribute on the busy row, and "Noop Does nothing" / "Ask" with no attribute on idle rows.
- [met] The mark follows the run while the picker stays open: it appears when the action starts elsewhere and goes away when the run ends (done, failed or cancelled). — `it.each` at :374-394 opens the picker first, asserts no mark, starts Quiet job from the palette command (no run view opens, asserted), asserts the mark, then ends the run by release / reject / `stop()`, waits for status `done` / `failed` / `cancelled`, and asserts the mark and attribute are gone with the picker still on the list. `busy()` reads `modsRunsStore` `$state` inside the keyed `{#each}`, so it is reactive.
- [met] The mark is part of the row's visible text, not color alone, so screen readers announce it. It does not change the row's search keywords: typing `running` does not filter rows. — The mark is a text node in the row (no `aria-hidden`, no `sr-only`), so the option's accessible name reads "Quiet job Running". `value` (action id) and `keywords` are unchanged (:173-174); bits-ui scores only `value` + `keywords` (node_modules/bits-ui/dist/bits/command/command.svelte.js:132-134, 273-274). Test :396-411 types `running` (no rows) then `quiet` (marked row shown). Mutation probe: adding "Running" to `keywords` when busy makes that test fail.
- [met] Choosing a marked row still opens its run view, and choosing an unmarked row still starts the action (or asks for its input), as today. — `pick()` is unchanged (:76-82). Tests :413-423 (marked row click shows status "Running", still one run) and :425-438 (Noop runs, Ask opens its `Question` field) pass; Issue 02's existing busy-rail and input tests also still pass.
- [met] `help/documentation/28-mods.md` says, in the paragraph on the one-live-run rule, that the picker marks running actions. — 28-mods.md:239 (the "An action has at most one live run." paragraph) adds "In an action picker, an action that is running shows **Running** next to its title, ...". `src/tests/help/mods-example.test.ts` passes.

## Findings

1. nit — src/tests/lib/plugins/mods/ModActionPicker.test.ts:413 — "choosing the marked row opens its run view" never asserts the row is marked before clicking it, so it reads as a plain busy-row test (it also passes on main). Fix: add `expect(isMarked('quiet')).toBe(true);` before `row('quiet').click()`.
2. nit — src/lib/plugins/mods/ModActionPicker.svelte:171 — the comment "typing "running" matches no row" overstates: an action whose id, title or description fuzzy-matches "running" still matches. Fix: say the mark is not in `value` or `keywords`, so its text is not searched.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/plugins/mods/ModActionPicker.test.ts`: exit 0, 34/34.
- `pnpm vitest run src/tests/help/mods-example.test.ts src/tests/lib/app/AppOverlays.test.ts src/tests/lib/plugins/mods/ModDialogHost.test.ts` (docs page test and other files that query picker rows): exit 0, 50/50.
- Red probe (main's component, branch tests): exit 1, 5 failed. Mutation probe (mark as keyword): the keyword test fails. Both probes reverted; worktree clean.
- The test verdict rests on these four files. The full suite and E2E are deliver's to run.
- Scope: the diff touches only `ModActionPicker.svelte`, its test, the docs line and the workflow's `work/03/discovery.md`. No change to run keys, the busy check, the run view or the layer baseline. No `spec.md` exists for this feature.

## Resolution

1. Fixed: the "choosing the marked row" test asserts `isMarked('quiet')` before clicking the row.
2. Fixed: the comment now says the mark is not in `value` or `keywords`, so the search never sees it.

Both nits accepted; none rejected.

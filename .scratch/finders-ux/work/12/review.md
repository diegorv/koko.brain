VERDICT: APPROVED

Reviewed `git diff main...HEAD` (a78eb50cb, a8c0dd686, 8a10041f8) in the worktree. No `.scratch/finders-ux/spec.md` exists; ADR-0002 (shadcn-svelte + bits-ui) is the relevant decision, and the change moves the controls onto it.

## Acceptance criteria

- [met] Failing test first, in a new `src/tests/lib/plugins/graph-view/GraphControls.test.ts` (real `graphViewStore`, no store mock; Select recipe from `src/tests/lib/core/settings/UpdateSection.channel.test.ts:33-100`): with notes in folders `a/` and `b/`, after picking folder `a` the folder control is still shown and offers "All folders" and `b`; choosing "All folders" sets `filters.folder` to `null`. — New file mocks only `@tauri-apps/api/core`, uses the real `graphViewStore`; tests "keeps the control and its other folders after picking a folder with no subfolders" (asserts options `['All folders', 'a', 'b']`) and "clears the folder with All folders" (asserts `filters.folder` null, 3 notes). Mutation I ran: `nodes={simNodes}` back in `GraphView.svelte:470` makes both trapped-filter tests fail (2 failed / 7 passed); restored, worktree clean.
- [met] Picking a tag sets `filters.tag` to it; "All tags" sets `null`. — "sets the picked tag and clears it with All tags" asserts `'work'` then `null`; sentinel `ALL = '__all__'` mapped to null at `GraphControls.svelte:105` and `:123`.
- [met] Orphans and Arrows are `role="switch"` with `aria-checked`; toggling them sets `filters.showOrphans` and `display.showArrows`. — shadcn `Switch` at `GraphControls.svelte:94-97` and `:143-146`; tests find each `[role="switch"]` by its `<label>` text and assert `aria-checked` plus store state. Probe I ran: clicking the "Orphans" label text toggles exactly once per click (no double toggle); bits-ui renders no hidden input without `name`, so the button is the label's control.
- [met] No native `<select>` is left in GraphControls. — Diff removes both; test "has no native select"; `grep '<select'` on the file finds none.
- [met] There is no Close button in the controls; the graph tab still closes from the tab bar and with Cmd+G (existing `graph-view.service.test.ts` cases stay green). — Close button, separator, `X` and `closeGraphTab` imports removed; `closeGraphTab` kept in `graph-view.service.ts:52` (used at `:75`); test "has no Close button"; `graph-view.service.test.ts` closeGraphTab/toggleGraphTab cases pass.
- [met] The mode and zoom buttons have accessible names. — `aria-label` "Global graph", "Local graph", "Zoom in", "Zoom out" at `GraphControls.svelte:47,57,68,76`; test "names the mode and zoom buttons".
- [met] `GraphView.test.ts` stays green; the help page no longer mentions a Close button. — `GraphView.test.ts` passes; `help/documentation/14-graph-view.md:62` now names the tab X and Cmd+G; the only "close" in the page is that sentence.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check`: exit 0, 0 errors, 0 warnings. Targeted `pnpm vitest run src/tests/lib/plugins/graph-view/`: exit 0, 5 files, 93 tests. The full suite is deliver's to run.

## Findings

1. minor — `src/lib/plugins/graph-view/GraphControls.svelte:101,119`: the `|| graphViewStore.filters.tag` / `|| graphViewStore.filters.folder` gates (a set filter keeps its control when its value is not among the options, e.g. folder picked in global mode, then local mode) have no test. My temporary probe (folder `b` in global, then local mode centered on `a/one.md`: control shown with "All folders" and `a`, choosing "All folders" sets null) passed, then I deleted it. Fix: add that case to `GraphControls.test.ts`.
2. nit — `src/tests/lib/plugins/graph-view/GraphControls.test.ts:161-185`: the switch tests click the button directly, so the label-click path a user mostly takes is not covered. My probe showed it toggles once per click in jsdom. Fix: optionally add a label-text click to one switch test.

## Checks this verdict rests on

- `pnpm check` (worktree root): exit 0.
- `pnpm vitest run src/tests/lib/plugins/graph-view/`: exit 0. Covers `GraphControls.test.ts` (new), `GraphView.test.ts`, `graph-view.service.test.ts`, `graph-view.store.test.ts`, `graph-view.logic.test.ts`.
- Mutation check and two temporary probes as described above; none left in the tree.
- Scope: only the files the Issue names (`GraphControls.svelte`, `GraphView.svelte`, the help page, the new test) plus the workflow's discovery file. No layer-baseline change. Tabs throughout.

## Resolution

1. Fixed. `GraphControls.test.ts` adds "keeps a set folder clearable when local mode offers one folder" (folder `b` in global, local on `a/one.md`: options `All folders`, `a`; "All folders" sets null) and "keeps a set tag clearable when local mode offers no tags" (tag `home` in global, local on `a/two.md`: options `All tags`; "All tags" sets null). Removing the two `||` gates makes both fail. The `choose` helper skips reopening a Select that is already open, since Enter on an open trigger closes it.
2. Fixed. "toggles orphans once per click on its label text" clicks the label's `<span>` and asserts one toggle.

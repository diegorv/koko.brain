VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: a new test in `src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts` opens the switcher, types "Ideas" with no files in the tree, dispatches `keydown` Enter on the input, and asserts `create_note` was invoked, `openFileInEditor` was called with `/vault/Ideas.md`, and `quickSwitcherStore.isOpen` is false. It fails on the current code — `QuickSwitcher.test.ts:160-168` ("creates and opens the note on Enter when nothing matches"): empty tree (`fsStore.reset()`, `readDir` resolves `[]`), types "Ideas", dispatches a bubbling `keydown` Enter on the input (`pressEnter`, :84-88), asserts the `create_note` invoke, `openFileInEditor('/vault/Ideas.md')` and `isOpen === false`. Probe: with `main`'s `QuickSwitcher.svelte` swapped in, this test fails (waitFor timeout, Enter has no selected item); with the branch's component it passes. Component restored afterwards, worktree clean.
- [met] The five existing create tests keep their assertions; only the `createFromQuery` helper (about line 59) changes, to click the create item (`[data-slot="command-item"]` with the label) instead of a `button` — `git diff main...HEAD` touches none of the five test bodies (:96-158); `createFromQuery` (:59-66) now calls `typeQuery` and clicks the `[data-slot="command-item"]` whose text has `Create "<query>"` (`data-slot="command-item"` confirmed in `src/lib/components/ui/command/command-item.svelte:14`). All five pass on the branch.
- [met] A new test: when a note matches the query, no create item is rendered and Enter opens the first match. It may pass today; it guards that the create item never takes the selection from a match — `QuickSwitcher.test.ts:183-194`: tree holds `/vault/Ideas.md`, asserts no `Create "Ideas"` text, Enter opens `/vault/Ideas.md`, no `create_note`, switcher closed. It passes on `main`'s component too (the probe run: 1 passed, the guard), as the Issue expects.
- [met] Clicking the create item still creates and opens the note (covered by the rewritten helper) — the five create tests click the item through `createFromQuery` and assert the open path, content, toast and observer behavior; all pass.

## Checks run by this review

- `pnpm check`: exit 0, 232 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/quick-switcher/` (QuickSwitcher.test.ts, quick-switcher.service.test.ts, quick-switcher.store.test.ts): exit 0, 3 files, 25 tests passed. The test verdict rests on these three files.
- Failing-first probe: `main`'s `QuickSwitcher.svelte` with the branch's test file: 7 failed, 1 passed (the guard). The five helper-based tests fail there only because the helper now looks for a `command-item`, which is expected for a helper rewrite.
- Selection probe (temporary test file, deleted, not committed), all 3 passed: (a) a matching query ("Al", `/vault/Alpha.md` selected) changed to a non-matching one ("Ideas"), Enter creates `/vault/Ideas.md`; (b) a non-matching query (`create:Zzz` selected) changed to a matching one ("Alp"), Enter opens `/vault/Alpha.md` without `create_note`; (c) a query `My "x".md` creates `/vault/My "x".md` (no double `.md`, quotes in the value do not break selection).
- bits-ui 2.20.4 source read (`node_modules/bits-ui/dist/bits/command/command.svelte.js`): `setState("search")` runs `#sort({ forceSelectFirst })`, which with `shouldFilter === false` calls `#selectFirstItem()` after a tick (:98-111, :142-149); Enter clicks only the `[data-selected]` valid item (:957-970). So the create item is selected on every query change without binding the Command's `value`, which the Issue allows ("if bits-ui does not select it on its own...").
- Value `create:<trimmed query>` cannot equal a file item value (file items use absolute paths from `flattenFileTree`).
- No layer-baseline change, no new composition root. Indentation in the diff is tabs. Commit `33535cd97` follows the docs/COMMITS.md format and stages a test, so no `Test-Exempt` trailer is needed.
- Not run here: the full suite and `pnpm build` (the Issue's Gate), which belong to deliver.

## Findings

1. nit, `src/lib/features/quick-switcher/QuickSwitcher.svelte:98-106`: the create action now uses the standard `Command.Item` row styling (padded, highlighted when selected) instead of the old centered, muted button. This is consistent with it being a selectable row, and discovery.md records it, but nobody looked at it in the running app. Fix: none required; the owner may glance at it after delivery.
2. nit, `src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts:170-181`: the "query grew" test covers no-match to no-match only. The match to no-match and no-match to match transitions, where the selected item unmounts and a different branch mounts, are untested in the committed suite (this review's probe shows both work). Fix: optional; add a test that types a matching query, then a non-matching one, and presses Enter.

## Resolution

1. Not changed: the finding asks for no fix. The create item is now a selectable `Command.Item` row, and its look is left for the owner to check in the running app after delivery.
2. Fixed: `QuickSwitcher.test.ts` now has two more tests. One goes from a matching query ("Al", `/vault/Alpha.md`) to one that matches nothing ("Ideas"), and Enter creates `/vault/Ideas.md`. The other goes from a query that matches nothing ("Zzz") to a matching one ("Alp"), and Enter opens `/vault/Alpha.md` without `create_note`. `pnpm vitest run src/tests/lib/features/quick-switcher/`: 3 files, 27 tests passed; `pnpm check`: 0 errors.

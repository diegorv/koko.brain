VERDICT: APPROVED

## Acceptance criteria

- [met] Failing tests were written first and seen failing, for each item below. — Vitest items go test and code in one commit each (`222010fe5`, `2cf22329f`, `af1f9dfd1`, `1118e0a73`, `7d41cfc48`), with the red runs only in the build report. `rail-styles.spec.ts` came last (`c492cbbc1`), after the app code, so "written first" does not hold literally for the E2E items; see finding 1. I re-ran the seen-failing part: on the merge-base's `src/lib` and `src/app.css` the width and titles, strip and edge, divider and 600 px tests fail. The header and picker tests pass there by design, and fail under mutation (next section).
- [met] `rail-items.logic.test.ts`: `railItemColor` for every built-in key and an unknown key; `railHeaderPad` at 48, 84, 108, 140 and 192 px. — `rail-items.logic.test.ts:154-197` has all eight keys, `some-navigator` and `toString`, and the five widths. Passes.
- [met] `Rail.test.ts` adapted from `git diff main...scratch/testes -- src/tests/lib/features/rail-shell/Rail.test.ts`, keeping every case's intent and deleting none. Assertions that named a prototype or old class assert the approved look instead: divider token `bg-file-explorer-fg/25`, active tint, whole-rail scroll with every `nav` child `shrink-0`. — Comparing `it(` names: no prototype case is missing. The only main name gone is the pinned-scroll case, renamed to the whole-rail case as the prototype did. Divider at `Rail.test.ts:113`, tint through `tinted()`, scroll and `shrink-0` loop at `:491-502`.
- [met] Every "not highlighted" check asserts the tint too (the prototype's `tinted()`), since `.not.toContain('bg-file-explorer-primary/25')` can no longer fail. — Every negative `aria-current` check has a `tinted(...)` false beside it: `Rail.test.ts:153` (as `toBe(active)`), `:268`, `:469`, `:477`, `:487`, `:578`, `:656`.
- [met] `Rail.test.ts` asserts the focus ring classes on an item, a pin and an action row. — `FOCUS_RING` loops in the three cases 'gives an item/a pin/an action row the focus ring'. Passes.
- [met] `Rail.test.ts` covers a registered action in this form: found through `[data-rail-actions] [aria-label="Tasks"]`, `data-rail-item` and `title` set, no `aria-current`, no tint, `Puzzle` fallback, `run` called on click and `onSelect` not called. The two busy cases from vault-mods Issue 06 pass unchanged. — 'finds a registered action through its group and label' asserts each of these. The two busy cases (`Rail.test.ts:613-635`) have no diff against main and pass.
- [met] `Rail.test.ts`: the Browse, Pinned and Actions titles disappear with their group, so no title shows alone. — Three cases assert `sectionTitles()` after hiding, emptying or unregistering. Workspace cannot go alone: Search and Today are never hidden (`arrangeRailGroups`).
- [met] `RailNoteList.test.ts`, `SearchPanel.test.ts` and `AppShell.test.ts` assert the new header class only as the first pane. `AppShell.test.ts` also asserts the root's `--rail-header-pad` value. — First-pane and not-first-pane cases in all three; `AppShell.test.ts` asserts `12px` on the root. Pass.
- [met] Settings default test covers the new `navigatorSize` and `noteListSize`. — `settings.store.test.ts:150-153` asserts 13, 18 and 20; `settings.service.test.ts:524` asserts 18. Pass.
- [met] `layer-rules.test.ts`, `chrome-type-scale.test.ts` and `text-roles.test.ts` pass, with no baseline entry added. — All three run and pass. No diff under `src/tests/lib/architecture/`.
- [met] `e2e/specs/sidebars.spec.ts` passes with no edit to the file. — `git diff main...HEAD -- e2e/specs/sidebars.spec.ts` is empty. Ran it: pass, including the 600 px floor at 1440 px.
- [met] `e2e/specs/rail-shell.spec.ts:296-298` asserts the spacer starts at the rail's right edge and the tab starts past the spacer, without naming 48 or 72. — `rail-shell.spec.ts:296-300` reads the rail and spacer boxes and names no width. Ran it: pass.
- [met] `e2e/specs/focus-ring.spec.ts` passes. — Ran it unedited: pass.
- [met] New `e2e/specs/rail-styles.spec.ts`, for this form: rail is 192 px; the four section titles show (Actions with a mod loaded); the header text in the strip beside the rail starts past the rail; the top strip matches the neighbouring header's background and the edge starts at 40 px and is 1 px wide; the `nav` and the strip have a 0 px right border. — `rail-styles.spec.ts:109-155`. Ran it: pass. The header test requires 12 px past the rail, on inbox, search, types, calendar and files.
- [met] Same spec: with a real mod loaded, clicking `[data-rail-actions] [aria-label="<title>"]` opens the picker and shows the mod's action. — `rail-styles.spec.ts:157-161`, mod loaded through Settings > Labs. Ran it: pass. Fails when the hook is renamed (mutation M3).
- [met] Same spec, on Lavender Haze and the default dark theme, measured by compositing through a canvas: divider contrast of at least 1.5, and active title contrast of at least 4.5 for Inbox, Today, Favorites, Types, Calendar, Files and Archive. — `rail-styles.spec.ts:213-235`, all seven keys on both themes. Ran it: pass. A Chromium probe shows the canvas accepts the computed `oklch(... / 0.18)` tint and really paints it, and mutation M2 fails the test.
- [met] Same spec, at 600 px height with 2 pins and 5 mod buttons: the rail scrolls, Archive is reachable, pins keep their height, strip and edge stay put, `scrollbarWidth` is `none`, `offsetWidth - clientWidth` is 0, and there is no sideways scroll. The prototype spec's `mod rail buttons` block shows how to load the mod. — `rail-styles.spec.ts:164-211` measures each of these. Ran it: pass; fails on the merge-base's app code.
- [met] `rail-prototype.svelte.ts`, `RailPrototypeVariant.svelte` and `prototype-rail.spec.ts` are not on the branch. — `git ls-files` lists none of them.

## Findings

1. minor, `e2e/specs/rail-styles.spec.ts:1`. The spec was written after the app code (`c492cbbc1` is the last commit), against the Issue's "written first". Red was shown afterwards, by running it on the base's app code. No effect on the product, and the tests do fail when they should (see below), so I do not hold the Issue back. Fix: no code change; deliver records the order in the squash commit message.

## Test verdict rests on

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on `src/tests/lib/features/rail-shell`, `src/tests/lib/app/AppShell.test.ts`, `src/tests/lib/core/settings`, `src/tests/lib/features/search/SearchPanel.test.ts`, `src/tests/lib/plugins/calendar/CalendarNavigator.test.ts`, `src/tests/lib/utils/text-roles.test.ts`, `src/tests/lib/chrome-type-scale.test.ts` and `src/tests/lib/architecture/layer-rules.test.ts`: exit 0, 1835 tests.
- `bash scripts/e2e.sh` on the Issue's eight specs (`rail-styles`, `rail-shell`, `sidebars`, `focus-ring`, `vault-mods`, `rail-list-toolbar`, `file-explorer`, `file-operations`): exit 0, 83 passed, 13 of them in `rail-styles`.
- The full suite and the build were not run; they are deliver's. The full E2E suite belongs to the main session after Issue 05.

## Probes (all reverted; the worktree was clean before this file)

- Merge-base app code against `rail-styles.spec.ts`: width and titles, strip and edge, divider and 600 px fail; header and picker pass, as the build report says. Playwright stopped before the rest ran.
- M1, `--rail-header-pad` removed from `AppShell.svelte`: the `files` header test, which the build report's mutation never reached, fails.
- M2, active title in the item color: the contrast test fails at 2.66 and 3.44 for Inbox.
- M3, `data-rail-actions` renamed: the picker test fails.
- Temporary computed-style spec at 1440x900: active title 13 px / 18 px / 500, idle title weight 400, row 28 px high and 176 px wide, section title 11 px, strip and header shadows identical, first-pane pad 12 px, icon `rgb(249, 115, 22)` for Today.

## Checked, no finding

- `Rail.svelte` against PRD § Values by form, labeled column, and § All forms: every class matches. Focus ring, `aria-busy` and `[data-rail-busy]` kept; `relative` added for the dot.
- `git grep` for `pl-6` in `src/lib/**/*.svelte` and for "48 px" near rail or traffic light text: none left. All six header sites read the variable, and every one renders under `AppShell`'s root.
- Other E2E specs: rail labels are matched only through `[role="tab"]`, `.cm-line` or a scoped panel, so the new visible titles do not collide. No other spec has a `_rail: true` pin. The full run after Issue 05 is still the real check; I did not run those specs.
- Not checked: traffic lights, the WebKit scrollbar rule and the real-app look, since E2E runs Chromium (PRD § Known limits).

## Resolution

1. Accepted, no code change, as the finding asks. Vitest items went test and code in one commit each; `e2e/specs/rail-styles.spec.ts` was written after the app code (`c492cbbc1`) and shown failing afterwards on the base's app code. The squash commit message records this order through this commit's subject.

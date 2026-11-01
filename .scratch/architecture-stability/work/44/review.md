VERDICT: APPROVED

# Issue 44 review

Reviewed `git diff main...HEAD` (dd4213d7, 860c1478) in the worktree. There is no `.scratch/architecture-stability/spec.md`. The ADRs set no decision that this diff touches.

## Acceptance criteria

- [met] A failing test first: a note with `due: 2026-01-05T10:00` and one with `count: not a number`. Focus then blur, and Escape then blur, write nothing and leave the raw value in the note — `meta-bind-writers.test.ts:202-248` runs a `describe.each` over `count: not a number`, `count: 1,000`, `due: 2026-01-05T10:00` and `due: 2026-1-5`. "writes nothing on focus then blur" (:222) and "writes nothing on Escape then blur" assert that the doc is byte-identical and that `input.value === raw`. Probe: I put main's `widgets.ts` back temporarily and ran the two changed test files. 16 failed, including all 8 focus/Escape no-write tests, then I restored the file and the tree was clean. With the branch code, all pass.
- [met] For those values the control is a text input that shows the raw value; a value the input can hold still renders as `type="number"` / `type="date"` — `widgets.ts:934-937` switches to `type="text"` when the native input reads back "". "renders a text input showing the raw value, flagged invalid" (writers test, 4 values) and the two new tests in `meta-bind-input-widgets.test.ts` (`1,000`, `2026-01-05T10:00`) cover the fallback. The existing `type=number` (value `5`) and `type=date` tests, plus the new unset-property test, still pass, so values the input can hold keep the native type.
- [met] The select reset after a refused write shows what the first render showed — `widgets.ts:739-747` records `initialIndex = select.selectedIndex` and restores it after a refused write. The test at `meta-bind-writers.test.ts:250` (`status: x`, not an option, unparseable frontmatter) asserts index and value equal the first render. It fails on main and passes on the branch. The placeholder path (null value) keeps index 0, which matches the old `select.value = ''`.
- [met] The `5.0` over `5` behaviour is pinned by a test — `meta-bind-writers.test.ts:265` asserts that the writer saves `count: "5.0"`. It re-derives `currentValue` through `String(prop.value)` from `parseFrontmatterProperties`, the same derivation as `meta-bind-input-plugin.ts:76-77`, and asserts `eq()` is false.
- [met] The Issue 42 comment about Escape and focus-without-typing is correct — `widgets.ts:964-966` now says blur after Escape or a focus with no typing leaves the input at `shown`, which matches the guard (:968) and the Escape reset. The widget JSDoc (:836-842) names the text fallback. See finding 1 for a smaller wording gap on the Enter path.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- Changed test files: `meta-bind-writers.test.ts` and `meta-bind-input-widgets.test.ts`. 2 files, 62 passed, 1 skipped (the existing button `skipIf`), exit 0.
- Tests of the changed code (`widgets.ts`) and its neighbours: arrow-reveal, blockquote-handler, invariants-harness, meta-bind-button.logic, `live-preview/parsers/*`, `live-preview/plugins/*` (includes meta-bind-input-plugin), table-widget, `live-preview/widgets/*`, theme-css-contract and `features/properties/*`. 77 files, 1570 passed, exit 0.
- Test-first probe with main's `widgets.ts`: 16 failed. They are the 12 fallback and no-write tests, the select reset, the two type tests in meta-bind-input-widgets, and the changed eq() test.
- My test verdict rests on these files. The full suite and `pnpm build` belong to deliver.
- Layer baseline, `BASELINE_SIZE` and composition roots are untouched. No scope creep: the diff is `widgets.ts`, its two test files and the discovery note.

## Findings

1. nit — `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:964-966`: "Each leaves the input at `shown`" is only true for Escape, focus-without-typing and a *refused* Enter. A successful Enter leaves the new value in the input, and the widget is rebuilt. Fix: say "a refused Enter commit", or note that a successful one rebuilds the widget.
2. nit — `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:788`: the `dispatchMetaBindUpdate` JSDoc still says "the caller resets its control to the note's value". The select now resets to its first-render index, which is the first option when the note's value is not an option, and the text input resets to `shown`. Fix: change it to "to what it showed before the edit".
3. nit — `src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-writers.test.ts:202-248`: no test separates the `shown` guard from the old `initial` guard. For all four values, `shown === initial` once the input falls back to text. They differ only when the text input strips newlines (checked in jsdom: `'a\nb\n'` reads back `'ab'`). Example: if the guard went back to `initial`, a block-scalar `count: |\n  5\n` would be rewritten to `count: 5` on focus+blur. That is reasoned from the code, not run. Fix (optional): add a multi-line raw-value case asserting that focus+blur writes nothing.
4. minor (not checked, carried from the Issue) — the fix depends on WKWebView sanitizing number and date values the same way jsdom does. Neither the builder nor this review tried it in the running app. Deliver or the owner should check one case (`due: 2026-01-05T10:00`) there.

## Resolution

1. Fixed: the blur-guard comment now names "a refused Enter commit" and says a successful Enter rebuilds the widget.
2. Fixed: the `dispatchMetaBindUpdate` JSDoc now says the caller resets its control "to what it showed before the edit".
3. Fixed: `meta-bind-writers.test.ts` gains a block-scalar case (`count: |\n  5\n`, widget value `"5\n"`). The text fallback shows `5`, and focus then blur writes nothing. Probe: with the guard set back to `initial`, the test fails; with `shown`, it passes.
4. Not done (needs the owner): this run cannot drive the Tauri app, so nobody has checked in WKWebView that `due: 2026-01-05T10:00` falls back to a text input. Please try it once in the running app.

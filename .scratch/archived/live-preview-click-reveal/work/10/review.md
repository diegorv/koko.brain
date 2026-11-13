VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: an E2E test with frontmatter, a heading with the cursor on it, enough content to scroll far, and a meta-bind `inlineSelect` bound to a frontmatter property at the bottom; after the select change, the select's screen position does not move (measure the element's y relative to `.cm-scroller`, not `scrollTop`) — `e2e/specs/live-preview/frontmatter-write-keeps-scroll.spec.ts:131-142`: 13-line frontmatter, cursor parked on `# Tue 03 Nov 2026` (asserted at :114), 300 filler paragraphs, scrolled until `scrollTop > 2000` (:127), `screenY` is `getBoundingClientRect().top - .cm-scroller.top` (:77-83). I reverted `widgets.ts` to `main` in the worktree and ran the spec: the select test failed (`Received: 363.75`, `Expected: <= 2`, on the first run and on the retry). With the branch's `widgets.ts` restored, it passed (5/5).
- [met] The same holds for the meta-bind toggle and the number input — spec:144-156 (toggle, real click through `clickAtOffset`) and :158-174 (number, `fill` + Enter). Both failed against `main`'s `widgets.ts` (363.75 px each) and pass on HEAD. All the control kinds (select, toggle, number/date, button `updateMetadata` at `widgets/meta-bind-button-widget.ts:94-95`) go through the one changed function, `dispatchMetaBindUpdate` (`widgets.ts:819-824`).
- [met] The properties panel path is checked with the same steps; if it jumps, it gets a test and the fix — spec:176-196 uses the same long note, cursor and scroll position, edits `mood` in the panel and measures the anchor line's screen y. It passes against both `main` and HEAD, so the panel path does not jump and `replaceDoc` correctly stays unchanged. The test stays as a guard. The out-of-scope reason for the root fix is recorded in `work/10/discovery.md` ("Risks and defaults"), as the Issue asks.
- [met] A frontmatter write with the frontmatter on screen (scrolled to the top) still leaves the view where it was — spec:198-211 asserts `scrollTop` is 0 before and after, the select's screen y within 2 px, and the cursor still on the heading. It passes on HEAD. The code supports this: the snapshot's anchor at the top maps through `mapPos(pos, -1)` to 0, and `lineBlockAt(0).top - yMargin` clamps to 0 (`@codemirror/view` 6.43.15 `scrollSnapshot` / `DocView.scrollIntoView` isSnapshot branch).
- [not met] Not verified by the agent: the owner repeats the steps in the macOS app — owner check, still pending. The build report says so too, and it does not block APPROVED.

## Findings

1. minor, `e2e/specs/live-preview/frontmatter-write-keeps-scroll.spec.ts:101-107`: the select regression test drives a synthetic `focus()` + `change` in one task (`pickOption`), because Playwright's `selectOption` does not reproduce the jump. The claim that a WebKit native picker delivers focus and change together is inferred, not observed. The fix does not depend on that order (the snapshot pins the anchor line whatever update comes in between), but the test models only one ordering. Fix: no code change. When the owner runs the macOS check, they should use the select first, since that is the case the test only approximates.
2. nit, `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:820-823`: the comment states the focus-update mechanism as fact (that part was observed for the toggle and number input, and inferred for the select), and it ends with "(Issue 10)", a `.scratch` Issue file the close commit deletes. Fix: optionally drop the "(Issue 10)" reference or point to the E2E spec instead; the explanation can stay.
3. nit, `src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-writers.test.ts:149-154`: the vitest change only adds the jsdom `Range` geometry stubs, the same `??=` pattern as `arrow-reveal.test.ts:45` and `table-widget.test.ts:422`. No unit test asserts that the write carries a scroll effect, so the E2E spec is the only guard against losing it. Acceptable, because jsdom has no layout. Fix: none required.
4. nit (not caused by this diff): in my run of `bash scripts/e2e.sh e2e/specs/live-preview`, `click-reveal/mermaid.spec.ts:79` ("clicking the line after the diagram ...") failed once (active line `""`) and passed on retry. That spec has no frontmatter or meta-bind write, so this diff does not cause it. Noted for deliver.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on `meta-bind-writers.test.ts`, `meta-bind-input-widgets.test.ts`, `meta-bind-input-redraw.test.ts`, `meta-bind-input-keydown.test.ts` and `src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/`: exit 0, 10 files, 195 passed, 1 skipped.
- `bash scripts/e2e.sh e2e/specs/live-preview/frontmatter-write-keeps-scroll.spec.ts` on HEAD: exit 0, 5 passed.
- The same spec with `main`'s `widgets.ts` temporarily in the worktree (restored afterwards with `git checkout HEAD --`; worktree clean): exit 1, the 3 meta-bind tests failed at 363.75 px, the panel and top-of-note tests passed.
- `bash scripts/e2e.sh e2e/specs/live-preview` (the Issue's E2E gate): exit 0, 259 passed, 1 flaky (finding 4). The one expected failure is the existing `test.fail()` at `click-reveal/meta-bind-toggle.spec.ts:38`.
- The full suite (`pnpm vitest run && pnpm build`) was not run: deliver runs it.
- Scope: the diff touches only `widgets.ts` (one dispatch), its writer test's jsdom stubs, the new E2E spec and the work file. No layer-baseline or composition-root change, and nothing under `src-tauri/`.

## Resolution

1. Accepted, no code change: the fix does not depend on the focus/change order. The owner's macOS check should exercise the select first.
2. Fixed: the comment in `dispatchMetaBindUpdate` now points to `e2e/specs/live-preview/frontmatter-write-keeps-scroll.spec.ts` instead of the `.scratch` Issue the close commit deletes.
3. Accepted, no change: jsdom has no layout, so the E2E spec is the guard.
4. Not caused by this diff (`click-reveal/mermaid.spec.ts:79` has no frontmatter write); no change.

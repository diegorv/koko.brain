VERDICT: APPROVED

## Acceptance criteria

- [met] `ordered-marker.spec.ts` "clicking the number glyph moves the cursor to its item and reveals the marker" passes with `test.fail()` removed — `test.fail()` and its known-bug comment are removed (`e2e/specs/live-preview/click-reveal/ordered-marker.spec.ts:11-21`). I ran `bash scripts/e2e.sh` on the spec in the worktree and the test passes (exit 0). Red probe: with `widgets.ts` temporarily set back to main's version (`ignoreEvent() { return true; }`), the same test fails with `Expected: "1. ordered item"`, `Received: "End line."` (exit 1). The file was then restored with `git checkout HEAD --` and the worktree is clean. So the test fails without the fix and passes with it.
- [met] `bullet-marker.spec.ts` stays green — I ran both tests in it on the branch and both passed. `UnorderedListMarkerWidget` is unchanged in the diff.
- [met] `e2e/specs/live-preview/lists.spec.ts` stays green — I ran all 6 tests on the branch and all passed (10/10 across the three spec files, exit 0).

## Findings

1. minor, `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:73`. The ordered marker's new behavior is only pinned by an E2E spec. `pnpm vitest run` does not cover it, and the vitest gate is the one that runs on every commit. Other widgets pin their `ignoreEvent` contract in unit tests (`media-widget.test.ts:47`, `wikilink-image-embed-widget.test.ts:150`). Fix (optional): add `expect(new OrderedListMarkerWidget(1).ignoreEvent()).toBe(false)` to the widget's unit tests (for example in `simple-widget-handlers.test.ts`). Then a revert shows up without running Playwright.
2. minor, `widgets.ts:73` with `widgets.ts:88-90` (not changed). Side effect of the change: `eventBelongsToEditor` used to drop events on the marker, and now the editor's `domEventHandlers` run on them. That covers `mouseSelectingHandlers` (it sets the drag flag on mousedown and releases it on mouseup) and `livePreviewClickHandler` (which leaves early because there is no `.cm-lp-link`). This is the same path a click on item text takes, and the specs pass, so I don't see a bug. The bullet keeps `ignoreEvent() { return true; }` and still relies on the browser placing the caret natively. Per the discovery notes, a click that lands on the padding of the bullet's `min-width: 1.5em` box, rather than on the glyph, may still leave the cursor where it was. I did not test this. Fix: none in this Issue (the scope is the ordered marker). If an off-center bullet click turns out not to move the cursor, a follow-up Issue could give both markers the same `false`.
3. nit, `widgets.ts:73`. The JSDoc's second sentence ("With `true` the click relied on the browser's caret placement, which left the cursor where it was.") partly tells the story of the change. The constraint it records (do not return `true` here) is still useful. Fix (optional): reword it as a constraint, for example "Returning `true` hands the mousedown to the browser, which places no caret here, so the cursor would not move."

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings (exit 0).
- `pnpm vitest run src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.test.ts`: 16 passed (exit 0). This is the unit test file for the code that builds `OrderedListMarkerWidget`. No unit test refers to `ignoreEvent` on the list markers.
- `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/ordered-marker.spec.ts e2e/specs/live-preview/click-reveal/bullet-marker.spec.ts e2e/specs/live-preview/lists.spec.ts`: 10 passed (exit 0). These are the only E2E specs that refer to `cm-lp-ol-marker` or ordered lists.
- Red probe on the unfixed widget: the ordered-marker glyph test fails (exit 1), as listed above.
- My test verdict rests on these files: `ordered-marker.spec.ts`, `bullet-marker.spec.ts`, `lists.spec.ts`, `simple-widget-handlers.test.ts`.
- Not run (deliver's job): the full `pnpm vitest run`, `pnpm build`, and `bash scripts/e2e.sh e2e/specs/live-preview`.
- Scope: the diff touches one source line plus its JSDoc, two lines removed from a spec, and the workflow's discovery note. No scope creep. No change to the layer baseline or composition roots. Nothing under `src-tauri/`.
- No `spec.md` exists for this feature. No ADR decision conflicts with the change (ADR 0008 is about hiding syntax, not about widget event handling).

## Resolution

1. Fixed. `simple-widget-handlers.test.ts` (ListMark — ordered) asserts `new OrderedListMarkerWidget(1).ignoreEvent()` is `false`, so the vitest gate catches a revert.
2. No change, as the review says: no bug was found, and the bullet's off-center click is outside this Issue's scope. A follow-up Issue is warranted only if it reproduces.
3. Fixed. The JSDoc's second sentence now states the constraint: "Returning `true` hands the mousedown to the browser, which places no caret here, so the cursor would not move."

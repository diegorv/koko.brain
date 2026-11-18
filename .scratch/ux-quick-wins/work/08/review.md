VERDICT: APPROVED

Review of `git diff main...HEAD` (366b6f53d..102a00bab) on branch `issue/08-livepreview-widgets-show-failure-progress`.

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/image-widget.test.ts` and `wikilink-image-embed-widget.test.ts`: dispatching `error` on the `<img>` gives the wrapper `cm-lp-image-missing` and the text `Could not load "<name>"`, keeps `cm-lp-image-wrapper`; a detached wrapper does nothing and throws nothing. — `image-widget.test.ts` "ImageWidget load failure" (alt name, URL fallback, detached no-op) and `wikilink-image-embed-widget.test.ts` (resolved failure, detached no-op) assert both classes, the exact text, the removed `<img>` and `requestMeasure`. Probe: with `widgets.ts` reverted to main, the three non-detached tests fail; with the branch they pass. `watchImageLoadFailure` at `widgets.ts:133-145` guards on `wrapper.isConnected`.
- [met] `styles.test.ts` finds an exact `.cm-lp-image-missing` rule with `border-radius: var(--radius-xs)` (added to the ladder list at `:62`). — `styles.test.ts:58` adds the selector to the `--radius-xs` list; `styles.ts:306-313` has the rule. Fails against main `styles.ts`, passes on the branch.
- [met] `mermaid-widget.test.ts`: a pending `render` shows `Rendering diagram...`; when resolved the text is gone and an SVG is present; the cached path shows the SVG with no placeholder; empty source still says "Empty mermaid diagram". — New tests for pending/resolved, error, cached; the existing "renders an error container for an empty source" test is unchanged and passes. `mermaid-widget.ts:97-98` sets the placeholder only after the cache-hit return and the empty-source return. Pending test fails against main.
- [met] `code-block-widget.test.ts`: `writeText` rejecting, or no `navigator.clipboard`, shows "Copy failed" then "Copy" after 1500 ms (fake timers), no unhandled rejection; success still shows "Copied!". — "CodeBlockWidget — Copy button" covers success, rejection (checks 1499 ms still "Copy failed", 1500 ms "Copy") and missing clipboard with `vi.useFakeTimers()`. Against main the run reports an Unhandled Rejection and 2 failures; on the branch the file passes with no unhandled errors.
- [met] `table-widget.test.ts` (path `src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts`): the two buttons have the names; the mousedown `stopPropagation` (rule 11) and append tests are unchanged. — New test at `table-widget.test.ts:90-98` checks `aria-label` and `title`; the diff only adds lines to that file, existing tests untouched. `widgets.ts:488,505` add the attributes; mousedown handlers unchanged.
- [met] `e2e/specs/live-preview/misc-features.spec.ts:108-122` ("image renders widget") has no `page.route` today and relies on a broken `<img>` counting as visible, so it routes its URL to a stub PNG (pattern `click-reveal/image.spec.ts:23-27`) and still sees `img.cm-lp-image`; a new step routed to 404 sees `.cm-lp-image-missing` with "Could not load". Also run `click-reveal/code-block-copy`, `embed-widgets` (its wrapper-attached assertion at `:71-74` still holds), `click-reveal/image`, `click-reveal/wikilink-image-embed`, `mermaid`, `click-reveal/table-add-buttons` with `bash scripts/e2e.sh`. — The render test routes to a stub PNG; the new 404 test asserts `.cm-lp-image-wrapper.cm-lp-image-missing` with text `Could not load "Gone"` and no `img.cm-lp-image`. I ran `bash scripts/e2e.sh` on misc-features, click-reveal/code-block-copy, mermaid (15 passed) and embed-widgets, click-reveal/image, click-reveal/wikilink-image-embed, click-reveal/table-add-buttons, click-reveal/mermaid (24 passed), both exit 0.
- [not met] Owner eye check: a note with a deleted image file and one with a mermaid block. — Only the owner can do this in the running app; no agent can check it, so it does not hold back the verdict.
- [met] Frontend gate: pnpm check and pnpm vitest run pass. — `pnpm check`: exit 0, 0 errors, 0 warnings. Targeted vitest: 8 files, 215/215 passed, exit 0. The full suite is deliver's to run.

## Findings

1. nit, `src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:92-97`: `flash` does not clear the previous timer, so a second press within 1500 ms gets its label reset to "Copy" early by the first press's timer. The old success path behaved the same way, so this is not a regression. Fix (optional): keep the timer id and `clearTimeout` it before scheduling a new one.
2. nit, `src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/image-widget.test.ts:96-121`: the two connected-wrapper tests append `dom` to `document.body` and never remove it, while the wikilink test calls `dom.remove()`. Harmless today, since nothing queries the body. Fix: call `dom.remove()` at the end, or clear the body in an `afterEach`.

## Other checks

- Scope: only the five items. No decoration plugin was added or reworked; replace/reveal logic is untouched. The 20 px hit area, Tab handling, embedded-note rendering and Toggle task were left out, as the Issue says.
- Rules (`docs/agents/live-preview-rules.md`): rule 2/3, every `toDOM` attaches its own `error` listener, and mermaid cache hits never show the placeholder. Rule 11, the table and copy mousedown handlers keep `preventDefault` + `stopPropagation`.
- `--lp-embed-error` exists (`styles.ts` `.cm-lp-embed-error` uses it). `.cm-lp-image-missing` comes after `.cm-lp-image-wrapper`, which has the same specificity, so its padding wins.
- `textContent` is used for the failure message, so alt text or target markup cannot inject HTML.
- In the app, `assetUrl` is `convertFileSrc` (`src/lib/app/editor-host.ts:139-141`) and always returns a URL. A deleted `file://` image therefore reaches the new `error` path; the class-only branch for an empty asset URL is only reachable with the no-op host.
- Tests were checked for real failures: I ran the changed test files against main's source files, and 8 tests failed plus an unhandled rejection. I then restored the branch sources; the worktree is clean.
- No layer-baseline or composition-root change.

Test verdict rests on: `widgets/image-widget.test.ts`, `widgets/wikilink-image-embed-widget.test.ts`, `styles.test.ts`, `widgets/mermaid-widget.test.ts`, `widgets/code-block-widget.test.ts`, `table-widget.test.ts`, `code-block-in-containers.test.ts`, `table-empty-cells.test.ts` (all under `src/tests/lib/core/markdown-editor/extensions/live-preview/`), plus the E2E specs listed above.

## Resolution

1. Fixed: `flash()` in `code-block-widget.ts` keeps the reset timer id and clears it before scheduling a new one, so a second press restarts the 1500 ms. Test: "a second press restarts the 1500 ms before the label resets" in `code-block-widget.test.ts` (failed before the fix).
2. Fixed: the two connected-wrapper tests in `image-widget.test.ts` call `dom.remove()` at the end.

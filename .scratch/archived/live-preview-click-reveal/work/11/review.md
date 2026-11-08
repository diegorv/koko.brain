VERDICT: APPROVED

## Acceptance criteria

- [met] Notes record, per trigger (collection block, queryjs block, note embed), the screen-y shift of a bottom line after the re-render — The Issue's Notes now record 0.0 px for each of the three triggers (collection, queryjs, note embed), along with the setup (block on line 3, anchor about 14 500 px down, Other.md written through `window.__e2e.fs` and reported with `vault-files-changed`, 3 s wait). The block-line heights from the diagnostic run are recorded too.
- [met] Each probe is kept as an E2E test that asserts the shift is under 5 px (passing, or failing first and then fixed) — `e2e/specs/live-preview/offscreen-block-rerender-keeps-scroll.spec.ts` has three tests. Each one calls `expectStill` (`toBeLessThan(MAX_SHIFT)`, `MAX_SHIFT = 5`, lines 21 and 145-148). I ran `bash scripts/e2e.sh e2e/specs/live-preview/offscreen-block-rerender-keeps-scroll.spec.ts` and all 3 passed (exit 0).
- [met] If a fix lands: the block still re-renders with the new data, and a block on screen still grows or shrinks in place — No fix landed: `git diff main...HEAD` changes no file under `src/`, so this criterion does not apply. The collection probe still checks that the re-render arrived (`Active (8)` after scrolling back up, line 168).
- [met] Not verified by the agent: the owner repeats one case in the macOS app if a fix lands — No fix landed, so there is no owner check to do.

## Verification

- `pnpm check`: exit 0 (213 files, 0 errors, 0 warnings).
- Test verdict rests on: `e2e/specs/live-preview/offscreen-block-rerender-keeps-scroll.spec.ts` (run by me, 3/3 passed). The branch changes no app code, so no other test files apply. Deliver runs the full gate (`pnpm vitest run`, `pnpm build`, `bash scripts/e2e.sh e2e/specs/live-preview`).
- Checked the root-cause claim against the code:
  - `node_modules/@codemirror/view` is 6.43.15. `staticDeco()` (dist/index.js:6784) leaves out function-valued decorations, and only `stateDeco` feeds `heightMap.applyChanges` (lines 6345-6351).
  - `blockDecorator` builds a `ViewPlugin` (`core/block-decorator.ts:59-89`). `wikilinkEmbedPlugin` is also a ViewPlugin and only decorates `expandedVisibleRanges`.
  - `CollectionBlockWidget.eq()` compares `version` (`features/collection/collection-block-widget.ts:374-380`). The queryjs widget's `eq()` and the embed widget's `eq()` ignore the data.
  - `collectionStore.version` is bumped directly by `updateRecord` through the watcher's note-change consumer, not by the throttled index bump, so the 3 s wait covers it.
  - In a StateField, the collection widget's replace (`from < to`) would show up as a height-relevant change (`DecorationComparator.comparePoint`, line 6166). So the claim that the collection probe would catch a move to a StateField holds.
- Scope: the diff touches only the Issue file, `work/11/discovery.md` and the new spec. No layer-baseline change, no source change.

## Findings

1. minor, e2e/specs/live-preview/offscreen-block-rerender-keeps-scroll.spec.ts:184 and :201 — The queryjs and note-embed probes never check that the new data arrived, unlike the collection probe (line 168). Neither block rebuilds while off screen. If the watcher, the queryjs cache drop or the embed content read stopped working, these two tests would still pass with no trigger at all. Fix: after `expectStill`, call `scrollToTop` and assert the new data, e.g. `expect(page.locator('.cm-lp-qjs-block p')).toHaveCount(8)` and `expect(page.locator('.cm-lp-embed-content')).toContainText('Embedded line 12.')`.
2. nit, e2e/specs/live-preview/offscreen-block-rerender-keeps-scroll.spec.ts:132-135 — `waitForRerender` waits a fixed 3 s. Today that is enough, because the collection version bump is not throttled. If the bump moves behind the throttled index refresh, which can delay up to 10 s during a burst, the measurement could run before the rebuild and the test would pass without testing anything. The build report already notes this. Fix (optional): poll for a signal that the rebuild happened, or leave it and accept the risk.
3. nit, e2e/specs/live-preview/offscreen-block-rerender-keeps-scroll.spec.ts:96-109 — `screenY` and `settle` are copied from Issue 10's spec (`frontmatter-write-keeps-scroll.spec.ts` on `issue/10-frontmatter-write-keeps-scroll`). Once both are on main, the two files carry the same helpers. Fix (optional, after Issue 10 merges): move them into `e2e/fixtures/helpers.ts`.
4. nit, .scratch/live-preview-click-reveal/issues/11-offscreen-block-rerender-keeps-scroll.md:3 — The Notes say "Closes as wontfix", but `**Status:**` is still `ready-for-agent`. Deliver or the main session should set the closing status, or delete the Issue file in its closing commit.

## Resolution

1. Fixed. The queryjs and note-embed probes now scroll back to the top after `expectStill` and assert the new data: 8 `.cm-lp-qjs-block p` and `Embedded line 12.` in `.cm-lp-embed-content`. `bash scripts/e2e.sh e2e/specs/live-preview/offscreen-block-rerender-keeps-scroll.spec.ts --workers=1`: 3 passed.
2. Not changed (optional). The collection probe already asserts `Active (8)` after scrolling back, so a stale wait shows up only as a measurement taken too early, not as a silent wrong pass of the data check. There is no cheap on-page signal for an off-screen rebuild without adding a test hook to app code; the risk is accepted and recorded here.
3. Not changed (optional, deferred). Issue 10 is not on main yet, so there is no shared helper to move into; the main session can fold `screenY` / `settle` into `e2e/fixtures/helpers.ts` once both specs are on main.
4. Handled by deliver: `relay review-ticks --write` sets the closing status in this delivery.

VERDICT: APPROVED

## Acceptance criteria

- [met] Owner decision recorded in Notes — the Issue's Notes hold "Owner decision (2026-11-03): mark after the render pass", and the diff implements exactly that option: `markAutoRunAfterRenderPass` (`src/lib/plugins/queryjs/queryjs-block-widget.ts:49-59`) keeps the per-file marker, and the store is untouched.
- [met] Failing first: two blocks in one file under `first-open` both auto-run on the first open — `queryjs-block-widget.test.ts` "auto-runs every block built in the first render pass of a file" builds two blocks in one pass and waits for both outputs. I put main's `queryjs-block-widget.ts` back temporarily and re-ran the file: 2 failed, 22 passed, and both failures were the new tests ("auto-runs every block..." and "marks the file once the render pass is over..."). On HEAD the same file passes. I restored the source afterwards, and `git status` is clean.
- [met] The full `autoRunQueries` matrix (CLAUDE.md live-preview rule 10) stays green, including "manual mode never marks `autoRunOnFirstOpen`" — cache hit with no mark: new test "a cache hit in the first pass does not mark the file". First-open with an already-marked file shows Run: "marks the file once the render pass is over, so a block built later shows Run" plus the updated run-prompt log test. `always` re-executes: "always auto-runs a block built after the render pass". Manual never marks: the existing click test (`:117-125`) and the new "manual mode never marks the file, even after the render pass". Store-level rows: `queryjs-session.store.test.ts`. Tab-close and delete invalidation: `boot.test.ts`. I ran 5 files (`queryjs-block-widget.test.ts`, `queryjs-session.store.test.ts`, `app/boot.test.ts`, `core/settings/settings.store.test.ts`, `live-preview/invariants-harness.test.ts`) and all 144 tests passed. The full suite and `pnpm build` are deliver's to run.
- [met] ADR 0010 updated if the matrix changes — the matrix rows did not change, so no update was required. `docs/adr/0010-queryjs-kb-api-caching.md:13-15` still adds a dated amendment. It records the decision, the caveat that blocks first built on scroll show Run, and why the per-block marker was rejected.

## Checks I ran

- `pnpm check`: exit 0, with 0 errors and 0 warnings across 212 files.
- Targeted vitest: the 5 files listed above, 144 tests, exit 0. The test verdict rests on those files.
- Red probe: main's widget source with HEAD's tests gave exactly the 2 new tests failing.
- Scope: the diff touches only the widget, its test file, ADR 0010 and the Issue's own work file. Layer baseline, composition roots and `src-tauri/` are not touched.

## Findings

1. **minor** — `src/lib/plugins/queryjs/queryjs-block-widget.ts:40,49-59`: neither `queryjsSessionStore.invalidatePath` (tab close, file delete) nor `reset()` (vault teardown, Settings "Clear cache") cancels a pending mark in `pendingAutoRunMarks`. If one of them runs inside the roughly one-frame window, the mark lands afterwards. The reopened file then shows ▶ Run instead of auto-running, and after "Clear cache" the file is marked again. This is rare, visible and recoverable, and the build report already names it. Fix (optional): accept it, or have the widget drop its pending entry when the store invalidates. Not a blocker.
2. **minor** — `src/lib/plugins/queryjs/queryjs-block-widget.ts:57`: the mark is queued only from `requestAnimationFrame`. When the webview is hidden or occluded, WebKit throttles or pauses rAF, so the window between the first auto-run and the mark stays open until the window is visible again. Before this change the window was zero. Within that window, any cache miss for the file re-executes instead of showing ▶ Run. Examples are the same block being redrawn while its first run is still in flight, or a watcher edit to the note. The second run's `setResult` drops the first container, so charts are not leaked; the cost is only the extra execution. Fix (optional): accept it, or also cap the wait with a plain `setTimeout` fallback. Not a blocker.
3. **nit** — `src/lib/plugins/queryjs/queryjs-block-widget.ts:69`: the doc-comment matrix row still says `always ... execute + mark autoRun`, but the code marks only under `first-open` (`:147`). The diff deleted the inline comment that made the same false claim (old `:118-121`), so the table now contradicts the code next to it. This is pre-existing. Fix: change that cell to `execute`.
4. **nit** — `help/documentation/13-queryjs.md:29`: the user help says a block "runs the first time you open the note". After this change that holds for every block drawn in the first render pass, but a block first scrolled into view later still shows ▶ Run, and the help does not say so. Fix (optional): add one sentence on the scroll caveat.

## Not verified

- I did not exercise real CodeMirror timing in the app. Opening a new tab from a tab that is scrolled down runs this rAF chain: `setState` draws, then the frame-1 measure, then `MarkdownEditor.svelte:392-410` restores the scroll in rAF1 and dispatches `forceDecorationRebuild` in rAF2. A block first drawn after the frame-1 timer still gets ▶ Run. The old code behaved the same way or worse (only the first block auto-ran), so this is not a regression. But "every block of the first open" rests on jsdom only.

## Resolution

1. Accepted, not changed. Cancelling a pending mark on `invalidatePath` / `reset()` needs a per-file generation check shared between the widget and the store, for a one-frame window. The failure is rare, visible (▶ Run instead of an auto-run) and recoverable with one click, so the extra coupling is not worth it.
2. Accepted, not changed. A throttled rAF in a hidden webview only widens the window in which a cache miss re-executes; the second run replaces the first result and its charts, so nothing leaks. Adding a `setTimeout` cap would race CodeMirror's measure pass, which is the reason the mark waits for the frame.
3. Fixed: the `always` row of the doc-comment matrix now says `execute`.
4. Fixed: `help/documentation/13-queryjs.md` says a block first drawn on a later scroll shows ▶ Run.

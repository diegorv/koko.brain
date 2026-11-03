# 12 discovery: first-open auto-runs every block of the first render pass

No `spec.md` exists for ui-responsiveness; the Issue is the spec. Owner decision: mark after the render pass.

## Files that change

- `src/lib/plugins/queryjs/queryjs-block-widget.ts:116-125` - under `first-open`, replace the synchronous
  `queryjsSessionStore.markAutoRun(filePath)` with a deferred mark: `requestAnimationFrame(() => setTimeout(mark, 0))`,
  the after-paint pattern already in `src/lib/utils/log.service.ts:192-200`. One pending mark per path (module `Set`),
  so N blocks schedule one timer. Doc comment `:39-64` gains one line on when the mark lands.
- `src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts:212-248` - new failing-first test plus the existing
  "second block logs the run-prompt line" test, which now renders its second block after the render pass.
- `docs/adr/0010-queryjs-kb-api-caching.md` - the matrix rows do not change; add a short dated amendment that the
  first-open mark lands after the render pass (it records the owner decision and the scroll caveat).
- Store (`queryjs-session.store.svelte.ts`) is unchanged: per-file marker, `invalidatePath`, manual invariant.

## Plan (test-first)

1. Test: `first-open`, two different blocks, same file, `toDOM()` both synchronously: neither shows `.cm-lp-qjs-run`
   (fails today). After the render pass `hasAutoRun(file)` is true and a third block (scroll / edit-exit) shows Run.
2. Adapt the run-prompt log test: render block 1, await the render pass, render block 2.
3. Implement the deferred mark; run the widget + session-store tests and `pnpm check`.
4. ADR amendment.

## Why rAF + setTimeout, not a microtask

CodeMirror draws widgets synchronously in its update, then runs a measure pass in `requestAnimationFrame` that can
draw more lines once real heights are known. A timer queued from inside a frame callback runs after every callback of
that frame, so blocks drawn by that measure still count as the first render pass. jsdom (vitest) has rAF; the code
falls back to `setTimeout` alone where it is missing, like log.service.

## Risks / defaults

- Closing the tab within that frame window: `invalidatePath` runs before the mark lands, so the next open of that
  file shows Run. Rare and recoverable; not handled.
- Executions per multi-block first open go from 1 to N (Issue 08's chart destroy already landed).
- `always` keeps not marking (today's code marks only under first-open); manual never reaches the branch.
- CLAUDE.md live-preview rule 10 still reads correctly (rows unchanged); left untouched.

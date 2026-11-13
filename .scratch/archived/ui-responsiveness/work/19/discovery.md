# 19 discovery: a failed run still on screen keeps its charts

No `spec.md` exists for ui-responsiveness; the Issue is the spec. Test only, no app change.

## Files that change

- `src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts` - one new `it` in the
  `QueryjsBlockWidget.destroy - charts of a result the cache no longer holds` describe (around :502-531),
  next to "destroys the charts of a run that failed after its widget was destroyed".
- No change to `src/lib/plugins/queryjs/queryjs-block-widget.ts`; the guard under test is
  `if (!container.isConnected) destroyChartsIn(container);` in `execute`'s catch (:270).
  The Issue cites :248; Issue 12 moved it.

## Plan

1. Copy the "failed after its widget was destroyed" test: hold `get_all_vault_entries_v2` on a deferred
   promise, `toDOM()` a throwing block, append a tracked canvas (`trackChart` with a `vi.fn()` destroy),
   but attach `dom` to `document.body` and do not call `widget.destroy`. Release the entries, wait for
   `.cm-lp-qjs-error`, assert `destroy` not called, the error title carries the message, the canvas is
   still in `dom`, and the result is not cached.
2. Mutation check: make the catch call `destroyChartsIn(container)` unconditionally, run the file, see
   the new test fail; restore the guard (not committed). Record it in the Issue's Notes? No: the Issue
   file is bookkeeping for deliver; record it in this folder (`mutation-check.md` section below).

## Prior art

- `queryjs-block-widget.test.ts` "destroys the charts of a run that failed after its widget was destroyed"
  (detached case, stays as is).

## Risks / defaults

- The chart must be tracked before the throw; holding the entries IPC guarantees the canvas exists while
  the run is in flight, as the detached test does. Restore the `invoke` mock at the end like its siblings.
- Default: the mutation-check result goes in this folder, not the Issue file (the build step does not
  edit the Issue's checkboxes).

## Mutation check (done)

With the catch changed to `destroyChartsIn(container);` (guard removed), `pnpm vitest run
src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts` exits 1: only "keeps the charts of a failed run
whose widget is still on screen" fails (1 failed, 24 passed). Guard restored; with it the file is 25/25.

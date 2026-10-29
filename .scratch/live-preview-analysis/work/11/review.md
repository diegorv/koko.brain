VERDICT: APPROVED

# Review: Issue 11, force rebuild and reconfigure pass the viewport guards

Reviewed `git diff main...HEAD` (487bfd41..d4762190) in the worktree.

## Test verdict rests on

Run by the reviewer, not taken from the build report:

- `src/tests/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.test.ts`
- `src/tests/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.test.ts`
- `src/tests/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.test.ts`
- `src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.test.ts`

Results:

- On HEAD the four files give 55/55 passed.
- The whole `live-preview/` test directory gives 90 files, 1253/1253 passed. No test outside that directory imports the changed modules.
- `pnpm check` reports 0 errors and 0 warnings.
- Probe: I put main's `block-decorator.ts`, `inline-formatting-plugin.ts` and `queryjs-block-field.ts` back in place and ran the last three files. Exactly the 5 new tests failed (2 block-decorator, 2 inline, 1 queryjs) and the other 29 passed. I then restored HEAD with `git checkout HEAD -- <files>` and the worktree was clean. So each new test fails without the fix it covers.

## Acceptance criteria

- [x] **Met.** `block-decorator.test.ts` covers a viewport update that carries `forceDecorationRebuild` with no selection change. The test "rebuilds on a viewport-changing update carrying forceDecorationRebuild" expects `scans` 2. It fails on main's guard.
- [x] **Met.** `block-decorator.test.ts` covers the same update with a reconfigure. The test "rebuilds on a viewport-changing update carrying a reconfigure" uses `reconfigured: true` and expects `scans` 2. It fails on main.
- [x] **Met.** `inline-formatting-plugin.test.ts` has the same two cases under "update guard" and expects `builds` 2. Both fail on main.
- [x] **Met.** "skips viewport-only updates, even when a rebuildOn effect rides along" (`block-decorator.test.ts:80`) is unchanged and passes. `isPureScroll` checks only `reconfigured` and `forceDecorationRebuild`, so a `toggleCalloutFold` effect riding a scroll still returns early. The `isPureScroll` unit test "is true for a viewport change carrying an unrelated effect" pins this too.
- [x] **Met.** `queryjs-block-field.test.ts` has "rebuilds on the drag release after a forced rebuild was skipped mid-drag". The test starts a drag, makes the index ready, sends a forced rebuild and asserts the snapshot is still `false`. It then sends an effect-only release and asserts the snapshot is `true`. It fails on main's gate, on the final assertion.

## Other checks

- The `forceDecorationRebuild` alternative is not used: `rebuildOn` is not set on queryjs. The gate change is at `queryjs-block-field.ts:70-71`, which is what the Issue asked for.
- Production wiring: `live-preview.ts:85` registers `mouseSelectingField`, so the new gate term reads a real field. The test mounts that field too.
- `isPureScroll` lives in `core/check-update-action.ts` next to the rule it mirrors. Both guards call it, so they cannot drift apart. It has JSDoc, uses tabs and imports no framework code. No layer rule is affected.
- No source in `src/lib` still contains the literal old guard. CLAUDE.md rule 4, `docs/LIVE-PREVIEW.md:133,180,186` and ADR 0008 item 3 are updated and accurate.
- Perf: a forced rebuild or reconfigure that comes with a viewport change now rebuilds, where before it was lost. That is the point of the change. It converges: a second forced rebuild on the same state gives widgets whose `eq()` is true, so the DOM is kept. Queryjs now rescans the document on each drag release, which includes every plain click. The other block decorators already did this. The rescan is a line scan, and `QueryjsBlockWidget.eq()` (jsContent + isIndexReady) keeps the DOM, so no script re-runs. The release rebuild also lets a click into a queryjs block reveal its source, which the old gate dropped.
- Every changed source file has a matching test change. Commits follow docs/COMMITS.md. There is no scope creep.

## Findings

1. **Medium:** the native-drag follow-up has no Issue, and its symptom is described too narrowly.
   - Where: `src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:33-45`, `core/reveal.ts:25`, `core/check-update-action.ts:23-26`.
   - The Issue asked to check this risk. The builder checked it and recorded the result only in the Issue's "implement" comment and in discovery.md.
   - The Issue file is deleted when it closes, so that comment leaves the tracker with it. discovery.md stays, but nobody triages it.
   - The comment says only that "every non-doc forced rebuild is skipped". Reading the code shows a wider effect. While the flag stays set after a native text drag-and-drop (no `mouseup` reaches the page after a drop), `revealPredicate` reveals nothing. Every selection change returns `'skip'`, and every doc change rebuilds with nothing revealed. So typing or arrow keys after a drop leave the cursor's line rendered instead of showing raw markup, until the next click.
   - I found this by reading the code and did not reproduce it in the app.
   - Fix: add `.scratch/live-preview-analysis/issues/<next NN>-native-drag-leaves-mouse-selecting-set.md` with `Status: needs-triage`. It should give the repro (select text, drag it to another spot, drop, then type) and the code path above. One possible fix to put in it: clear the flag on `dragstart` or `drop`/`dragend` in `mouseSelectingHandlers`. No source change in this Issue.

2. **Low:** a drag release in the same update as a viewport change is still dropped.
   - Where: `src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:55-64`.
   - `isPureScroll` does not exempt a release (`mouseSelectingField` going from true to false). If the release update also reports `viewportChanged`, every block decorator and the inline plugin return early, so a forced rebuild skipped mid-drag stays lost until the next edit, cursor move or scroll settle.
   - A `mouseup` dispatch rarely changes the viewport, so this is unlikely. It is outside the Issue's scope and is recorded only in discovery.md.
   - Fix: no code change here. Note it in the follow-up Issue from finding 1, since the root cause is the same (the drag-release promise in `checkUpdateAction` has more than one way to break).

## Resolution

- Finding 1: accepted. Filed `.scratch/live-preview-analysis/issues/14-native-drag-leaves-mouse-selecting-set.md` (Status: needs-triage) with the repro, the code path (`mouse-selecting.ts:33-45`, `reveal.ts:25`, `check-update-action.ts:23-26`), the wider symptom (reveal frozen after a drop) and the suggested fix (clear the flag on `dragstart` or `drop`/`dragend`). No source change in Issue 11.
- Finding 2: accepted. Recorded under "Related" in Issue 14. No code change.

VERDICT: APPROVED

# Review: Issue 06, stateless touched-line rebuild gate (option B)

Reviewed `git diff main...HEAD` in the worktree (branch `issue/live-preview-analysis-06-remove-last-cursor-line`,
head `f1ee86b2`, base `830f3a15`). No source changes made by the review.

## Checks run by the reviewer

- `pnpm check`: 211 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor`: 101 files, 1501/1501 passed.
- Mutation probes on `core/check-update-action.ts:35` (each restored with `git checkout`, tree clean after):
  - Head-line-only gate (the old `lastCursorLine` semantics, made stateless): 3 tests fail
    (`block-decorator.test.ts` extend/collapse case, `check-update-action.test.ts` collapse and
    extend cases). The new tests pin the line-set rule, not just "some selection gate".
  - Selection branch always `'none'`: both `arrow-reveal.test.ts` cases fail.

The test verdict rests on these files:
- `src/tests/lib/core/markdown-editor/extensions/live-preview/arrow-reveal.test.ts` (new)
- `src/tests/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.test.ts`
- `src/tests/lib/core/markdown-editor/extensions/live-preview/core/reveal.test.ts`
- `src/tests/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.test.ts`
- `src/tests/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.test.ts`
- `src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/keyboard-reveal.test.ts`
- plus the rest of `src/tests/lib/core/markdown-editor` (run, all green).

## Acceptance criteria

- [x] **LP-PROFILE numbers recorded before the gate is removed.** Met.
  `.scratch/live-preview-analysis/findings-2026-10-29.md` section "Issue 06 measurement" (1008 / 2016 /
  6000-line tables), committed in `e4e07618` before any source change; the owner decision that
  followed is in the Issue's Comments.
- [x] **No `lastCursorLine` remains in live-preview.** Met. `grep -rn lastCursorLine src/ docs/ CLAUDE.md`
  hits only the ADR 0008 amendment that records the removal. `checkUpdateAction(update)` has one
  parameter (`core/check-update-action.ts:19`); the field is gone from `block-decorator.ts`,
  `inline-formatting-plugin.ts` and the image, footnote, wikilink-embed and meta-bind-input plugins.
- [x] **Regression test: ArrowUp/ArrowDown between a bullet line and an H1 reveals exactly the new
  line and hides the old one, with and without scrolling.** Met. `arrow-reveal.test.ts:53-71` drives
  the full `livePreviewExtensions()` stack with real `cursorLineDown` / `cursorLineUp` and asserts on
  the rendered DOM; `:73-136` drives the inline plugin with a viewport-changing update. The scroll
  case uses a `ViewUpdate` stand-in (jsdom never changes the viewport), see finding 3.
- [x] **Pure scroll still skips rebuilds.** Met. Unchanged `isPureScroll` guard
  (`check-update-action.ts:52-61`) and its existing tests in `check-update-action.test.ts`,
  `block-decorator.test.ts` (gate 1) and `inline-formatting-plugin.test.ts` ("viewport-only scroll")
  all pass; the new test `inline-formatting-plugin.test.ts` "does not rebuild when a viewport-changing
  selection move stays on the same line" adds the same-line-plus-scroll case.
- [x] **Owner decision (option B): a test proves a move within the same line set does not rebuild
  and a move that changes the set does.** Met. `block-decorator.test.ts` gate 2 (4 dispatches,
  scan count 1/2/3/4) and `check-update-action.test.ts` "selection change: compares the lines touched
  before and after" (6 cases). Docs updated as the decision asked: `CLAUDE.md` rules 4-5,
  ADR 0008 (amendment + block-fields paragraph + rule 4), `docs/LIVE-PREVIEW.md` (helper, template,
  factory list).

## Correctness reasoning

- The stateless rule is sound only if no non-rebuild update changes the touched-line set. Traced
  every path: `'none'` from the selection branch requires equal sets; `'skip'` happens only while
  `mouseSelectingField` is set, and the release update returns `'rebuild'` (line 28) whatever the
  selection did; `isPureScroll` excludes `selectionSet`; the queryjs `gate`
  (`queryjs-block-field.ts:66-71`) passes every `docChanged` / `selectionSet` / drag release update;
  `docChanged` always rebuilds, so line numbers are only compared within one document. The stuck
  drag flag (Issue 14) is pre-existing and unchanged.
- No decoration in `live-preview/` reads the selection except through `revealPredicate`
  (`grep '\.selection'` hits only `reveal.ts:30`), so a move inside the same line set cannot
  change any decoration. `frontmatterField` does not use the gate and is unaffected.
- `touchedLines` merges sorted ranges with `first <= prev.last + 1`; CodeMirror keeps ranges sorted
  and non-overlapping, so equal line sets give equal arrays. `revealPredicate` now reads the same
  intervals, so the gate and the predicate cannot drift.
- A same-set selection move that also scrolls stays `'none'`; `scrollDebouncePlugin`
  (`scroll-debounce-plugin.ts:32`) schedules `forceDecorationRebuild` on any viewport change
  without a doc change, so the newly visible region is still filled. Same behavior as before.
- No import cycle (`check-update-action` -> `reveal` -> `mouse-selecting`). Tabs throughout; JSDoc
  on the new exports and interface fields.

## Findings

1. **Low, `src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:8,15-16`.**
   The JSDoc list still says `'rebuild'` on "selection moved", which is now wrong for a same-line
   move, and "A skipped move keeps the set equal ... so skips chain safely" uses "skipped" for a
   `'none'` answer while `'skip'` is the name of the drag action described two lines up. Fix:
   line 8 "selection changed its touched lines"; lines 15-16 "A move answered `'none'` keeps the set
   equal to the one the last rebuild saw, so those answers chain safely; a drag's `'skip'`s end in
   the release rebuild."
2. **Nit, commit `7513659f` message.** The Files section cites
   `arrow-reveal.test.ts (new, L1-145)`; the file has 138 lines. The branch is not pushed, so a
   reword is possible, but it is not worth a history rewrite on its own; leave it unless another
   fix rewrites the branch anyway.
3. **Info (residual risk, no change required),
   `src/tests/lib/core/markdown-editor/extensions/live-preview/arrow-reveal.test.ts:73-136`.** The
   "with scroll" case is a `ViewUpdate` stand-in driving only the inline plugin, because jsdom never
   produces a viewport change. It does fail if `isPureScroll` or `checkUpdateAction` drop a
   selection change that rides a viewport change, which is the failure that matters; a real
   scrolling move is only covered by manual testing or a future Playwright E2E.
4. **Info (performance, no change required),
   `src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:44-48`.** Every selection
   update now runs `touchedLines` twice in each of the 16 gated plugins (11 block decorators, the
   inline pipeline, 4 inline ViewPlugins), O(ranges x log lines) each, against one `lineAt` before.
   Negligible for ordinary selections; with thousands of cursors it is a few thousand `lineAt` calls
   per keystroke, still far below the ~12 ms rebuild it avoids. Memoizing per state would add state
   for no measured need.

## Scope

No scope creep. The diff touches only the files the Issue and the owner decision name, plus
`core/reveal.ts` (the shared line set the decision asked for) and the docs the decision listed.
`work/06/lp-profile-measure.ts.txt` is the measurement harness from the stopped run, kept as
`.txt` so it is not compiled or collected by vitest.

## Resolution

- Finding 1 (Low): fixed. `core/check-update-action.ts` JSDoc lines 8 and 15-17 reworded as proposed.
- Finding 2 (Nit): not applied. The only branch rewrite is a plain rebase onto the moved `main`, which keeps messages; rewording `7513659f` alone would need an interactive rebase for a line-range typo in a commit message.
- Findings 3 and 4 (Info): no change required, as the review states.

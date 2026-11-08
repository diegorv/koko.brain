VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | The content-match rename branch is gone. `MarkdownEditor.svelte:306` now treats an active-path change as a rename only when `takeTabRename(lastTabPath) === path`, and `renameTabViewState` (`tab-view-state.ts:80-87`) records the rename. Its only caller is `link-updater.service.ts:81-88`, right after `updateTabPath`, which has no other caller in `src/lib`. Every check clears the map (`tab-view-state.ts:93-97`), so a background rename entry is dropped at the next switch and cannot match later. Closing A onto a same-content B now goes through the normal switch path. The deleted-tab cleanup at `:311-313` runs, and `showTabState` installs B's own or a fresh state. Both regression tests (the reviewer's probe and the variant where B was visited before) pass, and both fail with the round-1 source restored. |
| 2 | major | resolved | `docDiff` (`doc-diff.logic.ts:27-53`) returns one change per region: whole-line head and tail trim, then a Myers line diff, with each hunk trimmed to its differing characters. It returns null past `DOC_DIFF_MAX_EDITS`. On null, `replaceDoc` (`MarkdownEditor.svelte:149-157`) installs a fresh state that carries over the language and highlight compartments, and `showTabState` (`:191-195`) drops the saved state. I traced the Myers backtrack against the standard algorithm (trace pushed before each round, prevK choice and snake walk-back): it is correct. A temporary fuzz probe (20,000 random line/char docs) checked that applying the changes reproduces `next`, with changes ordered and not overlapping. A 20k-line doc with 333 line edits diffed well inside the probe's 253 ms run. I deleted the probe afterwards. The two-site link rewrite test, the too-large active sync test and the too-large background write test pass, and all three fail with the round-1 source. |
| 3 | minor | resolved | `freshState` (`MarkdownEditor.svelte:85-110`) builds from the current settings and editor mode. Mount (`:253`), a first visit and both fallbacks use it, and no reconfigure follows a first visit. Skipping `langEffects` on a first visit loses nothing. `getLanguageEffectsSync` (`highlight-styles.ts:101-112`) returns exactly `markdownLanguage()` plus `markdownHighlight`, the defaults in `editor-extensions.ts:164,168`. Code files still load their parser through `applyLanguageForTab` (`:353-355`). It was not measured in the running app, which is acceptable for a minor finding. |

## Acceptance criteria re-checked

- [met] Delete text in note A, switch to note B, press Cmd+Z repeatedly: B never receives A's text, and B's tab content and disk stay free of it — the close-onto-same-content gap from round 1 is closed. The tests `closing the active tab onto a tab with the same content does not hand it A's history` and `... onto a visited tab ...` assert undo depth 0 in B and B's tab content unchanged after 3 undos. They pass, and they fail on the round-1 source. The original switch tests still pass.
- [met] Delete a sentence, apply an external-content sync to the same note (Properties panel edit or task toggle), then Cmd+Z: the sentence is restored at its original position or not at all, never appended at the end of the doc — the per-region `docDiff` puts the sentence back between the two rewritten links (test `Cmd+Z after a two-site link rewrite ...`). A sync too large to diff clears the history (depth 0, and undo is a no-op). The earlier Properties and task-toggle tests still pass.
- [met] Closing a tab drops its stored state, and renaming a tab keeps its undo history under the new path — the close and rename tests in `undo-history-across-notes.test.ts` pass, and `tab-view-state.test.ts` covers `takeTabRename` and the clearing by `clearAllTabViewStates`. Active-tab rename still keeps the view state, because `takeTabRename` matches the recorded rename.
- [met] Existing MarkdownEditor, tab-switch and tab-view-state tests still pass — `MarkdownEditor.test.ts`, `tab-view-state.test.ts`, `wikilink-click-capture.test.ts`, `src/tests/lib/core/editor` and `src/tests/lib/architecture` pass, along with the files listed below. Deliver runs the full suite and `pnpm build`.

## Findings

1. **nit** `src/lib/core/markdown-editor/MarkdownEditor.svelte:149-157`. No test covers the too-large-sync fallback that keeps a code file's language and highlight compartments, as the fix report itself says. Fix: optionally add a test that opens a `.ts` tab, applies a sync past `DOC_DIFF_MAX_EDITS` and asserts `languageCompartment.get(view.state)` is unchanged.

No regressions found. The removed `doc-diff.logic.test.ts` assertions were rewritten for the new array return type with the same cases, so no coverage was lost. The fixes add no scope creep and do not touch the layer baseline or `BASELINE_SIZE`.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on `undo-history-across-notes.test.ts`, `doc-diff.logic.test.ts`, `tab-view-state.test.ts`, `MarkdownEditor.test.ts`, `wikilink-click-capture.test.ts`, `link-updater.service.test.ts`, `src/tests/lib/core/editor` and `src/tests/lib/architecture`: exit 0, 22 files, 383 tests passed.
- Red check: with the round-1 `MarkdownEditor.svelte` and `doc-diff.logic.ts` (8e817c99) plus a stubbed `takeTabRename`, the 5 new tests in `undo-history-across-notes.test.ts` fail (5 of 15) and the other 10 pass. I restored the branch sources afterwards, and `git status` is clean.
- Temporary `docDiff` fuzz and perf probe, deleted after it ran.
- I did not run the full suite or `pnpm build`. Deliver runs them.

## Resolution

1. **nit, fixed.** `undo-history-across-notes.test.ts` gains `a sync too large to diff keeps a code file's language`: it opens a `.ts` tab, waits for the TypeScript parser, applies a sync past `DOC_DIFF_MAX_EDITS` and asserts the history is cleared while the language facet is still `typescript`. With the compartment carry-over in `replaceDoc` removed, the test fails (`markdown` instead of `typescript`).

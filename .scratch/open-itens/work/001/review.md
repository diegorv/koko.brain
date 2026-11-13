VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first, in src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts (it already mounts the real MarkdownEditor and calls syncExternalContentToEditor): open '---\ntitle: x\n---\nHello world\n', put the caret at the index of 'world', call syncExternalContentToEditor(path, '---\ntitle: x\n_favorite: true\n---\nHello world\n', false, 'none') and flushSync; the selection head equals the new doc().indexOf('world'). It fails today (the head keeps the old offset). — 'a frontmatter line added above the caret keeps the caret before the same text' (test file :486-495) uses exactly these strings and arguments. Probe: with main's MarkdownEditor.svelte restored, this case fails; on HEAD it passes.
- [met] A text removal above the caret (Cmd+E turning `false` into `true`) moves the caret back by the removed length, so it stays before the same character. — 'text removed above the caret moves the caret back by the removed length' (:497-509) asserts head === old head - 1 and head === indexOf('world'). Fails on main's source, passes on HEAD.
- [met] A non-empty selection in the body survives a frontmatter rewrite with both ends mapped, not collapsed. — 'a body selection survives a frontmatter rewrite with both ends mapped' (:511-523) selects 'world', rewrites the frontmatter (two lines longer), and asserts doc().slice(anchor, head) === 'world', which holds only when both ends are mapped and the range is non-empty. Fails on main's source.
- [met] A change entirely below the caret leaves the caret where it was. — 'a change entirely below the caret leaves the caret where it was' (:525-535). It passes on both main and HEAD, so it guards against regressions; the criterion asks for nothing more.
- [met] A background tab rewritten above its saved caret (task toggle or link rewrite while another tab is active) shows the caret on the same text when the user switches back. — 'a background tab rewritten above its saved caret shows the caret on the same text on return' (:537-548) goes through showTabState's saved-state path. It fails on main's source and passes on HEAD. The fix drops the explicit `selection` from `saved.update` (MarkdownEditor.svelte:228-246), so the saved selection maps through the docDiff.
- [met] The existing CRLF case 'an external sync that shortens a CRLF note below the cursor lands in the view' and the undo-mapping cases in the same file still pass. — undo-history-across-notes.test.ts: 30/30 pass on HEAD (run by this review).
- [met] Frontend gate: pnpm check and pnpm vitest run pass. — `pnpm check`: exit 0, 0 errors, 0 warnings (run by this review). The targeted tests pass: the 6 test files that mount MarkdownEditor, 133/133. The full `pnpm vitest run` is deliver's to run.

## Verification by this review

- Typecheck: `pnpm check` exit 0, 228 files, 0 errors, 0 warnings.
- The test verdict rests on these files, run on HEAD: src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts, src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts, src/tests/lib/core/markdown-editor/wikilink-click-capture.test.ts, src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/image-widget.test.ts, src/tests/lib/features/todoist-sync/note-writer.service.test.ts and src/tests/lib/features/search/SearchResult.test.ts. That is every test file that imports MarkdownEditor.svelte: 6 files, 133/133 pass.
- Mutation probe: main's MarkdownEditor.svelte was put back temporarily and the `caret after an external sync` block was run: 4 failed, 1 passed (the below-the-caret case). The file was then restored to HEAD and the worktree was clean.
- Correctness:
  - Without `selection` in the spec, CodeMirror maps `startState.selection` through the change set with the default assoc -1. A caret at an insertion point stays before the inserted text, which matches the old behaviour for that case.
  - The catch-rebuild path (`v.state.update(spec(rest))`) also maps.
  - `cursorPos` is still used only by `freshState`: diff too large, first visit, and a throw.
  - `EditorSelection` is still imported and used (:111, :308, :386, :607), so nothing is orphaned.
  - On a revisit with no background write, docDiff returns `[]`, which is truthy, so the saved state's own selection is kept. That selection was saved together with `TabViewState.cursorPos` (:475-484), so the caret lands where it did before, and a range or multi-cursor selection is now also kept.
- Scope: the only source change is the two `selection` lines and their JSDoc in MarkdownEditor.svelte, plus the tests. No layer-baseline or composition-root change. live-preview-rules.md and indexing-watcher-rules.md were checked and have no rule on the selection of a doc-replace transaction.

## Findings

1. nit, src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts:525: the below-the-caret case passes on the pre-fix code too, so it is a regression guard, not a reproduction. This is acceptable for the criterion. No change needed; the note is here so deliver does not count it as a failing-first test.
2. nit, src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts:486-548: the caret is covered only through `syncExternalContentToEditor`, not through the Cmd+D/Cmd+E keybinding handler or a real watcher reload. Every one of those paths ends in this call (frontmatter-write.service.ts:131, editor.service.ts watcher reload), so the coverage holds. Optional: add one end-to-end case through `updateNoteFrontmatter` later.

## Resolution

1. Accepted, no change: the below-the-caret case is a regression guard by design; the other four caret cases are the failing-first reproductions.
2. Not done in this Issue: the review marks it optional, and every keybinding and watcher path ends in `syncExternalContentToEditor`, which the tests cover. An end-to-end case through `updateNoteFrontmatter` can be a later Issue.

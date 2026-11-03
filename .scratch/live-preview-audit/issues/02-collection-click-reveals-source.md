# 02: Clicking a row, pill or bar in an embedded collection block shows its raw YAML instead of opening the note

**Status:** needs-triage

**Blocked by:** none

Priority: P2 (every row click in a note-embedded collection)

**Details.** The row, calendar-pill and linear-bar listeners are `click` only (src/lib/features/collection/collection-block-widget.ts:419, :235, :352). Nothing stops the `mousedown`, and `ignoreEvent()` returns false (:380-382), so CodeMirror handles it: the cursor moves to the widget's position on the fence line, the release rebuilds, `revealPredicate` reveals the block, `collectionBlockField` emits nothing, and the widget DOM is detached before `click` fires. The handler never runs. This is the CLAUDE.md "interactive widget elements must stopPropagation on mousedown" rule (Performance Guidelines, rule 11), missing here.

**How a user hits it.** In a note with an embedded ```` ```collection ```` block, click a row to open that note: the block flips to its raw YAML and the note does not open. A calendar pill or a linear-calendar bar does the same.

**Evidence.** `.scratch/live-preview-audit/repro/interactions/widget-click.test.ts`, 'row click opens the note and the widget stays drawn': the widget is gone, the row is detached at click time, `openFileInEditor` is never called, and the cursor moves to the fence. Control: the queryjs Run button, which stops `mousedown`, passes in the same harness. jsdom has no layout, so the test stubs `view.posAndSideAtCoords` with `view.posAtDOM(target)`.

**Fix sketch.** Stop `mousedown` (preventDefault + stopPropagation) on the `tr`, pill and bar elements, as `attachAddButtons` in widgets.ts does, or with one container-level listener for interactive targets.

## Acceptance criteria

- [ ] Failing test first: the widget-click collection case moved under `src/tests/`
- [ ] Clicking a row, a pill and a bar opens the note and leaves the widget drawn with the cursor where it was

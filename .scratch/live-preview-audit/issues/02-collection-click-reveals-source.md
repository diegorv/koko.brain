# 02: Clicking a row, pill or bar in an embedded collection block shows its raw YAML instead of opening the note

**Status:** resolved

**Blocked by:** none

Priority: P2 (every row click in a note-embedded collection)

**What to build:** Stop `mousedown` (preventDefault + stopPropagation) on the collection block widget's clickable elements, the table row `tr`, the calendar pill and the linear-calendar bar (src/lib/features/collection/collection-block-widget.ts:419, :235, :352), the same pattern `attachAddButtons` uses in src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:421-436. A single container-level `mousedown` listener that stops propagation when the target is inside one of those elements is equally fine. Leave `ignoreEvent()` (:380-382) and the click handlers as they are unless the test shows they must change.

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/features/collection/collection-block-widget.ts, src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:421-436, .scratch/live-preview-audit/repro/interactions/widget-click.test.ts

**Details.** The row, calendar-pill and linear-bar listeners are `click` only (src/lib/features/collection/collection-block-widget.ts:419, :235, :352). Nothing stops the `mousedown`, and `ignoreEvent()` returns false (:380-382), so CodeMirror handles it: the cursor moves to the widget's position on the fence line, the release rebuilds, `revealPredicate` reveals the block, `collectionBlockField` emits nothing, and the widget DOM is detached before `click` fires. The handler never runs. This is the CLAUDE.md "interactive widget elements must stopPropagation on mousedown" rule (Performance Guidelines, rule 11), missing here.

**How a user hits it.** In a note with an embedded ```` ```collection ```` block, click a row to open that note: the block flips to its raw YAML and the note does not open. A calendar pill or a linear-calendar bar does the same.

**Evidence.** `.scratch/live-preview-audit/repro/interactions/widget-click.test.ts`, 'row click opens the note and the widget stays drawn': the widget is gone, the row is detached at click time, `openFileInEditor` is never called, and the cursor moves to the fence. Control: the queryjs Run button, which stops `mousedown`, passes in the same harness. jsdom has no layout, so the test stubs `view.posAndSideAtCoords` with `view.posAtDOM(target)`.

**Fix sketch.** Stop `mousedown` (preventDefault + stopPropagation) on the `tr`, pill and bar elements, as `attachAddButtons` in widgets.ts does, or with one container-level listener for interactive targets.

## Acceptance criteria

- [x] Failing test first: move the collection cases of `.scratch/live-preview-audit/repro/interactions/widget-click.test.ts` under `src/tests/` (fix the `test-helpers` import path) and see them fail on the bug assertions
- [x] Clicking a table row, a calendar pill and a linear-calendar bar opens the note (`openFileInEditor` called with its path), the widget stays drawn, and the editor cursor does not move to the fence line
- [x] Clicking elsewhere in the block (outside rows, pills and bars) still places the cursor and reveals the source as today
- [x] Existing collection widget tests pass

## Comments

- 2026-11-02, branch `issue/02-collection-click-reveals-source`: the table row, calendar pill and linear-calendar bar in `collection-block-widget.ts` now stop `mousedown` (preventDefault + stopPropagation), so a click opens the note and the block stays rendered. The repro collection cases moved to `src/tests/lib/features/collection/collection-block-click.test.ts`; they fail without the fix (3 of 5). Full suite: 444 files, 10176 passed, 1 skipped, 1 todo, `pnpm build` ok (exit 0). Review round 1: APPROVED; its optional E2E row-click follow-up is not done here (see review.md Resolution), its nit needs no change.

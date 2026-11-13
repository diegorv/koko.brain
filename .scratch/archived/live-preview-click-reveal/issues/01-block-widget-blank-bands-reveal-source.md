# 01: A click in the blank band above or below a block widget keeps it rendered

**Status:** resolved

Priority: P2 (14 widgets; a click on what looks like empty margin drops the user out of live view, reported by the owner on a table in a daily note)

**What to build:** Every block widget below is an inline `Decoration.replace` (no `block: true`) whose DOM is a `display: block` element. CodeMirror puts a `cm-widgetBuffer` `<img>` before and after an inline widget; next to a block-level child each buffer gets its own line box, 20 to 28 px tall, inside the widget's `.cm-line`. `posAtCoords` maps a click in those bands into the replaced range, `revealPredicate` (`core/reveal.ts`) sees the cursor on the block and the widget turns into raw markdown. Fix it at the root so a click in either band leaves the widget rendered and puts the cursor on the line next to the block, for all 14 widgets.

Widgets and decoration sites (paths under `src/lib/core/markdown-editor/extensions/live-preview/`): table `plugins/table-field.ts:29`, fenced code `plugins/code-block-field.ts:34`, indented code `:76`, block math `plugins/block-math-field.ts:26`, mermaid `plugins/mermaid-field.ts:25`, markdown image `plugins/image-plugin.ts:140`, wikilink image and note embeds `plugins/wikilink-embed-plugin.ts:82,88`, audio `plugins/audio-plugin.ts:31`, video `plugins/video-plugin.ts:31`, collection block `plugins/collection-block-field.ts:27`, queryjs block `plugins/queryjs-block-field.ts:29`, meta-bind button and its error box `plugins/meta-bind-button-field.ts:26`.

Candidate fixes, none chosen: `display: inline-block; width: 100%; vertical-align: top` on the widget root removed both bands for the table in a throwaway E2E probe (the table moved about 20 px closer to the text above and 24 px closer to the text below). `block: true` widgets are not possible as the code stands: `blockDecorator` returns a ViewPlugin (`core/block-decorator.ts:59-62`), as do `image-plugin.ts:53` and `wikilink-embed-plugin.ts:34`, and CodeMirror throws `Block decorations may not be specified via plugins` (`image-plugin.ts:119-121` notes the limit); that route means moving the decorators to StateFields, and images and embeds can also sit mid-line. A third route remaps a click in the band to the neighbouring line. Pick one, and record why in Notes.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview` (E2E; the band tests and the existing live-preview specs)

**Source:** `.scratch/live-preview-click-reveal/report.md` section 2.1, `e2e/specs/live-preview/click-reveal/`

- [x] Every band test that carries `test.fail()` and a `Known bug:` comment about the widget-buffer band passes with the marker removed (27 tests: table, code-block, indented-code-block, math-block, mermaid, image, wikilink-image-embed, wikilink-note-embed, audio-player, video-player, collection-block, queryjs-block, meta-bind-button, meta-bind-button-error, plus `_seed-table-gap.spec.ts`). A band test that still passes with `test.fail()` after the fix only because a precondition fails (band height, hit element `DIV.cm-line`) is rewritten to check the click target instead
- [x] The band ABOVE the meta-bind button and above its error box also stays rendered (owner decision, `meta-bind-button.spec.ts` "blank band 2-20px above the container stays rendered", `meta-bind-button-error.spec.ts` "clicking the blank band above the error box keeps it rendered")
- [x] A click on the meta-bind error box reveals its YAML (owner decision: with the band gone, the error box is the mouse path to the invalid YAML; `meta-bind-button-error.spec.ts` "clicking the error box reveals the YAML"). A valid button keeps running its action on click; its YAML is reached with the keyboard or source mode
- [x] `e2e/specs/live-preview/meta-bind.spec.ts` "button hides when cursor moves to its line" clicks the band above the button (`box.y - 2`); it is changed to reach the line with the keyboard, keeping what it checks
- [x] Clicks on the widget bodies keep today's behavior (table cell, code body, code header blank area reveal; math, mermaid, image and button bodies ignore the click), as the passing tests in the folder pin
- [x] `adjacent-block-widgets.spec.ts` is updated with the fix: it requires a gap over 8 px between two blocks (`:28`), which exists only because of the bands, and asserts that a click in the band above the lower block reveals it (`:48`, `:64`), the behavior this Issue removes
- [x] Band tests whose precondition only checks `hitLine` is not null (`table.spec.ts:47,58`, `_seed-table-gap.spec.ts:39`, `indented-code-block.spec.ts:34,47`, `collection-block.spec.ts:57,74`) or only "not the widget" (`mermaid.spec.ts`, `image.spec.ts`, `wikilink-*-embed.spec.ts`) are tightened first to prove the click is inside the widget's own `.cm-line` (or take `dy` from `lineBandProbe`), so a partial fix that only shrinks the band cannot flip them
- [x] Arrow up/down across each widget still moves line by line (`e2e/specs/live-preview/arrow-reveal.spec.ts` stays green)
- [ ] The owner checks a table, a code block and an image in the macOS app (WebKit; the E2E suite runs Chromium only)

## Notes

- Owner decisions (triage 2026-11-03): blank space around a widget never reveals it; the meta-bind error box opens the YAML on click; the code block header blank area keeps revealing (it is widget chrome, like the body).
- Found by the owner on 2026-11-03 (a table in `_journal-day-03-11-2026.md`, click above the "Intention" heading), then mapped across all widgets by the click-reveal E2E coverage push (`report.md`).
- For math block, mermaid, image and the meta-bind button, `ignoreEvent()` is true on the body, so today the band is the only mouse path to the source. The owner accepted the keyboard and source mode as the way in for those, except the error box above.
- Route picked (build, 2026-11-03): remap the band click (`live-preview/core/block-band-click.ts`, an `EditorView.mouseSelectionStyle`). A press on a `.cm-line` that holds only widget buffers and one block-level widget, above or below the widget's box, puts the cursor at the end of the visible line above or the start of the visible line below; when that line is another block widget, the selection is kept. Why: the layout stays pixel-identical (no spacing change to re-check, no per-widget margin work), one place covers all 14 widgets and any new one, and the StateField migration `block: true` needs is avoided. The band tests now expect the cursor on the blank line next to the block, as "What to build" says, where the probe had picked "End line.". Details in `work/01/discovery.md`.

## Comments

- 2026-11-03, branch `issue/01-block-widget-blank-bands-reveal-source`: a press in the widget-buffer band above or below a block widget is remapped by `live-preview/core/block-band-click.ts` (`EditorView.mouseSelectionStyle`) to the end of the visible line above or the start of the line below, so the block stays rendered; the meta-bind error box reveals its YAML on click; the band E2E tests lose `test.fail()` and their preconditions are tightened. Review round 1: APPROVED (fixes applied: jsdom tests for the no-neighbour, drag and mid-drag mapping paths; `docs/LIVE-PREVIEW.md` documents `blockBandClick`). Review round 2: APPROVED, no findings. Tests at 26151d5e: `pnpm vitest run && pnpm build` 458 files, 10591 passed, 1 skipped, 1 todo, build OK; `pnpm check` 0 errors. Open: the owner's WebKit check in the macOS app.

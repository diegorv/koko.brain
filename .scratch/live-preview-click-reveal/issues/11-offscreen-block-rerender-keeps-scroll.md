# 11: A block widget above the viewport that re-renders with new data keeps the visible text in place

**Status:** resolved

Priority: P3 (suspected, not reproduced; same symptom as Issue 10)

**What to build:** Probe first, then fix only what the probe shows. Issue 10 found that CodeMirror re-estimates the height of off-screen content it can no longer measure, which shifts the visible text when the estimate is wrong. No live-preview widget declares `estimatedHeight` (no hit in `src/lib/core/markdown-editor`), so a block widget that sits ABOVE the viewport and is rebuilt (its `eq()` returns false, or its cached result is dropped) may shift the view the same way. Likely triggers: a collection block (`plugins/collection-block-field.ts`) or a queryjs block (`plugins/queryjs-block-field.ts`, `queryjs-session.store.svelte.ts`) whose data changes after another note's property changes (the vault index bump that follows), and a note embed (`plugins/wikilink-embed-plugin.ts`) whose target note changes.

1. Write an E2E probe per trigger: a note with the block near the top, enough content below to scroll far, the cursor and the viewport at the bottom; change the data the block reads in ANOTHER note, never the open note's own frontmatter (that path is Issue 10's): write the other note through the E2E fs (`window.__e2e.fs`) and emit the watcher event (`vault-files-changed`), as `e2e/specs/editor-state-persistence.spec.ts` does; measure the screen y of a line at the bottom before and after, through the delayed re-render (wait past the save debounce and the index bump).
2. If no trigger moves the view, close this Issue as wontfix with the numbers in Notes, and keep the probes as passing regression tests.
3. If one does, fix it at the cause (for example a cached `estimatedHeight` from the last rendered height, or a scroll anchor around the rebuild), with the probe as the failing-first test. Record in Notes why that fix and not the other.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview` (E2E)

**Source:** Issue 10 (root cause of the frontmatter case), owner question 2026-11-03, src/lib/core/markdown-editor/extensions/live-preview/plugins/{collection-block-field,queryjs-block-field,wikilink-embed-plugin}.ts

- [x] Notes record, per trigger (collection block, queryjs block, note embed), the screen-y shift of a bottom line after the re-render
- [x] Each probe is kept as an E2E test that asserts the shift is under 5 px (passing, or failing first and then fixed)
- [x] If a fix lands: the block still re-renders with the new data, and a block on screen still grows or shrinks in place
- [x] Not verified by the agent: the owner repeats one case in the macOS app if a fix lands

## Notes

- The trigger changes another note so the measurement does not mix in Issue 10's frontmatter jump; this Issue runs in parallel with 10 (owner, 2026-11-03).
- Probe results (2026-11-03, `e2e/specs/live-preview/offscreen-block-rerender-keeps-scroll.spec.ts`; block on line 3, anchor line ~14 500 px down at mid-screen, cursor on it, Other.md written through the E2E fs + `vault-files-changed`, 3 s wait past the index bump), screen-y shift of the anchor line: collection block 0.0 px, queryjs block 0.0 px, note embed 0.0 px. A diagnostic run also read the block line's height (`view.lineBlockAt`) before and after: unchanged (collection 327.8 px, queryjs 245.8 px, embed 164.3 px), as was `scrollHeight`.
- Why nothing moves: all three decorators are ViewPlugins (`blockDecorator` for collection and queryjs, `wikilinkEmbedPlugin`). `@codemirror/view` 6.43.15 builds its height map only from static (StateField) decorations (`staticDeco` filters out the function-valued ones a ViewPlugin provides), so a plugin rebuild off screen never drops the line's measured height. Issue 10's jump came from a document change inside hidden lines, which does re-estimate. Per trigger: the collection block does rebuild off screen (version in `eq()`) and the test sees `Active (8)` after scrolling back up; queryjs and the note embed do not rebuild at all off screen (`eq()` ignores the data; the embed plugin only decorates the expanded viewport), they re-render when they scroll back in.
- Outcome: no trigger moves the view; no fix. Closes as wontfix; the three probes stay as passing regression tests (the collection probe would catch its decorator moving into a StateField, since only that block rebuilds off screen).

## Comments

- 2026-11-03, branch `issue/11-offscreen-block-rerender-keeps-scroll`: E2E probes for collection, queryjs and note-embed re-renders above the viewport; all three measure a 0.0 px shift, so no app fix. The probes stay as regression tests, and after review round 1 the queryjs and embed probes also check that the new data arrives. Full suite at 2d7b0782 exit=0 (459 files, 10624 passed, 1 skipped, 1 todo, build ok); `pnpm check` 0 errors; the targeted E2E passes 3/3 with `--workers=1`. Reviews: round 1 APPROVED, round 2 APPROVED.

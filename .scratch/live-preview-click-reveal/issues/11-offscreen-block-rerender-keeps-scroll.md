# 11: A block widget above the viewport that re-renders with new data keeps the visible text in place

**Status:** ready-for-agent

Priority: P3 (suspected, not reproduced; same symptom as Issue 10)

**What to build:** Probe first, then fix only what the probe shows. Issue 10 found that CodeMirror re-estimates the height of off-screen content it can no longer measure, which shifts the visible text when the estimate is wrong. No live-preview widget declares `estimatedHeight` (no hit in `src/lib/core/markdown-editor`), so a block widget that sits ABOVE the viewport and is rebuilt (its `eq()` returns false, or its cached result is dropped) may shift the view the same way. Likely triggers: a collection block (`plugins/collection-block-field.ts`) or a queryjs block (`plugins/queryjs-block-field.ts`, `queryjs-session.store.svelte.ts`) whose data changes after a property edit (the vault index bump that follows a save), and a note embed (`plugins/wikilink-embed-plugin.ts`) whose target note changes.

1. Write an E2E probe per trigger: a note with the block near the top, enough content below to scroll far, the cursor and the viewport at the bottom; change the data the block reads (edit a property through a meta-bind control at the bottom, or change the embedded note on disk through the E2E fs and the watcher event); measure the screen y of a line at the bottom before and after, through the delayed re-render (wait past the save debounce and the index bump).
2. If no trigger moves the view, close this Issue as wontfix with the numbers in Notes, and keep the probes as passing regression tests.
3. If one does, fix it at the cause (for example a cached `estimatedHeight` from the last rendered height, or a scroll anchor around the rebuild), with the probe as the failing-first test. Record in Notes why that fix and not the other.

**Blocked by:** 10

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview` (E2E)

**Source:** Issue 10 (root cause of the frontmatter case), owner question 2026-11-03, src/lib/core/markdown-editor/extensions/live-preview/plugins/{collection-block-field,queryjs-block-field,wikilink-embed-plugin}.ts

- [ ] Notes record, per trigger (collection block, queryjs block, note embed), the screen-y shift of a bottom line after the re-render
- [ ] Each probe is kept as an E2E test that asserts the shift is under 5 px (passing, or failing first and then fixed)
- [ ] If a fix lands: the block still re-renders with the new data, and a block on screen still grows or shrinks in place
- [ ] Not verified by the agent: the owner repeats one case in the macOS app if a fix lands

## Notes

- Blocked by 10: the trigger goes through the frontmatter write Issue 10 fixes, so the measurement must start from that fix.

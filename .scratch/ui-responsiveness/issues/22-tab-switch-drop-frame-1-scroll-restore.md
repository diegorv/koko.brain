# 22: Drop the frame-1 scroll restore on a tab switch if the logs show it never moves the scroll

**Status:** needs-info

Priority: P3 (cleanup; one redundant scroll write per tab switch)

**What to build:** Issue 21 writes the new tab's scroll synchronously right after `view.focus()` in the tab switch (`src/lib/core/markdown-editor/MarkdownEditor.svelte`), and kept the older restore in the first animation frame (`scrollDOM.scrollTo(...)` in the `requestAnimationFrame` callback). Issue 21's round-2 review deferred the question whether that frame-1 write still does anything: it only can if something moves the scroll between the focus and the next frame. If an owner session shows "frame 1" and "after restore" with the same scrollTop for every saved and fresh tab, remove the frame-1 write and keep the rest of the rAF chain (decoration rebuild, Issue 15's log lines).

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** review-2 of Issue 21 (`.scratch/ui-responsiveness/work/21/review-2.md`, kept in git history after delivery)

- [ ] Notes record, from an owner session with the debug log on, how many tab switches had "frame 1" scrollTop different from "after restore" (saved and fresh tabs separately)
- [ ] If none: failing first, a test that the rAF callback no longer writes `scrollTop`; then remove the write. A saved tab still lands on its saved offset and a fresh tab on 0
- [ ] If some: Notes name the writer from the logs, and the Issue closes as wontfix or files the real fix

## Notes

- needs-info: waits on an owner session (Debug mode + Save debug log to file on), switching between several saved and fresh tabs. The main session reads the TAB_SWITCH lines.

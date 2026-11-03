# 22: Drop the frame-1 scroll restore on a tab switch if the logs show it never moves the scroll

**Status:** wontfix

Priority: P3 (cleanup; one redundant scroll write per tab switch)

**What to build:** Issue 21 writes the new tab's scroll synchronously right after `view.focus()` in the tab switch (`src/lib/core/markdown-editor/MarkdownEditor.svelte`), and kept the older restore in the first animation frame (`scrollDOM.scrollTo(...)` in the `requestAnimationFrame` callback). Issue 21's round-2 review deferred the question whether that frame-1 write still does anything: it only can if something moves the scroll between the focus and the next frame. If an owner session shows "frame 1" and "after restore" with the same scrollTop for every saved and fresh tab, remove the frame-1 write and keep the rest of the rAF chain (decoration rebuild, Issue 15's log lines).

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** review-2 of Issue 21 (`.scratch/ui-responsiveness/work/21/review-2.md`, kept in git history after delivery)

- [x] Notes record, from an owner session with the debug log on, how many tab switches had "frame 1" scrollTop different from "after restore" (saved and fresh tabs separately)
- [ ] If none: failing first, a test that the rAF callback no longer writes `scrollTop`; then remove the write. A saved tab still lands on its saved offset and a fresh tab on 0
- [x] If some: Notes name the writer from the logs, and the Issue closes as wontfix or files the real fix

## Notes

- Owner session `2026-11-03_09-36-54.log` (release build, 185 tab switches): fresh tabs 0 of 77 with "frame 1" different from "after restore"; saved tabs 9 of 108. In those 9 the scroll moved between the synchronous write after `view.focus()` and the first animation frame, for example `2024-07-17-Shifting from Outputs to Outcomes...md`: after focus 7665, frame 1 6503, after restore 7665; `2024-12-26-The Product Leader's Ultimate Guide...md`: 3971, 4603, 3971. All 9 are long notes switched back to at a large saved offset, and the move goes both ways, which fits CodeMirror's first measure after the doc replace correcting estimated line heights. The log does not name the writer more precisely than that.
- Decision: wontfix. The frame-1 write puts the scroll back in every one of those 9 cases, so removing it would leave saved tabs off their offset by up to about 1.2k px.
- Issue 21 confirmed in the same session: no fresh tab moved at "after focus" (0 of 77, against 15 of 51 before the fix), and every fresh tab was at 0 at frame 1 and frame 2 (the 5 fresh tabs that moved at frame 3 ran a pending `scrollIntoView` to a search match, which is intended).
- Seen, not filed: a saved tab of a long note with collection or queryjs widgets can land off its saved offset after frame 1 (`20-collection.md`: saved 14674, landed 12054; `22-queryjs.md`: restored 7586, then 5734 at frame 2), because the widgets change height after the restore.

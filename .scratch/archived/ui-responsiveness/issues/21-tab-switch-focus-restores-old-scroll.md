# 21: A tab switch does not scroll to the previous tab's position before restoring its own

**Status:** resolved

Priority: P3 (a transient scroll on about 1 in 3 fresh-tab switches; the final position is right)

**What to build:** Issue 15's logging found the cause of the fresh-tab scroll-down. In `MarkdownEditor.svelte` the tab switch replaces the doc, then calls `view.focus()` (`:417`), then restores the scroll one animation frame later (`:436-445`). The comment at `:414-416` already names the mechanism: when the editor did not have focus, CodeMirror's focus observer writes its last recorded scrollTop back if scrollTop is 0. That last scrollTop belongs to the previous tab. So the editor jumps to the old tab's offset, CodeMirror measures and draws that viewport, and the rAF restore then scrolls to the right place, which draws a second viewport.

Evidence from the owner session `2026-11-03_07-36-46.log`: of 51 fresh-tab switches, the first scrollTop change came at "after focus" in 15 (for example `01-arrows-bullet-heading.md`: after replace 0, after focus 192, frame 1 192, after restore 0), and every fresh tab ended at scrollTop 0. Saved tabs show the same jump less often (3 of 65 at focus).

Fix: make the scroll the new tab should have win before CodeMirror measures, for example by setting it synchronously right after `view.focus()` instead of in the rAF, or by stopping the focus observer's write-back for a tab switch. Keep the rAF restore only if the logs show a later write still needs it. Keep Issue 15's `TAB_SWITCH` scroll lines.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/core/markdown-editor/MarkdownEditor.svelte:372-460, node_modules/@codemirror/view/dist/index.js (focus observer)

- [x] Failing first: a switch from a tab scrolled to 192 to a fresh tab never reports scrollTop 192 for the new tab at "after focus" or "frame 1" (through the real `TAB_SWITCH` scroll lines or a scroll spy on `scrollDOM`)
- [x] A saved tab still lands on its saved scrollTop, and a fresh tab on 0
- [x] The Issue 15 logging tests stay green
- [x] Not verified by the agent: the owner's next session shows no "after focus" jump on fresh tabs

## Notes

- Source finding: Issue 15 (`.scratch/ui-responsiveness/work/15/`), analysed in the main session on 2026-11-03.

## Comments

- 2026-11-03, branch `issue/21-tab-switch-focus-restores-old-scroll`: the tab switch in `MarkdownEditor.svelte` now writes the new tab's scroll (saved offset, or 0 for a fresh tab) synchronously right after `view.focus()`, so CodeMirror's focus observer can no longer leave the previous tab's scrollTop in place; the rAF restore stays and Issue 15's `TAB_SWITCH` lines are kept. A fix round corrected the frame-1 restore comment. Tests: pnpm check 0 errors; MarkdownEditor.test.ts 15/15; full suite at c26ce08c 452/452 files, 10383 passed, 1 skipped, 1 todo, build ok. Reviews: round 1 APPROVED, round 2 APPROVED (comment nit, and a follow-up on dropping the frame-1 write, deferred to the owner session).

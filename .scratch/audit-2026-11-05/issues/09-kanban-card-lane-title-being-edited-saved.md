# 09: A kanban card or lane title being edited is saved into its own board when the tab changes, and never into another tab

**What to build:** The typed text lives only in the card textarea's local state (src/lib/plugins/kanban/KanbanCard.svelte:61, :189-195) or the lane title input (src/lib/plugins/kanban/KanbanLane.svelte:249-253) and reaches the board only through commitEdit on blur or Enter. KanbanView is not keyed by path and persists through onContentChange (src/lib/app/EditorView.svelte:80), which writes tabs[activeIndex] (src/lib/core/editor/editor.service.ts:254-256, editor.store.svelte.ts:84-88). A keyboard tab switch or Cmd+W unmounts the view with the edit still open: if WebKit fires no blur on removal the edit is dropped; if it does, applyChange compares against the new tab's content (KanbanView.svelte:87) and writes the board markdown into the note now in front, which autosave then writes to disk. Which of the two happens was not verified in the running app. Issue 01 already flagged this site as a follow-up. Fix direction: mirror the canvas fix: key KanbanView by path and persist through a path-scoped writer (onContentChangeForPath with a path read once), compare against the instance's own last content rather than the live prop, and commit a pending card or lane-title edit when the view is torn down. The close and quit paths should use the same pre-removal flush mechanism Issue 22 picks for canvas.

**Blocked by:** 06

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in a new src/tests/lib/plugins/kanban/kanban-tab-switch.test.ts modeled on src/tests/lib/features/canvas/canvas-tab-switch.test.ts: open a kanban tab K and a note tab M, mount EditorView, double-click a card in K, set the textarea value to 'edited', switchTab to M, advance timers; tab K's content contains 'edited' and tab M's content and writes are unchanged. It fails today (the edit is lost).
- [ ] Dispatching a blur on the card textarea during the switch never changes tab M's content (guards the blur-fires case).
- [ ] The same holds for a lane title being renamed.
- [ ] Switching between two kanban tabs keeps each board's edit in its own tab.
- [ ] Closing K with Cmd+W within the edit follows the mechanism Issue 22 adds and writes nothing into M.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** content safety (bucket 1-content). Upheld content/low, but severe: board markdown can be written into the note now in front. It reuses the pre-close flush that Issue 22 builds.
- **Trigger:** Double-click a card (or a lane title), type, and without pressing Enter or clicking elsewhere switch tabs with a keyboard shortcut, close the tab with Cmd+W, or quit.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/plugins/kanban/KanbanCard.svelte:92-101 commitEdit only on blur/Enter (:69-72, :195); src/lib/plugins/kanban/KanbanLane.svelte:149-155, :253 lane title commit on blur/Enter; src/lib/app/EditorView.svelte:79-80 KanbanView unkeyed, onContentChange; src/lib/plugins/kanban/KanbanView.svelte:79-90 applyChange compares against markdownContent prop and calls onContentChange; src/lib/core/editor/editor.service.ts:254-256 onContentChange -> editorStore.updateContent; src/lib/core/editor/editor.store.svelte.ts:84-88 writes tabs[activeIndex]; editor.service.ts:328 closeTab removes the tab with no pre-close flush; src/lib/core/vault/exit.service.ts:15-17 quit saves tab.content only; no document.activeElement blur in src/lib before close or exit; .scratch/audit-2026-11-04/issues/01-canvas-persist-to-own-tab.md:25 lists KanbanCard.svelte:195 / KanbanLane.svelte:253 -> KanbanView onContentChange as an unfixed sibling. Not verified: WebKit blur-on-removal behaviour in the Tauri webview.
- **Related Issues before the audit:** `.scratch/audit-2026-11-04/issues/22-canvas-flush-on-close-and-rename.md`
- **Second opinion:** upheld (content, low). Confirmed structurally. EditorView.svelte:79-80 mounts KanbanView without a key and with onContentChange, which writes tabs[activeIndex] (editor.store.svelte.ts:84-88), unlike canvas, which uses onContentChangeForPath inside a key block. The card edit commits only on blur or Enter (KanbanCard.svelte:69-101, :195). On a keyboard tab switch or Cmd+W the edit is either dropped or, if blur fires during teardown, applyChange compares against the new tab's content prop and writes the board markdown into the note now in front. A mouse click on a tab blurs first and commits safely, which keeps likelihood low. As the Issue says, whether WebKit fires blur on removal was not verified.
- **Source:** audit 2026-11-05, domain `boards`, finding `N-boards-07` (from boards-content-1). Size M.

## Comments

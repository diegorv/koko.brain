# 054: Auto Move evaluates and moves only Markdown notes: kanban boards, canvases and other files stay where they are

**Origin:** `audit-2026-11-05` Issue 36, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** The after-save observer in registerAutoMoveHook (src/lib/features/auto-move/auto-move.service.ts:96-97) only skips .view files (isViewFile). Kanban saves (EditorView.svelte:80, onContentChange) and canvas saves (EditorView.svelte:84, onContentChangeForPath) go through writeTab, which calls notifyAfterSave for any path (src/lib/core/editor/editor.service.ts:187-205, call at :196). evaluateAndMove then builds a record for any extension (buildNoteRecord, src/lib/features/collection/collection.logic.ts:22-43, tags from the raw content), matches it and calls moveItem (:190). The help promises the opposite (help/documentation/22-auto-move.md:183: only .md files are evaluated; .canvas and .kanban never move). Fix direction: the observer returns early unless the path is a Markdown note (isMarkdownFile, src/lib/core/filesystem/fs.logic.ts:65-68), which also covers .view. Align the Overview sentence at 22-auto-move.md:11 (which names only .view) with the note at :183.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/auto-move/auto-move.service.test.ts (next to 'observer never moves a .view' at :237): with vaultStore.open('/vault'), a rule `file.folder == '/vault/inbox'` -> Archive, capture the observer, call it with '/vault/inbox/Board.kanban' (kanban markdown content) and '/vault/inbox/Map.canvas' ('{"nodes":[],"edges":[]}'), advance timers past the debounce; moveItem is not called. Then the same rule on '/vault/inbox/note.md' still moves it. It fails today.
- [ ] A tag rule does not move a .kanban whose card text holds the tag.
- [ ] .md and .markdown notes are evaluated as before; .view stays excluded.
- [ ] 22-auto-move.md says once, consistently, that only Markdown notes are evaluated.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/medium, but it needs Auto Move enabled with a matching rule, so it is placed late in the medium group.
- **Trigger:** Auto Move is on with a user rule a board or canvas can satisfy: a folder rule (file.folder ...), a name rule, or a tag rule such as file.hasTag('meeting') where a kanban card or canvas text node carries #meeting. The owner edits a card or a node; about 3 s after the autosave the .kanban or .canvas file is moved to the rule's destination.
- **Evidence (verified by reading code at `5f8003d67`):** help/documentation/22-auto-move.md:183 (promise), :11 (names only .view); src/lib/app/EditorView.svelte:80 (KanbanView onContentChange), :84 (CanvasView onJsonChange=onContentChangeForPath); src/lib/core/editor/editor.service.ts:187-205 writeTab, no file-type check, notifyAfterSave at :196; src/lib/core/editor/editor.hooks.ts:67 notifies every observer; src/lib/features/auto-move/auto-move.service.ts:96-97 only isViewFile; :154 buildNoteRecord for any path; :159 findMatchingRule; :190 moveItem; src/lib/features/collection/collection.logic.ts:22-43 record fields for any extension, tags from extractAllTags(content); src/tests/lib/features/auto-move/auto-move.service.test.ts:237-270 pins only the .view exclusion; src/lib/core/filesystem/fs.logic.ts:65-68 isMarkdownFile exists.
- **Second opinion:** upheld (ux, medium). The observer at auto-move.service.ts:96-97 skips only isViewFile. Kanban saves (via onContentChange) and canvas saves (via onContentChangeForPath) go through writeTab, then notifyAfterSave. evaluateAndMove calls buildNoteRecord and moveItem for any extension. help 22-auto-move.md:183 promises .canvas and .kanban never move. This needs Auto Move enabled with a rule that matches the board. The file is moved intact, not corrupted or overwritten. Corrections to apply while implementing: Category content -> ux: an unexpected but intact move, not lost data.
- **Source:** audit 2026-11-05, domain `metadata`, finding `N-metadata-01` (from metadata-ux-1, metadata-spec-1). Size S.

## Comments

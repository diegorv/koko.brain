# Deep-dive group o09-undo-canvas-kanban

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## cross-cutting-3: Undo history is shared across markdown tabs and survives full-doc replaces, so Cmd+Z inserts another note's deleted text into the current note
- claimed severity: corruption
- anchor: src/lib/core/markdown-editor/MarkdownEditor.svelte:230
- scenario: In note A, delete a paragraph. Switch to note B, edit it, then press Cmd+Z a few times. After B's own events are undone, the next Cmd+Z re-inserts A's paragraph at the end of B, and autosave writes it to B. Same-note variant: delete a sentence in paragraph 2, edit a property in the Properties panel (full-doc replace), then press Cmd+Z. The sentence comes back at the end of the note.
- evidence given: READ: one EditorState/history() per session (editor-extensions.ts:130,160; MarkdownEditor.svelte:107-131). Tab switch dispatches a full replace with addToHistory false (MarkdownEditor.svelte:230-235). External sync does the same (:329-333). Undo passes the onDocChanged gate (editor-extensions.ts:171-188), then onContentChange schedules autosave (editor.service.ts:224-227). FETCHED: codemirror/commands history.ts, where addToHistory=false leads to addMapping, and an event survives if its mapped changes are non-empty. codemirror/state change.ts mapSet keeps insertions inside deleted ranges and places them after the replacement text. No test covers undo across a switch.

## feature-writers-1: Canvas onDestroy flush writes canvas JSON into the newly active tab, and autosave overwrites that note
- claimed severity: corruption
- anchor: src/lib/features/canvas/CanvasInner.svelte:230
- scenario: On a canvas, click the header of an unselected file node whose note is not open yet. The file-header onclick starts openFileInEditor, which awaits readTextFile. The click bubbles to the xyflow wrapper, which selects the node; the new nodes array sets pendingPersist. addTab then moves activeIndex, the canvas is destroyed, and onDestroy calls persistChanges -> onContentChange -> updateContent(tabs[activeIndex]). The opened note now holds canvas JSON, and autosave writes it to disk 2 s later. Also triggered by Ctrl+Tab or closing the canvas tab within 300 ms of opening or selecting a node.
- evidence given: CanvasInner.svelte:212-226 (pendingPersist set on any nodes change, reset only in the timer callback :223); :230-234 onDestroy flush; :104-109 onJsonChange; EditorView.svelte:80-81 (mounted only while the canvas tab is active, onJsonChange=onContentChange); editor.service.ts:224-227; editor.store.svelte.ts:84-88 (writes tabs[activeIndex], no path check); FileNode.svelte:55-57,66; editor.service.ts:124,140; xyflow store/index.js:162 and NodeWrapper.svelte:174-181,277 (selection assigns a new nodes array); editor.service.ts:183-194 autosave. Recovery only via file-history snapshots of earlier in-app saves (file-history.service.ts:190-197).

## feature-writers-6: An unparseable .canvas opens as an empty canvas and the first edit overwrites the original
- claimed severity: data-loss
- anchor: src/lib/features/canvas/canvas.logic.ts:46
- scenario: A .canvas with a merge-conflict marker or a trailing comma opens blank with no error. The user adds one card, and the file is replaced by a canvas holding only that card.
- evidence given: canvas.logic.ts:36-49 returns createEmptyCanvas on error; CanvasInner.svelte:71 canvasData; :465-471 and :542-567 add-node -> persistChanges -> flowToCanvas(..., canvasData) -> onJsonChange -> autosave writeTextFile (editor.service.ts:168).

## fidelity-10: Invalid .canvas JSON parses to empty canvas silently; first edit overwrites the file
- claimed severity: data-loss
- anchor: src/lib/features/canvas/canvas.logic.ts:36
- scenario: Canvas with a trailing comma or git conflict marker opens empty; user double-clicks to add a node; autosave writes a canvas containing only that node.
- evidence given: canvas.logic.ts:36-49 returns createEmptyCanvas on error, no log/toast; CanvasInner.svelte:76 canvasData derived; :104-109 persist via flowToCanvas(..., canvasData) -> onJsonChange.

## feature-writers-5: Kanban board actions delete every unrecognised line; CRLF files and files with frontmatter lose all lanes
- claimed severity: data-loss
- anchor: src/lib/plugins/kanban/kanban.logic.ts:61
- scenario: The user adds a paragraph, a ### heading, an indented line or a '- [/]' item in source mode or in an external editor, then drags a card. 2 s later those lines are gone from disk. A CRLF file parses with zero lanes, so the first action writes a board with only the change. A leading '---' frontmatter makes every lane heading be skipped and all items become archive.
- evidence given: kanban.logic.ts:4-6 regexes (no m flag, so '.' and '$' fail before \r); :67-109 keeps only heading, task and separator lines, :69-72 the first --- enters archive mode, :78-82 skips headings in archive; serializeKanbanBoard :118-145; KanbanView.svelte:79-90 applyChange -> onContentChange -> autosave.

## fidelity-5: Kanban drops unmodeled content; CRLF boards parse empty and a .kanban with frontmatter collapses into the archive; next mutation overwrites the file
- claimed severity: data-loss
- anchor: src/lib/plugins/kanban/kanban.logic.ts:4
- scenario: CRLF board opens empty; user adds a lane and the file is replaced by that single lane. Board with prose, # title, nested bullets or multi-line cards loses them on the first toggle/move. Board with frontmatter shows no lanes; adding a lane writes every card under ## Archive and drops the frontmatter.
- evidence given: kanban.logic.ts:4-5 regexes without \r tolerance, :61 split on \n, :6 ARCHIVE_SEPARATOR_RE matches frontmatter opener at :69-72, archive headings skipped :78-82, items to archive :103-104, other lines ignored :67-109, serialize writes only lanes/cards :118-145; KanbanView.svelte:79-90 applyChange -> onContentChange; EditorView.svelte:79; contrast navigation.logic.ts:6 uses \r?$.

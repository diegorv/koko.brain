# Deep-dive group h05-calendar-b

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## calendar-6: Keystrokes typed during the pre-delete save are lost when the calendar delete closes the tab
- claimed severity: data-loss
- anchor: src/lib/features/event-calendar/event-calendar.service.ts:1037
- scenario: User types into the event note in another pane while a calendar delete runs its save IPC. The typed text is dropped, and the Trash holds the bytes from before the typing.
- evidence given: saveFileByPath captures tab.content and writes it (editor.service.ts:161-168). markSavedByPath sets only savedContent (editor.store.svelte.ts:91-96). With no further await, deleteItem calls applyPathChange, which calls closeTabsForDeletedPath (path-change.service.ts:125, editor.service.ts:356-366) with no dirty check.

## calendar-7: Calendar title rename's link rewrite drops typing in a note that links to the event
- claimed severity: data-loss
- anchor: src/lib/core/filesystem/link-updater.service.ts:47
- scenario: The user renames an event via the edit dialog, or an undo or redo of an 'Edit event' renames it, while typing in an open note that contains [[Event]]. Characters typed between the dirty check and the sync are removed from both the buffer and the disk.
- evidence given: isDirty is decided at link-updater.service.ts:33-34, then readTextFile (:35) and await writeTextFile (:39), then syncExternalContentToEditor(..., true) (:47) replaces content and savedContent (editor.store.svelte.ts:130-136). Triggered from event-calendar.service.ts:686-704 and :1338 (planTitle true).

## rename-move-delete-5: Keystrokes typed into an affected open note during the link-rewrite IPC are reverted, with no undo
- claimed severity: data-loss
- anchor: src/lib/core/filesystem/link-updater.service.ts:47
- scenario: Note X is open and contains [[Old]]. Rename Old, then type in X at once. Characters typed between the rewrite's read (or snapshot) and the end of its write are replaced by the stale-based rewrite, in both the store and CodeMirror, and Cmd+Z cannot bring them back. The window is a few milliseconds.
- evidence given: READ: link-updater.service.ts:33-39 builds the rewrite from a snapshot, then awaits writeTextFile. :47 syncExternalContentToEditor(markSaved=true) sets content and savedContent (editor.store.svelte.ts:130-136). MarkdownEditor.svelte:312-336 then replaces the whole doc with addToHistory(false).

## calendar-8: Tab-branch save failure reported as a failed move, but the move lands on a later autosave
- claimed severity: stale-state
- anchor: src/lib/core/frontmatter/frontmatter-write.service.ts:133
- scenario: A disk error hits during a drag while the user types in the same note. The calendar rolls back the overlay and records no op, but the tab keeps the moved frontmatter, and the next autosave or 5 s retry writes it. The UI said the move failed, and it cannot be undone.
- evidence given: There is no revert when the tab content is no longer equal to next (frontmatter-write.service.ts:131-134). The calendar rollback is at event-calendar.service.ts:767-771. Typing re-arms autosave (editor.service.ts:224-227), and the retry is at :183-193.

## calendar-9: Create reported as failed after create_note succeeded; retry duplicates the note
- claimed severity: minor
- anchor: src/lib/core/filesystem/fs.service.ts:138
- scenario: scan_vault fails once after a successful create. The dialog shows create-failed with the form kept. The user presses Create again and gets 'Standup 1.md' next to the unseen first note.
- evidence given: create_note runs at fs.service.ts:129, then refreshTree at :138 inside the same try, which rethrows. createTypedNote maps any throw to create-failed (type-definitions.service.ts:136-139). createNow records no overlay or op (event-calendar.service.ts:943-947). The dialog keeps the form (EventDialog.svelte:145-158).

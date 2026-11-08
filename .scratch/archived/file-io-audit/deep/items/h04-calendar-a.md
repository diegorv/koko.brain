# Deep-dive group h04-calendar-a

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## calendar-4: createNow holds the planned path without waiting for a calendar restore or rename in flight there; the check-then-replace disk legs can destroy one note
- claimed severity: data-loss
- anchor: src/lib/features/event-calendar/event-calendar.service.ts:939
- scenario: User undoes the delete of 'Standup' (Cmd+Z or the toast's Undo) and within milliseconds saves a new 'Standup' event. If the restore's rename lands between create_note's exists check and its write_atomic rename, the restored real note (already out of the Trash manifest) is replaced by the template. In the reverse order, the new note and its dialog notes are replaced. A rename-with-title onto the same name has the same gap.
- evidence given: holdPath never awaits the previous tail (event-calendar.service.ts:438-445). duplicateEvent uses joinPath for exactly this case (:1001-1004). The undo claims its path at its intake turn, and the create then runs concurrently (:481-504, :1300-1311). restoreItem calls exists, then rename (trash.service.ts:116,126). FETCHED: plugin-fs rename is std::fs::rename with no destination check. create_note calls exists, then write_atomic, which renames over the target (vault.rs:896-899, utils/fs.rs:27-31).

## calendar-5: A failure in applyPathChange after the disk move makes the calendar report a failed rename or delete that actually happened
- claimed severity: stale-state
- anchor: src/lib/core/filesystem/path-change.service.ts:149
- scenario: Rename: get_backlinks_v2 or scan_vault fails after the move. The user sees 'a note with that name may already exist'. The note is renamed, the dialog's other field edits are never written, the store keeps the old path, no op is recorded, and a retry fails. Delete: the user sees 'Could not move the note to the Trash' while it is in the Trash, no undo op is recorded, and forgetNote is skipped, so a ghost event may remain.
- evidence given: There is no try/finally after diskOp (path-change.service.ts:127-170). The call at link-updater.service.ts:27 is outside any try. refreshTree rethrows (fs.service.ts:96-98). renameAndWrite maps any throw to the 'may already exist' message (event-calendar.service.ts:727-731) before the remap and the field write. The own mark was consumed at :626. deleteNow rolls back at :1044-1049 although trash.service.ts:71-83 already moved the file.

## rename-move-delete-6: A failure after the disk rename reports a failed rename and skips the rename_note re-key and the old-path sweep
- claimed severity: stale-state
- anchor: src/lib/core/filesystem/path-change.service.ts:149
- scenario: get_backlinks_v2 fails (a poisoned VaultIndex lock makes every later call fail) or scan_vault fails during a rename. The note is renamed on disk and its tab has moved, but the toast says 'Could not rename', the tree still shows the old name, the Rust index keeps the old paths, and a retry fails. For a folder, the watcher does not repair it.
- evidence given: READ: path-change.service.ts:148-153 awaits updateLinksAfterRename and refreshTree with no try. link-updater.service.ts:27 calls get_backlinks_v2 outside the allSettled. fs.service.ts:96-98 rethrows. That skips :158-162 (rename_note) and :168-170 (sweep), and fs.service.ts:216-219 rethrows to the caller's toast. vault.rs:436-438: lock poisoning becomes an error.

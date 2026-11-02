# Senior review: calendar theme (event calendar writes)

Read-only. No repo file edited except this report. Nothing built or run (no cargo, pnpm, vitest, playwright).
Labels: READ = read in source at the cited line. FETCHED = external source fetched for this review.
INFER = reasoned from code, not run.

Scout report used as leads: `.scratch/file-io-audit/raw/scout-calendar.md`. Cross-checked against
`.scratch/architecture-stability/issues/45-64` and the scout reports for tabs-buffers and frontmatter-writers.

## External sources

- FETCHED `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`.
  `rename` resolves both paths through the scope check, then calls `std::fs::rename(&resolved_old_path, &resolved_new_path)`
  directly. There is no existence check on the destination. `write_file_inner` opens with `write: true`, `truncate: !opts.append`,
  and `create` (default `true`), then calls `write_all`. No temp file, no rename.
- The scout's fetch of `doc.rust-lang.org/std/fs/fn.rename.html` (replaces an existing `to` on Unix) is consistent with this. I did not fetch it again.

## Findings (most severe first)

### calendar-1 (data-loss, medium confidence): a calendar write on an open, clean tab overwrites an external edit that landed in the last second

Path (READ):
- `updateNoteFrontmatter` takes the tab branch whenever a tab exists. The base is the tab's buffer, not the disk: `frontmatter-write.service.ts:112-115`.
- `next` is built from that base (`:124`). It is pushed into the tab (`:128`), then `saveFileByPath` (`:129`) writes the whole buffer: `editor.service.ts:161-168` (`writeTextFile(path, content)`).
- An external change reaches a clean tab only through `reloadExternallyChangedTabs`. That runs after the Rust watcher's 500 ms debounce plus the 300 ms TS debounce (`app-lifecycle.service.ts:480-493`).
- Once the calendar has written, `reloadExternallyChangedTabs` skips the reload because `diskContent === tab.savedContent` (`editor.service.ts:398`). The external version is never shown, and nothing remains on disk.

Scenario: a note is open in a background tab and is clean. A sync client (iCloud, Syncthing, git pull, or a second device) rewrites it. Within the next ~1 s the user drags that event in the calendar. The disk then holds the stale tab buffer plus the new `date`/`start`, and the external edit is silently gone. Without the calendar, a clean tab never saves, so this loss comes from the frontmatter writer's tab branch. Every caller of `updateNoteFrontmatter` with an open tab shares it (icon, lifecycle, bookmark migration). The calendar is the most frequent writer on an open note.

Known? Not filed. The tabs-buffers scout L3 covers dirty tabs only ("editor always wins"). This is the clean-tab case, where the editor would not have written.

### calendar-2 (corruption, high confidence on code): a calendar drag recreates a note deleted outside the app while its tab is open (Issue 59's invariant holds only for closed notes)

Path (READ):
- The note is deleted in Finder, by git or by a sync tool. No `applyPathChange` runs, so the tab stays open (the tab closes only at `path-change.service.ts:125`). `reloadExternallyChangedTabs` swallows the read failure (`editor.service.ts:391-393`).
- The calendar keeps showing the event until the throttled index bump: 2 s after an isolated event, up to 10 s during a burst (`tauri-listeners.service.ts:85-88`).
- A drag in that window calls `updateEventFields`, then `writeEvent` and `renameAndWrite` (`event-calendar.service.ts:809-815, 753`). `updateNoteFrontmatter` finds the tab (`frontmatter-write.service.ts:112`), takes the tab branch, and `saveFileByPath` calls `writeTextFile(path, content)` with no options (`editor.service.ts:168`). `create` defaults to true (FETCHED), so the file is recreated.
- The calendar settles the overlay and records a 'Move event' op (`event-calendar.service.ts:793-794`), and `notifyAfterSave` re-indexes the note.

Same mechanism with an external rename: the old path is recreated from the tab buffer, so the vault ends up with two copies.

Scenario: the user deletes `Standup.md` in Finder while it is open in a tab, then drags the Standup event within a few seconds. The note comes back, with no error. Issue 59's owner decision ("a note deleted outside the calendar stays deleted") is implemented only by `{ create: false }` in the closed-note branch (`frontmatter-write.service.ts:146-149`).

Known? Issue 59 (resolved) covers only in-app outside deletes, where the tab is closed first. The tabs-buffers scout L4 (the next keystroke recreates an externally deleted note) is the general form. Its calendar trigger, and the gap in Issue 59, are not filed.

### calendar-3 (data-loss, high confidence on mechanism, low likelihood): every calendar disk write truncates the note in place

Path (READ plus FETCHED):
- Closed note: `writeTextFile(path, next, { create: false })` (`frontmatter-write.service.ts:149`). The plugin opens with `truncate: true`, then `write_all` (FETCHED).
- Open note and delete-save: `editor.service.ts:168` (reached from `frontmatter-write.service.ts:129` and `event-calendar.service.ts:1037`).
- Link rewrite in other notes after a calendar title rename: `link-updater.service.ts:39`.
- The atomic helper exists in Rust (`src-tauri/src/utils/fs.rs:16-32`, temp file then rename). Only `create_note` uses it (`src-tauri/src/commands/vault.rs:899`).

Scenario: the app is killed, crashes or loses power between the truncate and the end of `write_all` during a drag. The note is left empty or partial: body and frontmatter both. The calendar keeps no backup. File history was not checked: if it snapshots only after a successful save, it holds the previous save's bytes.

Known? Not in `.scratch/architecture-stability/issues`. The same mechanism is reported by the tabs-buffers and editor-save scouts. Listed here because it is the calendar's only write primitive.

### calendar-4 (data-loss, low confidence on reachability): `createNow` holds the planned path without waiting for a calendar restore or rename already running there

Path (READ):
- `createNow` calls `holdPath(target.path, …)` inside `buildContent` (`event-calendar.service.ts:939`). `holdPath` only sets the tail. It never awaits the previous tail (`:438-445`).
- `duplicateEvent` uses `joinPath` for exactly this reason. Its comment says "keeps a restore in flight there from landing on the copy" (`:1001-1004`). `writeEvent` also joins its rename target (`:700-701`).
- An undo issued before the create claims its own path at its intake turn, and the create then runs concurrently with it on `CREATE_QUEUE_KEY` (`:481-504`, `:1300-1311`).
- The two disk legs are check-then-act, and both replace an existing target:
  - Restore: `restoreItem` calls `exists(restorePath)` and then `rename(trashPath, restorePath)` (`trash.service.ts:116, 126`). FETCHED: `std::fs::rename` with no destination check.
  - Create: Rust `create_note` checks `Path::exists` and then `write_atomic`, which renames its temp file over the target (`vault.rs:896-899`, `utils/fs.rs:27-31`).

Scenario: undo a delete of "Standup" (Cmd+Z, or the toast's Undo), and within milliseconds save a new "Standup" event. If the restore's rename lands between `create_note`'s exists check and its rename, the restored note (the user's real note, already removed from the Trash manifest) is replaced by the template. In the other order, the new note and the notes typed in the dialog are replaced by the restored note. A rename-with-title onto the planned name has the same gap: `renameItem`'s `exists` at `fs.service.ts:205`, then `rename` at `:211`.

Likelihood: very low. Both actions must land within one or two IPC round trips. Fixing it is local to the calendar (use `joinPath` as `duplicateEvent` does). This does not close the outside-actor variant (the Trash panel), which belongs to the trash and fs themes.

Known? Partly: the Issue 48 notes (`48-calendar-undo-during-in-flight-drag.md:23`) record "`createNow` uses `holdPath`, which does not wait for writes already queued on the path" as low, with no criterion. The overwrite consequence is not recorded.

### calendar-5 (stale-state, low likelihood): a failure after the disk move in `applyPathChange` makes the calendar report a failed rename or delete that actually happened

Path (READ):
- `applyPathChange` has no try/finally after `diskOp` (`path-change.service.ts:127-170`). Two calls can throw: `updateLinksAfterRename` calls `call('get_backlinks_v2')` outside any try (`link-updater.service.ts:27`), and `refreshTree`, which calls `loadDirectoryTree` and rethrows (`fs.service.ts:96-98`). Either throw skips `rename_note` (`:159`) and `forgetNote` (`:169`).
- Rename: `renameAndWrite` maps any error to "Could not rename the note … a note with that name may already exist" (`event-calendar.service.ts:727-731`). It runs before the remap and before the field write. The note is renamed on disk, the dialog's other field changes (date, time) are never written, the store keeps the old path (the own mark was consumed at `:626`, so `followPathChange` did nothing), and no op is recorded. Saving again re-plans against the new listing, and `rename(old, …)` then fails because `old` is gone.
- Delete: `deleteNow` rolls the overlay back and throws "Could not move the note to the Trash" (`:1044-1049`), while the note is already in the Trash (`trash.service.ts:71-83`). No delete op is recorded, so Cmd+Z cannot restore it (the Trash panel can). `forgetNote` is skipped, so the Rust entry survives unless the watcher removes it (INFER: the move goes into the hidden `.kokobrain` dir, and its source-side removal event was not traced).

Known? Not in `.scratch` issues. The path-change scout reports the missing try/finally. These are the calendar-visible consequences.

### calendar-6 (data-loss, minor, low likelihood): keystrokes typed during the save that runs before a calendar delete are lost

Path (READ): `deleteNow` awaits `saveFileByPath` (`event-calendar.service.ts:1037`). That captures `tab.content` and writes it, then `markSavedByPath(path, content)` sets only `savedContent` (`editor.store.svelte.ts:91-96`). Text typed during the IPC leaves the tab dirty. With no further await, `deleteItem` calls `applyPathChange`, which calls `closeTabsForDeletedPath` (`path-change.service.ts:125`, `editor.service.ts:356-366`), and that closes tabs without a dirty check. The Trash holds the bytes from before the typing.

Window: one write IPC. The delete is started from the calendar (popover, dialog or Delete key), so typing in the note at the same instant needs a second pane. Known? Not filed.

### calendar-7 (data-loss, minor, low likelihood): a calendar title rename's link rewrite drops typing in a note that links to the event

Path (READ): `updateLinksAfterRename` decides `isDirty` (`link-updater.service.ts:33-34`), reads disk for a clean tab (`:35`), awaits `writeTextFile` (`:39`), then calls `syncExternalContentToEditor(filePath, updatedContent, true, 'none')` (`:47`), which replaces both `content` and `savedContent` (`editor.store.svelte.ts:130-136`). Keystrokes in that tab between `:34` and `:47` are dropped from both the buffer and the disk. The trigger in this theme is `editEvent` with a title change (`event-calendar.service.ts:686-704`), or an undo or redo of an 'Edit event' that renames (`:1338`, `planTitle: true`).

Known? Noted by the tabs-buffers scout (its line 129). Not in `.scratch` issues.

### calendar-8 (stale-state, minor): a tab-branch save failure is reported as a failed move, but the move lands later

Path (READ): when the save fails and the user typed during it, the tab keeps `next` plus the typing, and nothing reverts it (`frontmatter-write.service.ts:131-134`). The calendar restores the prior overlay or drops it, and records no op (`event-calendar.service.ts:767-771`). The typing re-arms autosave (`editor.service.ts:224-227`), and `saveDirtyTabs` retries every 5 s (`:183-193`). Once the disk recovers, the drag reaches the note: the UI said it failed, and it cannot be undone. Not data loss. Known? Not filed (the comment at `frontmatter-write.service.ts:132` shows it is intended on the tab side, not that it was accepted for the calendar's rollback).

### calendar-9 (stale-state, minor): a create reported as failed after the note exists, so a retry duplicates it

Path (READ): `createFile` runs `create_note` (`fs.service.ts:129`), then `refreshTree` (`:138`) in the same try, and rethrows. `createTypedNote` maps any throw to `create-failed` (`type-definitions.service.ts:136-139`). `createNow` shows the error with no overlay and no op (`event-calendar.service.ts:943-947`), and the dialog keeps the form open (`EventDialog.svelte:145-158`). The user presses Create again and gets `Standup 1.md`. Needs `scan_vault` to fail once. Known? Not filed (fs-service theme).

### calendar-10 (stale-state, minor): the four documented "Known limitations" above `followPathChange` are not filed

`event-calendar.service.ts:611-624` (READ). They are (a) an op settled at `from` after a rename landed, (b) a rename tombstone showing the old event across a two-bump link rewrite, (c) `deleteNow`'s rollback dropping the moved `create` after an outside rename onto the deleted path (live: `prior` is captured at `:1040`, before the consumer runs), and (d) a refused write leaving the moved `create` at `to` with a state never written, for up to two bumps. In (d) the edit dialog prefills from that overlay, while `draftToPatch` writes only the fields that changed (`event-calendar-form.logic.ts:180-192`), so the disk can silently differ from what the user saw and accepted. None of these destroys data. The owner should file them or accept them.

## Cross-theme leads seen here, not counted as calendar findings

- Alias canonicalization on every rewrite (`type` to `_type`, `color` to `_color`): `properties.logic.ts` with `utils/frontmatter-aliases.ts:6-23`. The calendar triggers it, but the frontmatter-writers theme owns it.
- Trash manifest written whole from the in-memory list, non-atomically, with no serialization: `trash.service.ts:79, 83, 137-143, 275`. Two calendar deletes on different paths are not serialized with each other (they use per-path queues), so they can race there. It heals on the next trash op, unless the app quits first. Trash theme.
- Closed-note read-modify-write racing other frontmatter writers (icon, lifecycle, bookmark migration) and the link updater: `frontmatter-write.service.ts:91-93` says callers must serialize, but only the calendar queue does. Frontmatter-writers theme.
- `saveFileByPath` is not serialized against autosave: an older autosave IPC can land after the calendar's save (tabs-buffers L8b). The tab stays dirty, so the next save fixes it.

## Paths checked and found safe

- Queue primitives: `holdPath` / `claimPath` / `joinPath` / `enqueue` / `takeTurn` (`event-calendar.service.ts:437-504`). `drainEventCalendarWrites` terminates and covers intake, history and tails (`:511-521`).
- Field writes apply only the changed keys to a fresh base (disk, or the tab buffer), never the overlay state: `applyEventFields` (`event-calendar-event.logic.ts:302-323`), `draftToPatch` (`event-calendar-form.logic.ts:180-192`). A stale overlay cannot write stale fields back.
- Lossy-frontmatter refusal before any write: `frontmatter-write.service.ts:121-122`, and the template refusal at `event-calendar.service.ts:937`.
- Closed-note writes refuse to recreate a note deleted in-app (`frontmatter-write.service.ts:139-152`, Issue 59), recheck the vault (`:118, :140, :154`), and redo the edit when a tab opens during the read (`:144`).
- A delete saves a dirty tab first and refuses on save failure, so nothing is deleted (`event-calendar.service.ts:1037`). The Trash rename keeps the container after a successful move (`trash.service.ts:88-92`).
- Overlay rollbacks for a failed write and a failed delete restore the prior overlay (Issues 56 and 64, `:747, 767-771, 1040-1048`).
- An undo or redo precondition compares the shown state. The version clock comes from the Rust counter (`tauri-listeners.service.ts`, `latestVersion = payload.version`), so a user edit landing in the same refresh window as a calendar write moves the version by 2 or more and prunes the overlay. I found no stale overlay that lets an undo overwrite an edit made in the editor.
- History: `pushOp` clears redo (`event-calendar-history.logic.ts:43-46`). Outside deletes drop the path's ops (`event-calendar.service.ts:636`). The newest-by-path fallback in `findTrashEntry` (`:1074-1087`) therefore cannot pick another note's Trash entry through calendar ops.
- Undo of a 'Create event' moves the note to the Trash after saving it (`:1257-1276`). Body text added after the create is recoverable from the Trash and through Redo.
- Duplicate copies the open tab's unsaved buffer, joins the copy's path (`:989-1025`), and `create_note` refuses an existing target (`vault.rs:896-898`).
- Vault switch and window close: `switchVault` saves the tabs, drains, then opens (Issue 34). The close handler saves the tabs, then drains (`tauri-listeners.service.ts:53-71`). Queued tasks after `resetEventCalendar` fail at `requireEvent` or `isCurrent` (`event-calendar.service.ts:530-535, 703`).
- `planTitleChange` never targets an existing sibling (it compares case-insensitively and numbers taken names), so a calendar rename does not overwrite through `std::fs::rename` except in the TOCTOU gap (`event-calendar-form.logic.ts:207-224`, `fs.service.ts:205`).
- The edit dialog stays open on failure and keeps the form (`EventDialog.svelte:115-158`), so the user's typed notes are not dropped on a failed create.

## Not checked

- No test, build or app run. Nothing was reproduced.
- Whether file history keeps a pre-write copy (it would soften calendar-1 and calendar-3).
- Whether the Rust watcher reports the source side of a move into `.kokobrain/trash` as a deletion (calendar-5's ghost entry).
- `serializeProperties` value fidelity (quoting, number formats) on calendar rewrites, which belongs to the frontmatter-writers theme.

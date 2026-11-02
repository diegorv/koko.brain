# Scout report: calendar slice (event-calendar.service.ts and its write queue)

Read-only mapping. No repo file was edited, no build or test was run.
Labels: READ = read in source. FETCHED = external source fetched during this audit.
INFER = reasoned from the code, not run. Line numbers are as read on 2026-11-02.

## 0. Scope and sources

Read in full: `src/lib/features/event-calendar/event-calendar.service.ts` (1580 lines),
`event-calendar.store.svelte.ts`, `event-calendar-history.logic.ts`, the calendar
parts of `event-calendar-event.logic.ts` (`mergePending` 437, `prunePending` 490),
`event-calendar-form.logic.ts` (`planTitleChange` 207-224).

Read for the write path it depends on: `core/frontmatter/frontmatter-write.service.ts`,
`core/filesystem/fs.service.ts` (create/delete/rename), `core/filesystem/path-change.service.ts`,
`core/filesystem/link-updater.service.ts`, `core/trash/trash.service.ts`, `core/trash/trash.logic.ts`,
`core/trash/trash.store.svelte.ts`, `core/editor/editor.service.ts` (save, close tabs, sync),
`core/editor/editor.store.svelte.ts` (`markSavedByPath` 91-96), `core/vault/vault.service.ts`
(`switchVault` 18-22), `app/lifecycle/app-lifecycle.service.ts` (initializeVault 133-250,
teardownVault 533-634), `features/type-definitions/type-definitions.service.ts` (`createTypedNote` 115-140),
`core/frontmatter/properties.logic.ts` (parse, serialize, lossy detection), `utils/frontmatter-aliases.ts`,
Rust `src-tauri/src/commands/vault.rs` (`create_note` 888-914, `remove_note_from_index` 938),
`src-tauri/src/utils/fs.rs` (`write_atomic` 16-32), `src-tauri/capabilities/default.json` (permission names only).

Callers of the calendar write API (READ): `EventTimeGrid.svelte:194` (moveEvent / resizeEvent),
`event-calendar-day-drag.svelte.ts:136` (moveEventToDay), `EventDialog.svelte:124,151,171,180`
(editEvent, createEvent, deleteEventFromUi, duplicateEventFromUi), `EventPopover.svelte:130,139`,
`EventCalendarView.svelte:80,86,89`, `app/commands.ts:186,194` (undo/redo keys and palette),
`app/boot.ts:37` (`registerWriteBarrier('event-calendar', drainEventCalendarWrites)`),
`app/lifecycle/app-lifecycle.service.ts:145` (resetEventCalendar in initializeVault), `:186`
(drain before teardown), `:250` (path-change consumer registration), `:634` (reset in teardown).

External sources FETCHED:
- `tauri-apps/plugins-workspace` `plugins/fs/src/commands.rs` (raw, branch v2). The fetched summary
  of `write_file_inner` says: the OpenOptions for a write with an options header are `write: true`,
  `create: opts.create`, `truncate: !opts.append`, and the file is opened at its own resolved path
  (`OpenOptions::from(...).open(&*resolved_path_handle)`). With no header: `truncate: true`,
  `create: true`. The write is `file_handle.write_all(&data)`. No temp file, no rename. Conclusion:
  `writeTextFile` truncates the existing file and writes in place (non-atomic).
- `tauri-apps/plugins-workspace` `plugins/fs/guest-js/index.ts` (raw). `WriteFileOptions.create`
  doc: "defaults to `true`". `writeTextFile` forwards options unchanged, so a call without options
  creates the file if missing.
- `doc.rust-lang.org/std/fs/fn.rename.html`. Quoted: "replacing the original file if `to` already
  exists". Unix: "`to` may not be a directory" when `from` is a file. Conclusion: a rename over an
  existing file silently replaces it on Unix.
- NOT fetched: the plugin-fs `rename` command body. INFER that it is `std::fs::rename`.
- NOT checked: the fs scope globs in `src-tauri/capabilities/default.json` (only permission names were
  grepped), so path-scope limits on plugin-fs calls are unknown.

## 1. Entry points and call chains

Notation: `svc` = event-calendar.service.ts. Each step is file:line.

A. Move / resize / day-drag (existing event, closed or open note)
- UI `EventTimeGrid.svelte:194` or `event-calendar-day-drag.svelte.ts:136`
  -> `moveEvent` svc:824 / `resizeEvent` svc:845 / `moveEventToDay` svc:836
  -> `updateEventFields` svc:809 -> `enqueue(path, ...)` svc:500
  -> (task at its turn) `requireEvent` svc:530 -> `writeEvent` svc:674
  -> (no rename) `renameAndWrite(path, null, ...)` svc:715
  -> `putPending({kind:'update'})` store:131 (overlay before disk)
  -> `updateNoteFrontmatter(target, mutate)` frontmatter-write:95
     - tab open: `syncExternalContentToEditor` editor.service:70 (content only),
       `saveFileByPath` editor.service:161 -> `writeTextFile` editor.service:168
       -> `markSavedByPath` store:91 -> `notifyAfterSave` (editor.hooks)
     - tab closed: `readTextFile` frontmatter-write:117 -> `exists` :139 ->
       `writeTextFile(path, next, {create:false})` :149 -> `notifyAfterSave` :157
  -> `settlePending` store:143, `record({kind:'update'})` svc:656-ish (see `record` at svc:656).

B. Title edit / rename (edit dialog)
- `EventDialog.svelte:124` -> `editEvent` svc:862 -> `enqueue` -> `writeEvent` svc:674
  (planTitle: `readDir(parent)` svc:~687, `planTitleChange` event-calendar-form.logic:207)
  -> if rename: `renamedPath` + `joinPath(target)` svc:701 (awaits target queue tail, holds it)
  -> `renameAndWrite(path, {name,path}, ...)` svc:715
     -> `asOwnPathChange(path, target, renameItem)` svc:577 / :718-731
        -> `renameItem` fs.service:201 -> `exists(newPath)` fs.service:205 -> `applyPathChange`
           path-change:117 -> `diskOp = rename(oldPath,newPath)` fs.service:211 (plugin-fs)
           -> `updateTabAfterRenameOrMove` path-change:132 (tab moved, dirty content kept)
           -> consumers incl. `followPathChange` svc:625 (skipped: own mark, takeOwnPathChange svc:588)
           -> `updateLinksAfterRename` path-change:149 -> link-updater:21 (writes OTHER notes)
           -> `refreshTree` path-change:153 -> `rename_note` IPC path-change:159 (Rust re-key)
           -> `forgetNote(from)` path-change:169 (Rust removal sweep, fire and forget)
     -> `remapPath(path, target, version)` store:197 (no `outside` arg)
     -> `putPending(create @target)` svc:~751 then `updateNoteFrontmatter(target, ...)` svc:753
  -> `settlePending(target)` svc:~792, `record` (svc:656)

C. Create (type sidebar "New Event" equivalent)
- `EventDialog.svelte:151` -> `createEvent` svc:914 -> `enqueue(CREATE_QUEUE_KEY)` svc:358/500
  -> `createNow` svc:926 -> `createTypedNote` type-definitions:115
     -> `resolveTypedNoteTarget`, `call('create_folder')` type-defs:120
     -> `loadNoteTemplate` type-defs:125, `buildContent` type-defs:133 (calendar callback svc:935-945:
        `detectLossyFrontmatter` refuses template; `holdPath(target.path)` svc:939 (planned path))
     -> `createFile(dir, name, content)` fs.service:119 -> `readDir` -> `generateUniqueName`
        -> `call('create_note')` fs.service:129 -> Rust `create_note` vault.rs:888
           (exists check :897, `write_atomic` :899 = temp file + rename)
        -> `markRecentSave` -> `applyNoteChange(fs)` (fire and forget) -> `refreshTree` fs.service:138
  -> `showCreated` svc:897 (overlay settled with version clock, `record('Create event')`) ; `release()` in finally svc:~958

D. Duplicate
- `EventDialog.svelte:180` / `EventPopover.svelte:139` -> `duplicateEventFromUi` svc:1485 -> `duplicateEvent` svc:989
  -> `enqueue(path)`; base = open tab content (svc:994) else `readTextFile` (svc:995)
  -> `readDir(parent)` svc:1003 -> `joinPath(parent/planned)` svc:1004
  -> `createFile(parent, "<title> (copy).md", content)` svc:1006 (may pick another name, see lead)
  -> `showCreated(..., 'Duplicate event')` ; `release()`.

E. Delete
- `EventPopover.svelte:130` / `EventDialog.svelte:171` / `EventCalendarView.svelte:80` ->
  `deleteEventFromUi` svc:1449 -> `deleteEvent` svc:1065 -> `enqueue(path)` -> `deleteNow` svc:1034:
  1. `saveFileByPath(path)` svc:1037 (no-op when not dirty; else writeTextFile editor.service:168)
  2. `prior = pendingWrite(path)` svc:1040; `putPending({kind:'delete', settled:false})` svc:1041
  3. `asOwnPathChange(path, null, deleteItem)` svc:1043 -> `deleteItem` fs.service:167
     -> `applyPathChange` path-change:117 -> `closeTabsForDeletedPath` path-change:125
        (editor.service:356, closes tabs WITHOUT dirty check) -> `moveToTrash` (trash:49 via diskOp)
        -> `setFileTree` removal path-change:131 -> consumers (followPathChange returns early on own mark)
        -> `refreshTree` path-change:153 -> `forgetNote` path-change:169
  4. on throw: restore `prior` or `dropPending(path)`, throw 'Could not move the note to the Trash' svc:1044-1049
  5. on success: `settlePending(path)` svc:1051; `trashStore.items[0]` gives trashId svc:1052-1054
  -> `record({kind:'delete', trashId})` svc:1068

F. Undo / redo / restore
- `commands.ts:186,194` or `EventCalendarView.svelte:86,89` -> `undoEventChangeFromUi` svc:1530 ->
  `applyEventChangeFromUi` svc:1544 -> `undoEventChange` svc:1359 -> `applyHistory` svc:1300 (intake turn,
  waits for earlier writes via `earlierWrites`) -> `applyHistoryNow` svc:1318 (takes op, `setHistory`):
  - update op: `claimPath(op.path)` svc:1334+; checks `exists` + `sameEventState` ; `writeEvent(... record:false)` svc:1338
  - create/delete op: `applyNoteOp` svc:1257 -> undo of create or redo of delete = `deleteNow` svc:1034 ;
    undo of delete or redo of create = `restoreNow` svc:1154.
- Toast Undo after delete: `deleteEventFromUi` svc:1449 `onClick` -> `undoDeleteEvent` svc:1245 -> `restoreNow` with `retire`.
- `restoreNow` svc:1154: `findTrashEntry` svc:1074 -> `restoreItem` trash:110 (rename trash -> original, saveManifest, index)
  -> `exists(restored)` only if an outside delete was recorded during the restore (`restoresInFlight` svc:385).

G. Outside changes (file explorer, tree drag)
- `applyPathChange` (any owner) -> `registerPathChangeConsumer` consumer `followPathChange` svc:625
  (wired by app-lifecycle:250 via `registerEventCalendarPathChangeConsumer` svc:651).
  Synchronous, after diskOp, before link rewrite. Store effects: `remapPath` store:197 (rename/move),
  `dropPath` history-logic:105 + `delete` tombstone store:222 (delete).
- Outside CREATE sends no notice (no consumer for creates). INFER from event-calendar-form/store docs.

H. Vault switch and teardown
- `switchVault` vault.service:18: `saveAllDirtyTabs` -> `drainPendingWrites` (calendar barrier, boot.ts:37)
  -> `vaultStore.open`. Only caller of `vaultStore.open` (grep READ).
- `initializeVault` app-lifecycle:145 `resetEventCalendar()` runs unconditionally at entry; drain at :186 only
  when a previous vault is initialized. `teardownVault` app-lifecycle:634 `resetEventCalendar()`.

## 2. Every disk write, delete, rename in the slice

Columns: operation / call site / mechanism / preconditions / error handling / store on success / store on failure.

1. Frontmatter rewrite, open note: `attempt` frontmatter-write:127-137 -> `saveFileByPath` editor.service:161-177
   -> `writeTextFile(path, content)` editor.service:168 (no create option, so default create=true; truncate in place, FETCHED).
   Preconditions: lossy check (`detectLossyFrontmatter`, frontmatter-write:121-122), vault captured at entry (:99), tab present.
   Errors: `saveFileByPath` catches, toasts, returns false -> `save-failed` (frontmatter-write:129-134). Calendar rolls back.
   Success: `markSavedByPath` store:91 (savedContent = written string). Store: overlay settled svc:~792.
   Failure: content reverted to base only if tab content still equals `next` (frontmatter-write:133). Calendar overlay rollback via `prior` (svc:~767-781).

2. Frontmatter rewrite, closed note: `readTextFile` frontmatter-write:117 -> `exists` :139 -> `writeTextFile(path, next, {create:false})`
   frontmatter-write:149 (truncate in place, FETCHED; `create:false` only blocks recreation).
   Precondition: no tab at check (:144 restarts on tab), vault unchanged (:140, :154).
   Errors: write failure -> `missing` if file gone, else rethrow (:150-152). No backup.
   Success: `notifyAfterSave` frontmatter-write:157 (markRecentSave, indexes, after-save hooks).
   Concurrency: no per-path lock shared with other callers (see Concurrency).

3. Rename of event note: `renameItem` fs.service:201-217 -> `exists(newPath)` :205 -> plugin-fs `rename` :211 (INFER std rename, FETCHED semantics: replaces existing target on Unix).
   Precondition: none beyond the exists check (TOCTOU, see leads).
   Errors: `renameAndWrite` svc:729-731 rethrows "Could not rename ... may already exist", no store change.
   Success: `remapPath` store:197 + `remapPath` view store, `updateTabAfterRenameOrMove` path-change:132, link rewrites (path-change:149), `refreshTree`, `rename_note` IPC (path-change:159), `forgetNote(from)` (path-change:169).
   Failure after diskOp: `applyPathChange` has NO try/finally (path-change:117-171). A throw in `updateLinksAfterRename` (link-updater:27 `call('get_backlinks_v2')` is not inside try) or `refreshTree` (path-change:153) skips `rename_note` and `forgetNote`, and the calendar throws the "Could not rename" error while the disk file is already renamed.

4. Link rewrite in OTHER notes (triggered by calendar rename): `updateLinksAfterRename` link-updater:21-60:
   `call('get_backlinks_v2')` :27; `isDirty` from tab :34; `readTextFile` :35 for clean tabs; `writeTextFile(filePath, updatedContent)` :39 (non-atomic, truncate);
   `syncExternalContentToEditor(..., true, 'none')` :47 (replaces tab content with disk content plus link change).
   Errors: per-file `Promise.allSettled`, logged :51-56. Success: `applyNoteChange(save)` fire and forget :49.

5. Create: `createNow` svc:926 -> `createTypedNote` type-definitions:115-140 -> `create_folder` IPC (type-defs:120) -> `createFile` fs.service:119 -> `create_note` IPC (fs.service:129) -> Rust vault.rs:888: exists check (:897) then `write_atomic` (utils/fs.rs:16-32: temp file then rename; temp file not removed if the write itself fails, only if rename fails).
   Errors: `createFile` catch logs and rethrows (fs.service:~143); `createTypedNote` maps any throw to 'create-failed' (type-defs:136-139). The `refreshTree` at fs.service:138 is inside the same try, so a failed refresh after a successful create_note is reported as create failure.
   Success: `showCreated` svc:897 overlay + record. Failure: no overlay, no op, `release()` in catch svc:~955.

6. Duplicate: `createFile` (fs.service:119) with content from tab or disk. Same error mapping: svc:1009-1011 -> 'create-failed'.

7. Delete: `saveFileByPath` (editor.service:168 write, as in 1) then `deleteItem` fs.service:167 -> `applyPathChange` -> `closeTabsForDeletedPath` path-change:125 (editor.service:356-366, no dirty check) -> `moveToTrash` trash:49:
   - `mkdir` trash dirs (:59-68), `mkdir(itemDir)` :68, `rename(absolutePath, trashPath)` :71 (same-volume rename, READ).
   - `saveManifest(vaultPath, [item, ...trashStore.items])` :79 -> `writeTextFile(manifestPath, ...)` trash:275 (non-atomic, truncate). Failure logged, not thrown (:80-82).
   - `trashStore.addItem(item)` :83 (prepends, trash.store:29).
   - Errors: `catch` :87-95: container removed only if the file was not renamed (:91).
   Success: `settlePending(path)` svc:1051, `record(delete)` svc:1068 with trashId from `trashStore.items[0]` (svc:1052-1054).
   Failure: overlay restored (`prior`) or dropped (svc:1044-1049). Tabs already closed (path-change:125). Note still on disk.
   Note: a throw in `refreshTree` (path-change:153) after the successful rename makes `deleteItem` reject, so the calendar reports a failed delete while the note is in the Trash and no delete op is recorded. `forgetNote` is skipped, so the Rust index keeps the entry (INFER).

8. Restore: `restoreItem` trash:110-180:
   - `exists(restorePath)` :116 then `findUniqueRestorePath` :117 (suffixes "(restored)").
   - `mkdir(parentDir)` :122-124, `rename(trashPath, restorePath)` :126 (replaces an existing target on Unix, FETCHED; TOCTOU vs :116).
   - `remove(itemDir, recursive)` :130 (non-fatal). `saveManifest(updatedItems)` :139 (non-atomic), then `trashStore.removeItem` :143.
   - Post-rename failures logged, not thrown (:148-172). `indexRestoredNotes` trash:243 -> `applyNoteChange(restore)`.
   Errors before the rename throw; calendar maps to 'restore-failed' (svc:1172). State on failure: store untouched.

9. Trash manifest load: `loadTrash` trash:24-43: `readTextFile` (:33), `parseTrashManifest` (trash.logic:58-66, returns [] on any JSON error and drops invalid entries), catch sets `setItems([])` (:39).
   Called from app-lifecycle:288 (step 3 of initializeVault) and TrashSection.svelte:19.

10. Permanent delete / empty: `deletePermanently` trash:185-200 and `emptyTrash` trash:205-222 (not calendar paths; listed for completeness; they call `saveManifest` from the in-memory list).

Store effects summary (calendar):
- putPending / settlePending / dropPending / remapPath / setHistory (store:131-229), all synchronous, all followed by `recompute()`.
- Success: overlay settles with a version clock (`settledAtVersion` = `vaultIndexVersion`), pruned by `prunePending` (event-calendar-event.logic:490) when the snapshot catches up or after 2 bumps.
- Failure: `prior` overlay restored when it was captured (svc:747-781 for updates, svc:1040-1049 for deletes), otherwise dropped. Undo op for the failed write is refused (`refuseOp`) for undo paths, not recorded for normal writes.

## 3. Concurrency

Queues and tokens (READ, file:line):
- `writeTails: Map<path, Promise>` svc:352. `holdPath` svc:438 (tail = allSettled(previous, new); delete when settled and still tail).
- `claimPath` svc:470 (chain after tail). `joinPath` svc:455 (hold target's tail; await previous tail, return release). Used by `writeEvent` target (svc:701) and `duplicateEvent` (svc:1004).
- `CREATE_QUEUE_KEY = '\0create'` svc:358: all creates serialize on one key.
- `enqueue` svc:500: if `intakeDepth === 0` claims immediately; else `takeTurn` svc:481 (waits for intake and then claims).
- `intake` svc:402 and `intakeDepth` svc:405: undo/redo turns; writes that start while a turn is outstanding queue behind it.
- `historyTail` svc:394: undo/redo serialize with each other. `applyHistory` svc:1300 snapshots `writeTails` after the intake (`earlierWrites`) so an undo waits for writes queued before it.
- `drainEventCalendarWrites` svc:511: loops until intake, history and writeTails are all idle. Used by boot.ts:37 barrier, switchVault (via barrier), app-lifecycle:186, tauri-listeners:66.
- `writeGeneration` svc:388, `resetEventCalendar` svc:333 bumps it: queued tasks check `isCurrent()` before store changes but still run their disk writes.
- `loadToken` svc:49, `taskLoadToken` svc:55: latest-wins for `loadEvents` svc:74 and `loadCalendarTasks` svc:114.
- `ownPathChanges` Set of `{from,to}` marks svc:376: set in `asOwnPathChange` svc:577 (removed in finally), consumed by `takeOwnPathChange` svc:588 in `followPathChange` svc:626.
- `restoresInFlight` svc:385: sets collect outside deletes during a restore; `restoreNow` checks `exists` svc:~1163-1168.
- `deleteToasts` svc:58: Undo closure checks `isCurrent()` svc:1464-ish.
- Timers: clock `setInterval` 30 s svc:46, svc:304-330 (ref-counted; window focus and visibilitychange listeners). Lookup memo `lookupMemo` svc:176 (no timer).
- Store-side timers: none in the calendar store. Editor autosave timers (2 s body, 500 ms frontmatter, 5 s retry) are NOT in the calendar queue (editor.service.ts:~178-200, schedule in syncExternalContentToEditor editor.service:70-90).

Interleavings that the design allows (INFER from code):
1. Outside (explorer) change to a path while a calendar write on it is in flight: serialized only through `followPathChange` store remap; the disk write may land on the old path (documented, svc:611-624).
2. Calendar writes on a closed note vs. other frontmatter writers (`frontmatter-icon.service.ts:36`, `properties/lifecycle.service.ts:34,50`, `properties/bookmark-migration.service.ts:80`): not on the calendar queue. `updateNoteFrontmatter` doc (frontmatter-write:91-93) says callers must serialize per path; only calendar does.
3. Editor autosave of a tab whose path the calendar is writing: the calendar's tab branch and autosave both call `saveFileByPath`; autosave is not on the queue.
4. Trash manifest: every trash op rewrites the whole manifest from the in-memory list (trash:79, :139) with non-atomic writes (trash:275). Two ops overlapping can interleave bytes or drop an entry (the in-memory list is updated after the await, trash:83 and :143).
5. Vault switch: `switchVault` (vault.service:18) drains before `vaultStore.open`. `initializeVault` calls `resetEventCalendar` (app-lifecycle:145) before the drain at :186, but only for a previous vault. A write started after the drain and before `vaultStore.open` cannot exist in the normal path (INFER: no await between drain resolution and open).

Deadlock check (READ and INFER): `joinPath` (svc:455-462) awaits a previous tail while holding its own. Two rename-with-title-change writes that each join the other's target could wait on each other. I traced this and did not find a reachable case: `planTitleChange` (event-calendar-form:207-224) numbers any name that is taken at plan time, so a rename cannot target a sibling that still exists. Not reproduced.

## 4. Coverage of calendar issues 45-64 (.scratch/architecture-stability/issues/)

Status values are as written in the issue files (READ).

| Issue | Race | Status in file | Where the fix is (READ) |
|---|---|---|---|
| 45 | write / outside rename during own rename tail | resolved | `writeEvent` joinPath svc:701 |
| 46 | ownPathChanges keyed by path | resolved | `OwnPathChange` objects svc:361-376, `takeOwnPathChange` svc:588 |
| 47 | write before created note shown | resolved | `createNow` holdPath svc:939, release in finally |
| 48 | Cmd+Z during in-flight drag | resolved | intake and `earlierWrites` svc:402, svc:1300 |
| 49 | outside delete racing restore | resolved | `restoresInFlight` svc:385, `restoreNow` exists check |
| 56 | failed write drops earlier overlay (update) | resolved | `prior` svc:747, restore svc:767-781 |
| 58 | outside rename onto a delete's tail | resolved | store `remapPath` overwritable svc-store:206 |
| 59 | field write after outside delete recreates note | resolved | `writeTextFile(create:false)` frontmatter-write:149 -> 'missing' |
| 60 | outside create on rename tombstone | resolved | store `remapPath` states on tombstone store:216-222 |
| 61 | outside rename of titled duplicate | resolved | `titled` flag in store `remapPath` store:210 |
| 64 | failed delete drops earlier overlay | resolved | `deleteNow` prior svc:1040, restore svc:1044-1049 |

Not in any issue (READ): the four "Known limitations" in the comment above `followPathChange`
(svc:611-624). Those are: (a) a write that landed on disk before a rename and had not returned settles
its op at `from`; (b) a rename's `from` tombstone is clocked before the link rewrite and `rename_note`,
so a multi-bump rewrite shows the old event; (c) if `deleteItem` throws after an outside rename landed on
the deleted path, the rollback drops the moved create; (d) a field write refused after an outside rename
leaves a create at `to` with the refused state until two bumps pass. None is filed. Item (c) is still
live: `prior` is captured before the outside change arrives (svc:1040), so the rollback restores the
pre-delete overlay, not the moved note.

Also noted but unfiled (READ, Issue 48 notes): `createNow` holds the planned path, but `createFile` may
pick another unique name on a same-instant clash (type-definitions:131-133, fs.service:119-141), and
`createNow` uses `holdPath` where `duplicateEvent` uses `joinPath`.

Related issues that are NOT the calendar write path: 38 (`_type` keys disappear in the in-memory
collection record after an edit; a read-side projection, not the file rewrite), 41 (anchored wikilink
empties parsed frontmatter), 42 (meta-bind writers drop frontmatter when it does not parse; the calendar
already refuses via `detectLossyFrontmatter`, frontmatter-write:121-122), 44. The word "manifest" in the
issues folder refers to Cargo or package manifests, not the trash manifest: nothing in the issues covers
the trash manifest. Nothing in the issues covers the non-atomic writes, the link-updater dirty window,
or `applyPathChange` without try/finally.

## 5. Leads (hypotheses, ranked by data-loss impact)

Confidence: H = mechanism read and clear; M = plausible but depends on a condition I did not run;
L = contrived or needs unlikely timing.

L1 (H mechanism, L-M likelihood, high severity): Non-atomic in-place writes for note content.
Sites: frontmatter-write.service.ts:149 (calendar and all frontmatter writers, closed notes),
editor.service.ts:168 (every tab save, including the calendar's delete save at svc:1037),
link-updater.service.ts:39 (rewrites of other notes), trash.service.ts:275 (manifest).
Plugin behavior FETCHED: truncate on open, then write_all. Rust `write_atomic` exists
(utils/fs.rs:16-32) and is used by `create_note` (vault.rs:899) but not by these writers.
Scenario: power loss or app kill, or ENOSPC, during a calendar drag of a closed note. The file is
left truncated or partial. The calendar has no backup; the file-history feature may hold a snapshot
(not checked).

L2 (H mechanism, M likelihood, medium): Calendar write lands after the UI reported failure (tab branch).
frontmatter-write.service.ts:127-137 and svc:767. If `saveFileByPath` fails and the user has typed into
the same note meanwhile, the tab content no longer equals `next`, so it is not reverted (frontmatter-write:133).
The calendar rolls back its overlay and records no op, but the tab still holds the calendar's change,
and the editor retries failed saves every 5 s (editor.service.ts:178-190). Scenario: disk full or
permission error during a drag; user keeps typing in the note; the disk recovers; the drag appears in
the note although the UI said it failed and it was never undoable.

L3 (M mechanism, low-M likelihood, high severity): Trash manifest overwritten from in-memory state.
trash.service.ts:79 and :139 write `[item, ...trashStore.items]`. If `loadTrash` failed (trash:37-40
sets []) or the manifest was unparseable (trash.logic.ts:58-66 returns [] on any JSON error and filters
invalid entries at :62), the in-memory list is short and the next move or restore writes a manifest that
drops all earlier entries. Their files stay in `.kokobrain/trash/items/` and are unreachable from the UI;
`emptyTrash` would delete them. Scenario: the app is killed while `saveManifest` (trash:275) is writing,
so the manifest is truncated; next launch loads []; the user deletes an event; the old Trash entries are
gone from the manifest.

L4 (M mechanism, low likelihood, high severity): Concurrent trash operations drop a manifest entry.
Each op computes the manifest from the store at call time and writes it non-atomically; `addItem` runs after
the await (trash.service.ts:79 before :83). Scenario: a calendar delete of event A and an explorer delete of
note B start within the same few ms. B's manifest write (from a store without A) lands after A's, so A's
entry is missing. A's file stays in the items folder, unreachable.

L5 (H mechanism, L likelihood, high severity): Rename silently overwrites a file created in the check-then-act gap.
fs.service.ts:205 `exists(newPath)` then :211 `rename(oldPath,newPath)`. std::fs::rename replaces an existing
target on Unix (FETCHED). Calendar titles are planned against a readDir snapshot (svc:~687,
event-calendar-form:207-224), and the existence check is in `renameItem`, so the window is one IPC
round trip. Same pattern in restore: trash.service.ts:116 then :126 (restore rename over a file created in the gap).
Scenario: a note with the target name is created in the explorer or by sync at the same instant as a calendar
title change; the new file is replaced, and nothing is in the Trash.

L6 (H mechanism, low likelihood, medium severity): `applyPathChange` has no try/finally after `diskOp`.
path-change.service.ts:127-170. (a) A throw in `updateLinksAfterRename` (link-updater.service.ts:27 `call`
is not in try) at path-change:149 skips `rename_note` (:159), `forgetNote` (:169), and the store remap
(the consumer already ran, but the calendar's own mark makes it skip). The calendar then shows
"Could not rename ..." (svc:729-731) while the note is renamed on disk. The store keeps the event at the
old path and the Rust index stays on the old key. (b) A throw in `refreshTree` (path-change:153) after a
delete makes `deleteNow` roll back the overlay and show "Could not move the note to the Trash" (svc:1044-1049)
while the note is in the Trash, with no delete op recorded, so Cmd+Z cannot undo it (Trash panel can).

L7 (H mechanism, low likelihood, medium severity): Create reported as failed, then retried, duplicates the note.
fs.service.ts:129 creates the note, then `refreshTree` at :138 is in the same try (`createFile` catch at
fs.service:~143 rethrows). `createTypedNote` maps any throw to 'create-failed' (type-definitions.service.ts:136-139),
and `createNow` / `duplicateEvent` show the error with no overlay and no op (svc:926-960, svc:1009-1011).
Scenario: `scan_vault` fails once after a successful create. The note exists unseen. The user retries; the
second create gets "Standup 1.md".

L8 (H mechanism, low likelihood, low-medium severity): Keystrokes lost when a dirty tab is deleted.
svc:1037 `saveFileByPath` awaits `writeTextFile` (editor.service.ts:168). Edits typed during that IPC leave the tab
dirty after `markSavedByPath(path, content)` (editor.store.svelte.ts:91-96 sets only savedContent to the
snapshot). `deleteItem` then closes the tab without a dirty check (editor.service.ts:356-366 via path-change:125).
Scenario: user types into the event note while a delete is in progress (for example, the delete starts from the
dialog while the body is focused). The typed text is lost and the Trash holds the bytes from before the typing.

L9 (H mechanism, low likelihood, medium severity): Link rewrite clobbers typing in a clean tab.
link-updater.service.ts:34-35 decides `isDirty` and reads the disk content, then :39 writes and :47 replaces
the tab content with the disk-based rewrite. Keystrokes between the check and :47 (two IPC awaits) are lost from
both tab and disk. Trigger: a calendar title rename of an event that a clean open note links to.

L10 (H mechanism, M by design, medium): Every frontmatter rewrite renames alias keys in the user's note.
properties.logic.ts:302 canonicalizes keys on parse, `dedupeCanonicalKeys` (:488-494) and `serializeProperties`
(:569-584) write the canonical keys. ALIAS_MAP (utils/frontmatter-aliases.ts) maps type->_type, color->_color,
favorite->_favorite, icon->_icon, order->_order, view, template, visible, archived, sort, and others.
`properties.logic.test.ts:495-501` pins this ("canonicalizes alias keys on write"). So a calendar move of an event
with `type: Event` or `color: red` rewrites the key. This looks intended by the tests, but it is a visible change
to user frontmatter with no user request. Owner decision: confirm the behavior is wanted.

L11 (H mechanism, low severity): Whole-block re-serialization changes line endings. properties.logic.ts:615-622
writes `\n`. A CRLF note's frontmatter becomes LF on any calendar write. The body is preserved. Low severity.

L12 (H mechanism, L likelihood, high severity if hit): Closed-note read-modify-write races with other writers.
frontmatter-write.service.ts:117-149 has no per-path lock. Calendar (queue) and icon (frontmatter-icon.service.ts:36),
properties lifecycle (lifecycle.service.ts:50), and bookmark migration (bookmark-migration.service.ts:80) can
interleave on the same closed note. The second write overwrites the first, silently. Window is about two IPC calls.

L13 (M mechanism, L likelihood, path-safety): Trash restore trusts manifest paths and ids.
trash.logic.ts:95-105 checks types only. `restorePath = vault + '/' + item.originalPath` (trash.service.ts:113), and
`remove(getTrashItemDir(id), recursive)` at trash.service.ts:130 uses the unvalidated `id` (trash.logic.ts:31-33).
A tampered or synced manifest with `..` segments could redirect a restore or a recursive remove. Needs a crafted
manifest. Capability scope not checked, so the actual reach is unknown.

L14 (documented, not filed): the four Known-limitations items at svc:611-624 (listed in section 4). Item (d)
(refused write leaves a state that never reached disk for up to two bumps) is visible to users. Owner: file or accept.

Checked, no finding: `joinPath` crossing deadlock (section 3); undo/redo intake ordering (svc:1300-1330) and
`restoreNow` tombstone logic (svc:1154-1225) read consistent with issues 48, 49, 58-61; `drainEventCalendarWrites`
loop (svc:511-521) terminates when intake and writeTails are empty.

## 6. Not checked

- No test or build was run. Nothing was reproduced in the running app.
- The fs capability scopes (src-tauri/capabilities/default.json) and whether plugin-fs enforces them for these calls.
- The plugin-fs `rename` command body (assumed `std::fs::rename`).
- Whether the file-history feature snapshots notes on save (it would soften L1).
- `notifyAfterSave` internals, the watcher's handling of the calendar's own closed-note writes, and `markRecentSave` timing.
- Rust `write_atomic` leaves a `.tmp-` file behind when the write itself fails (utils/fs.rs:27 does not clean it up, only the rename failure at :29). Minor, not calendar-specific.
- Editor autosave timers and `saveDirtyTabs` retry behavior were read only partially (editor.service.ts:178-200).

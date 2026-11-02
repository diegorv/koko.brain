# Adversarial verification: calendar theme

Read-only. Nothing built or run. READ = read in source at the cited line. FETCHED = external source fetched for this pass. INFER = reasoned, not run.

## External source

- FETCHED `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`. `write_file_inner` opens the target directly with `write: true`, `truncate: !opts.append`, `create: opts.create` (serde default `default_create_value() -> true`), and when no options header is sent falls back to `truncate: true, create: true`; then `write_all`. No temp file, no rename. `rename` is `std::fs::rename(&resolved_old_path, &resolved_new_path)` with no destination check.

## Verdicts

### calendar-1: CONFIRMED, data-loss (low likelihood)

Tried to refute: looked for an mtime/disk check in the tab branch, a reload before a calendar write, and a file-history copy of the external version.
- READ `frontmatter-write.service.ts:112-115`: an open tab (any tab, background included) makes `base = tab.content`. No disk read.
- READ `:124-129`: `next` built from that base, pushed into the tab, `saveFileByPath` writes it. `editor.service.ts:161-168` writes `tab.content` with `writeTextFile(path, content)`, no comparison with disk.
- READ the only path that refreshes a clean tab from disk is `reloadExternallyChangedTabs` (`editor.service.ts:375-404`), called from `runWatcherBatch` (`app/lifecycle/app-lifecycle.service.ts:481-493`) behind the Rust 500 ms trailing debounce (`src-tauri/src/vault/watcher.rs:34`) and the TS 300 ms debounce (`:489-493`). `serializeWithRerun` can delay it more while an earlier batch's `rebuildAllIndexes` runs.
- READ once the calendar wrote, `diskContent === tab.savedContent` (`editor.service.ts:398`) so the reload is skipped.
- READ file history snapshots only the bytes the app saved (`file-history.service.ts:111-124`, fed by the after-save observer), so the external version is never captured.
Nothing blocks it. The window is at least ~0.8 s after the external write's last event and longer during a big sync. Not in `.scratch/architecture-stability/issues`.
Repro: open note N in a background tab; rewrite N from a shell (`echo extra >> N.md`); within ~0.5 s drag N's event; N on disk lacks `extra`. Test idea: tab with content A, mock disk read returning B, call `moveEvent` before invoking `reloadExternallyChangedTabs`; assert the written bytes contain B's body (fails today).
Fix hint: in the tab branch, when the tab is clean, read the disk and use it as base (or compare it with `savedContent` and refuse/reload when they differ).

### calendar-2: CONFIRMED, corruption (resurrects a note deleted outside the app)

Tried to refute: looked for a watcher-delete path that closes the tab or tells the calendar.
- READ the only tab close on delete is `closeTabsForDeletedPath`, called only from `applyPathChange` (`path-change.service.ts:125`); grep finds no other caller. The watcher's delete branch goes to `applyNoteChange({kind:'delete'})` only (`watcher-handler.service.ts:105-109`). The reload swallows the read error (`editor.service.ts:391-393`). So the tab stays open indefinitely.
- READ the calendar registers only a path-change consumer (`event-calendar.service.ts:651-652`), which the watcher never calls; the event stays visible until the throttled bump (`app/tauri-listeners.service.ts:85-88`, 2 s after an isolated event, up to 10 s in a burst), so `requireEvent` (`:530-535`) passes.
- READ `frontmatter-write.service.ts:112,127-129`: tab branch, no `exists`, `saveFileByPath` -> `writeTextFile(path, content)` without options; FETCHED `create` defaults to true. `{ create: false }` exists only in the closed branch (`:146-149`).
- READ `renameAndWrite` settles and records the op on success (`event-calendar.service.ts:793-794`); `saveFileByPath` calls `notifyAfterSave`, re-indexing the recreated note.
Issue 59 (`59-calendar-field-write-after-outside-delete.md`) covered the in-app delete, where `applyPathChange` closes the tab first; the Finder/git/sync delete with an open tab is not covered. Severity kept at corruption: no content is lost, but a deleted note comes back (external rename variant: a duplicate at the old path).
Repro: open `Standup.md`, `rm` it from a shell, drag the Standup event within ~2 s; the file exists again.
Fix hint: in the tab branch, check `exists(path)` before saving and throw `missing`, or have `saveFileByPath` pass `{ create: false }` for an already-saved tab.

### calendar-3: CONFIRMED (mechanism), data-loss, very low likelihood

- FETCHED truncate-then-`write_all` in `write_file_inner`.
- READ calendar writes reach it at `frontmatter-write.service.ts:149`, `editor.service.ts:168` (via `frontmatter-write:129` and `event-calendar.service.ts:1037`), `link-updater.service.ts:39`.
- READ correction to the reviewer: `write_atomic` (`src-tauri/src/utils/fs.rs:16-32`) is used by `create_note` (`vault.rs:899`) and also at `vault.rs:370` and `vault.rs:683`, not only by `create_note`. This does not change the finding: none of the TS write paths above use it.
Not calendar-specific (every TS save shares it). No matching Issue in `.scratch/architecture-stability/issues` (grep for atomic/truncat finds none).
Repro: not reproducible by user steps; test idea: a Rust integration test of a `write_note_atomic` command that kills mid-write is not practical; verify by code inspection.
Fix hint: route note saves through a Rust command that uses `write_atomic` (plus fsync of file and dir).

### calendar-4: PLAUSIBLE, data-loss, near-zero likelihood

- READ `holdPath` sets the tail without awaiting the previous one (`event-calendar.service.ts:438-445`); `createNow` uses it (`:939`); `duplicateEvent` uses `joinPath` (`:1001-1004`).
- READ `createEvent` enqueues on `CREATE_QUEUE_KEY` (`:916`); an earlier undo claims `op.path` at its intake turn (`:1300-1311`, `applyNoteOp` -> `claimPath` `:1258`), so the create's disk leg runs concurrently with the restore.
- READ `restoreItem`: `exists(restorePath)` (`trash.service.ts:116`), `exists(parentDir)`, then `rename` (`:126`), manifest drop after (`:135-141`). Rust `create_note`: `Path::exists` then `write_atomic` (`vault.rs:896-899`), whose final step is `std::fs::rename` over the target (`utils/fs.rs:28`).
Interleavings that lose data: (a) restore rename lands between `create_note`'s exists check and its rename: restored note is replaced and already gone from the Trash (permanent loss); window is microseconds inside one Rust call. (b) `create_note` completes after the restore's `exists` and before its `rename`: the new note (template + dialog fields) is replaced; window ~2 IPC round trips. Both need an undo of a delete and a create of the same title within milliseconds; the event dialog holds focus while creating, so this needs palette/toast undo plus dialog submit almost at once. Not refuted because no guard blocks it. Known partly: Issue 48 notes `:23` record the `holdPath` vs `joinPath` gap as low; the overwrite consequence is not recorded.
Test idea: hold the restore's `rename` mock, run `createEvent` for the same title, release; assert the restored bytes survive (or create fails with `create-failed`).
Fix hint: use `joinPath(target.path)` in `createNow`'s `buildContent` path (await before `createFile`), as `duplicateEvent` does.

### calendar-5: PLAUSIBLE, stale-state, minor

- READ `applyPathChange` (`path-change.service.ts:117-171`) has no try around `updateLinksAfterRename` (`:146-148`) or `refreshTree` (`:151`), though its JSDoc says "Never throws on the index legs".
- READ `get_backlinks_v2` can only fail on a poisoned lock (`vault.rs:436-438`); `scan_vault` fails when any `read_dir` in the recursion fails (`vault.rs:96,100,139`), e.g. a subfolder removed by a sync tool mid-scan. `loadDirectoryTree` rethrows (`fs.service.ts:96-98`).
- READ consequences as described: `renameAndWrite` maps the throw to "may already exist" (`event-calendar.service.ts:726-731`) after the consumer already consumed the own mark (`:588-595`, called from `path-change.service.ts:134-140`), so no remap, no field write, no op. `deleteNow` reports failure (`:1043-1049`) while `moveToTrash` already moved the file (`trash.service.ts:71-83`).
Self-heals on the next bump for display (INFER: Rust index re-scans from the watcher). Recoverable from the Trash panel. Depends on a transient scan failure right after the disk op.
Test idea: mock `scan_vault` to reject once after `rename`; call `editEvent` with a title change and a date change; assert the note is at the new path and the error claims it was not renamed.
Fix hint: wrap the post-`diskOp` legs of `applyPathChange` in try/catch with logging so a completed disk op never reports failure.

### calendar-6: PLAUSIBLE, minor (re-graded from data-loss)

- READ `deleteNow` awaits `saveFileByPath` (`event-calendar.service.ts:1037`), which writes the captured `tab.content` (`editor.service.ts:165-169`); after it resolves, `deleteItem` -> `applyPathChange` reaches `closeTabsForDeletedPath` (`path-change.service.ts:125`) before its first await, with no dirty re-check.
Refutation of the stated scenario: the delete starts from the popover, dialog or the calendar's Delete key, all of which hold keyboard focus (`EventCalendarView.svelte:77-81`), so keystrokes cannot reach the editor during the write IPC. Residual path: palette "Calendar: Undo" (`app/commands.ts:181-187`) undoing a 'Create event' -> `applyNoteOp` -> `deleteNow` (`event-calendar.service.ts:1270`), with the created note open and dirty and the user typing within one write IPC after the palette closes. The lost text is in a note the user is deleting.
Fix hint: after the save, re-check `isTabDirty` and save again (or refuse) before calling `deleteItem`.

### calendar-7: PLAUSIBLE, minor

- READ `link-updater.service.ts:33-47`: dirty decided synchronously, then `readTextFile` (clean case) and `await writeTextFile`, then `syncExternalContentToEditor(..., true)` replaces `content` and `savedContent` (`editor.service.ts:78-79`, `editor.store.svelte.ts:130-136`). Keystrokes in the linking note's tab during those IPCs are dropped from buffer and disk.
Limits: the edit dialog keeps focus while `editEvent` is in flight (`EventDialog.svelte:108-127`), so the dialog route cannot type into the editor; the calendar's own Cmd+Z route has focus in the calendar. Residual: palette undo/redo of a renaming 'Edit event' with focus returning to an editor that links to the event. The same race exists for any file-tree rename (not calendar-specific). Not in `.scratch` issues.
Test idea: open tab with `[[Event]]`, start `updateLinksAfterRename`, hold `writeTextFile`, call `onContentChange` with extra text, release; assert the extra text survives.
Fix hint: after the write, apply the link replacement to the current tab content (or skip the sync and leave the tab dirty) when the tab changed since it was read.

### calendar-8: PLAUSIBLE, stale-state, minor

- READ `frontmatter-write.service.ts:131-134`: revert only when the tab still equals `next`; otherwise `next` plus the later change stays in the tab and `save-failed` is thrown. Calendar rolls back overlay and records no op (`event-calendar.service.ts:767-771`). A later `saveDirtyTabs` (`editor.service.ts:183-193`) writes the moved frontmatter.
Needs a disk write failure plus a change to that tab during the save IPC. Typing is unlikely because the drag puts focus in the calendar; another writer on the same tab (icon picker) in the same failure window is the other way in. Not data loss.
Fix hint: on `save-failed`, revert the frontmatter in the current tab content (re-run with the prior props) instead of only when unchanged, or keep the overlay and record the op.

### calendar-9: PLAUSIBLE, minor

- READ `createFile`: `create_note` (`fs.service.ts:129`), then `await refreshTree()` (`:138`) in the same try, rethrown (`:141-144`). `createTypedNote` maps it to `create-failed` (`type-definitions.service.ts:135-140`); its own JSDoc (`:108-113`) says throwing for a note that exists is wrong, yet `createFile` does it. `createNow` records nothing (`event-calendar.service.ts:943-947`); the dialog keeps the form (`EventDialog.svelte:146-158`). A second Create dedupes to `Standup 1.md`.
Depends on a transient `scan_vault` failure (see calendar-5).
Fix hint: in `createFile`, catch and log a `refreshTree` failure after `create_note` succeeded instead of rethrowing.

### calendar-10: REFUTED (known and documented; no wrong write)

- READ the four limitations are a deliberate JSDoc block (`event-calendar.service.ts:611-624`). Issue 59's notes record that its review fix round added the "Known-limitations JSDoc for the outside-rename variant" (`59-calendar-field-write-after-outside-delete.md`, Notes), so (d) went through review and was accepted as a documented limitation.
- READ (d)'s claimed effect does not write a wrong state: `draftToPatch` (`event-calendar-form.logic.ts:178-192`) writes only the fields the user changed; fields the user left alone keep what is on disk. The user saw a stale position for up to two bumps, and the disk never received a value the user did not enter. That is display staleness, already documented. Filing them is a bookkeeping choice for the owner, not a defect.

## Not checked

- Nothing was run. No repro executed.
- Whether the Tauri JS `writeTextFile` sends an options header when none is given (either way `create` is true).
- Whether calendar blocks take focus on mousedown during a drag (used to limit calendar-8); inferred from the focus handling in `EventCalendarView.svelte`.

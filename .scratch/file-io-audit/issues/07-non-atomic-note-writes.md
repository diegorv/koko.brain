# 07: Note writes truncate in place: a failed write can leave the note empty

**Status:** wontfix

**Blocked by:** none
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o08-atomicity (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: save-pipeline-9, calendar-3, rust-writes-3

**How a user hits it.** Needs a full disk, which is uncommon but realistic on small laptop SSDs. Truncation frees the old blocks, so a same-size rewrite often still fits. It fails when the content grows past the free space (the note is left partial) or when APFS local snapshots pin the freed blocks (the note is left at 0 bytes). I reasoned this out and did not reproduce it on a real full volume. On a full disk it can happen on every autosave (2 s after typing stops), every Properties or calendar write to a closed note, and every link rewrite after a rename. An open tab keeps its buffer and retries every 5 s, so loss needs the user to quit or discard while the disk is still full; the quit dialog says 'lose unsaved changes', not 'lose the note'. The closed-note paths lose the content at once, because no in-memory copy exists. A crash between open(O_TRUNC) and write_all is a microsecond window, so that case is theoretical. Power loss without fsync is unverified for APFS, and write_atomic does not fsync either. A full disk is not the only trigger: with the vault on an external drive or a network volume (SMB, NFS) that disconnects or errors mid-write, write_all fails with EIO after the open has already truncated the file, and the note is left empty or cut short the same way.

**Recoverable from.** File History is on by default and snapshots every successful in-app save. Retention keeps all snapshots for 7 days, then one per day until day 37, then deletes them. That restores the last in-app-saved version, without the unsaved edits. Notes never saved in-app, or idle for 37+ days, have no snapshot. Otherwise only Time Machine or an external backup.

**Root cause.** src/lib/core/editor/editor.service.ts:168 (also frontmatter-write.service.ts:149, link-updater.service.ts:39) uses plugin-fs writeTextFile. Upstream tauri-plugin-fs 2.7.1 write_file_inner opens with truncate:true and then calls write_all, with no temp file, rename or sync. The repo's atomic writer src-tauri/src/utils/fs.rs:16-32 write_atomic is not used for these paths.

**Evidence.** Fetched plugins-workspace tag fs-v2.7.1 plugins/fs/src/commands.rs. write_file_inner (~l.1125-1210) opens with OpenOptions{write:true,truncate:true,create:true} when no options are passed, and with truncate:!opts.append (append defaults to false) when they are, then calls file_handle.write_all with no sync_all. The JS side (node_modules/@tauri-apps/plugin-fs/dist-js/index.js:777-788) sends write_text_file. Callers: editor.service.ts:168 saveFileByPath; frontmatter-write.service.ts:149 (closed note, base and next exist only as locals in attempt()); link-updater.service.ts:39; event-calendar.service.ts:1037 and frontmatter-write.service.ts:129 via saveFileByPath. write_atomic is used only at vault.rs:370 (propagate_type_rename_inner), 683 (toggle_task_status_inner) and 899 (create_note). The quit dialog is at tauri-listeners.service.ts:53-62. The File History hook is registered at app-lifecycle.service.ts:268, and retention is at history.rs:137-155.

**Limits found while trying to refute.** Partial downgrade from the claimed P0. On a full disk a same-size rewrite often still succeeds because truncation frees the blocks. The crash-mid-write window is microseconds. The open-tab buffer survives and is retried. File History usually holds the last saved version. calendar-3's claim that write_atomic is used only by create_note is inaccurate; it is also used at vault.rs:370 and 683.

**Repro test.** `.scratch/file-io-audit/repro/o08-atomicity/non-atomic-save.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
3 failed. 'open tab: ENOSPC during autosave leaves the old note on disk': AssertionError: expected '' to be '# Meeting notes\n\nA long body the us…' at non-atomic-save.test.ts:67 expect(disk.get(NOTE)).toBe(SAVED). 'closed note: a failed frontmatter rewrite (calendar drag) leaves the note on disk': AssertionError: expected '' to be '---\nstart: 2026-11-02\n---\n# Event\…' at :81 expect(disk.get(NOTE)).toBe(base). The body autosave path fails the same way at :92. The fake disk follows the upstream truncate-then-write order.
```

**Fix sketch.** Route the editor save, frontmatter write and link rewrite through a Rust command built on write_atomic (temp file + rename, keeping the read-only check), and optionally sync_all the temp file before the rename. Reword the quit and close dialogs to warn that the file on disk may be damaged.

**Every note-content writer.** The fix covers every writer under src/lib that writes note or vault-file content through plugin-fs writeTextFile, not only the three in the root cause. At current main:
- src/lib/core/editor/editor.service.ts:168 `saveFileByPath` (tab save, autosave, quit save).
- src/lib/core/frontmatter/frontmatter-write.service.ts:149, the closed-note rewrite. Keep its `create: false` contract (comment at :146-148): a temp file + rename creates the target whatever its prior state, so the command must refuse a target that no longer exists instead of recreating a note deleted after the existence check.
- src/lib/core/filesystem/link-updater.service.ts:39, the link rewrite after a rename.
- src/lib/features/type-definitions/type-definitions.service.ts:218 (`renameType` rewrites every open member tab), :291 (`updateViewIcon` rewrites a `.view` file) and :309 (`updateViewQuery` rewrites a `.view` file).
- src/lib/features/deep-link/deep-link.service.ts:278 (`new` + prepend to an existing note), :297 (`new` + append), :314 (`new` + overwrite) and :331 (`new` + silent create, which also overwrites an existing note, issue 04).
- src/lib/app/deep-link-actions.ts:63 (daily append or prepend to an existing note) and :175 (capture to a fresh path).
- src/lib/features/file-icons/file-icons.service.ts:98 (folder-note placeholder) and src/lib/plugins/templates/templates.service.ts:116 (empty template placeholder). Both write only after `exists()` returned false, so they cannot destroy existing content. Route them through the same command anyway, so the guard test below needs no note-writer exceptions.

The other writeTextFile calls under src/lib write app state, not note content, and stay out of scope: settings.service.ts:193 (issue 10), trash.service.ts:275 (issue 11), fs.service.ts:48 (folder-order JSON), file-icons.service.ts:65 (recent-icons JSON), todoist.service.ts:129, auto-move.service.ts:81, file-history.service.ts:143 (snapshot backup to a new timestamped path) and utils/log.service.ts:69 (append-only log).

Guard: add a test under src/tests/lib/architecture/ (next to raw-invoke.test.ts) that fails when a file under src/lib calls plugin-fs writeTextFile or writeFile outside an allowlist of those app-state writers. Key the allowlist by file with the expected call count, so a new note write added to an allowlisted file (file-icons.service.ts holds one of each kind today) fails too.

- [ ] Every writer listed under "Every note-content writer" writes through the atomic Rust command (temp file in the same directory, then rename); none of them calls plugin-fs writeTextFile
- [ ] A test under `src/tests/lib/architecture/` fails when a file under `src/lib` calls plugin-fs `writeTextFile` or `writeFile` outside the allowlist of app-state writers, keyed by file and call count
- [ ] A write that fails partway with ENOSPC, and one that fails with EIO, leave the previous bytes of the note on disk, for the open-tab save and for the closed-note rewrite
- [ ] The closed-note rewrite (frontmatter-write.service.ts:149) still refuses a note deleted before the write: the atomic command does not recreate it

## Audit evidence (editor-data-safety, 2026-11-02)

Source: .scratch/editor-data-safety/audit-2026-11-02.md (findings F182 and F54), cross-referenced in .scratch/editor-data-safety/xref-file-io-audit.md. Re-checked on main at 1351a35d.

- F182 (P1, rare), main note save truncates the file in place. TRACE finding: the second audit has no repro test for it under /Users/diegorv/Dev/pet-projects/koko/brain/.scratch/editor-data-safety/repro/, so the red test stays `.scratch/file-io-audit/repro/o08-atomicity/non-atomic-save.test.ts`. Its scenario adds the EIO trigger (external drive or network volume dropping mid-write) and the writers this issue's fix text did not name. Verified with a grep for writeTextFile under src/lib; the writer list above is the result. Issue 02 added `saveOpenNoteBeforeWrite` (deep-link.service.ts:246-250), so the cross-reference's deep-link.service.ts:260/279/296/313 are now :278/:297/:314/:331 and deep-link-actions.ts:61/173 are now :63/:175. Issue 01 moved the quit prompt from tauri-listeners.service.ts:53-62 to src/lib/core/vault/exit.service.ts:20 ("Close anyway and lose unsaved changes?"). On the Rust side, note writes already go through write_atomic (vault.rs:370, 683, 899; utils/fs.rs:16); a grep for fs::write and File::create in src-tauri/src found no non-atomic note writer.
- F54 (P1, rare), closed-note write truncates the file before writing. The cross-reference grades it fully covered by this issue's fix. The one detail the fix text lacked is the `create: false` contract at src/lib/core/frontmatter/frontmatter-write.service.ts:146-149, now in the writer list and the last checklist item. The existing test src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts:205 ('passes a write error through when the note is still there') mocks writeTextFile to reject without touching its fake disk, so it cannot see a truncated file.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/107-note-writes-are-atomic-failed-write-never.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.

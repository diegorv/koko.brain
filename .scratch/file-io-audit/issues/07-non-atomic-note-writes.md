# 07: Note writes truncate in place: a failed write can leave the note empty

**Status:** needs-triage

**Blocked by:** none
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o08-atomicity (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: save-pipeline-9, calendar-3, rust-writes-3

**How a user hits it.** Needs a full disk, which is uncommon but realistic on small laptop SSDs. Truncation frees the old blocks, so a same-size rewrite often still fits. It fails when the content grows past the free space (the note is left partial) or when APFS local snapshots pin the freed blocks (the note is left at 0 bytes). I reasoned this out and did not reproduce it on a real full volume. On a full disk it can happen on every autosave (2 s after typing stops), every Properties or calendar write to a closed note, and every link rewrite after a rename. An open tab keeps its buffer and retries every 5 s, so loss needs the user to quit or discard while the disk is still full; the quit dialog says 'lose unsaved changes', not 'lose the note'. The closed-note paths lose the content at once, because no in-memory copy exists. A crash between open(O_TRUNC) and write_all is a microsecond window, so that case is theoretical. Power loss without fsync is unverified for APFS, and write_atomic does not fsync either.

**Recoverable from.** File History is on by default and snapshots every successful in-app save. Retention keeps all snapshots for 7 days, then one per day until day 37, then deletes them. That restores the last in-app-saved version, without the unsaved edits. Notes never saved in-app, or idle for 37+ days, have no snapshot. Otherwise only Time Machine or an external backup.

**Root cause.** src/lib/core/editor/editor.service.ts:168 (also frontmatter-write.service.ts:149, link-updater.service.ts:39) uses plugin-fs writeTextFile. Upstream tauri-plugin-fs 2.7.1 write_file_inner opens with truncate:true and then calls write_all, with no temp file, rename or sync. The repo's atomic writer src-tauri/src/utils/fs.rs:16-32 write_atomic is not used for these paths.

**Evidence.** Fetched plugins-workspace tag fs-v2.7.1 plugins/fs/src/commands.rs. write_file_inner (~l.1125-1210) opens with OpenOptions{write:true,truncate:true,create:true} when no options are passed, and with truncate:!opts.append (append defaults to false) when they are, then calls file_handle.write_all with no sync_all. The JS side (node_modules/@tauri-apps/plugin-fs/dist-js/index.js:777-788) sends write_text_file. Callers: editor.service.ts:168 saveFileByPath; frontmatter-write.service.ts:149 (closed note, base and next exist only as locals in attempt()); link-updater.service.ts:39; event-calendar.service.ts:1037 and frontmatter-write.service.ts:129 via saveFileByPath. write_atomic is used only at vault.rs:370 (propagate_type_rename_inner), 683 (toggle_task_status_inner) and 899 (create_note). The quit dialog is at tauri-listeners.service.ts:53-62. The File History hook is registered at app-lifecycle.service.ts:268, and retention is at history.rs:137-155.

**Limits found while trying to refute.** Partial downgrade from the claimed P0. On a full disk a same-size rewrite often still succeeds because truncation frees the blocks. The crash-mid-write window is microseconds. The open-tab buffer survives and is retried. File History usually holds the last saved version. calendar-3's claim that write_atomic is used only by create_note is inaccurate; it is also used at vault.rs:370 and 683.

**Repro test.** `.scratch/file-io-audit/repro/o08-atomicity/non-atomic-save.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
3 failed. 'open tab: ENOSPC during autosave leaves the old note on disk': AssertionError: expected '' to be '# Meeting notes\n\nA long body the us…' at non-atomic-save.test.ts:67 expect(disk.get(NOTE)).toBe(SAVED). 'closed note: a failed frontmatter rewrite (calendar drag) leaves the note on disk': AssertionError: expected '' to be '---\nstart: 2026-11-02\n---\n# Event\…' at :81 expect(disk.get(NOTE)).toBe(base). The body autosave path fails the same way at :92. The fake disk follows the upstream truncate-then-write order.
```

**Fix sketch.** Route the editor save, frontmatter write and link rewrite through a Rust command built on write_atomic (temp file + rename, keeping the read-only check), and optionally sync_all the temp file before the rename. Reword the quit and close dialogs to warn that the file on disk may be damaged.

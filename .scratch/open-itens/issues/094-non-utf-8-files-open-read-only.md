# 094: Non-UTF-8 files open read-only or as binary, never written back with U+FFFD

**Origin:** `audit-2026-11-05` Issue 119, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/file-io-audit/issues/31-non-utf8-rewrite.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). It needs a non-UTF-8 file with a text extension.

**Audit check at `5f8003d67`:** still_present (corner, low). src/lib/core/editor/editor.service.ts:109 isBinaryFile is the only gate, and it checks the extension only (src/lib/core/filesystem/fs.logic.ts:95-113: the set lists images, audio, video, pdf and archives, not .docx, .xlsx, .epub, .sqlite or .db). editor.service.ts:125 readTextFile decodes with no fatal flag and no U+FFFD check. saveFileByPath writes the tab at editor.service.ts:194. The frontmatter path reads at src/lib/core/frontmatter/frontmatter-write.service.ts:121 and writes at :153 with no decode check. rg for FFFD, fatal or from_utf8_lossy in src/lib and src-tauri/src finds nothing relevant. Trigger: a Latin-1 .md file (rare on macOS), or a click on an unlisted binary file in the folder lens and then a keystroke. Data loss when it happens: the original bytes are replaced with U+FFFD and nothing recovers them.

**Stale in the text below:** Line refs drifted: the isBinaryFile gate is editor.service.ts:109 (Issue says :108), readTextFile is :125 (Issue says :124), the save write is :194 (Issue says :168), BINARY_FILE_EXTENSIONS is fs.logic.ts:95-106 and isBinaryFile is :111 (Issue says :79-88 and :95-97), and the frontmatter-write read and write are :121 and :153 (Issue says :117 and :149). Otherwise accurate.

**Status:** ready-for-agent

**Blocked by:** none
Priority: P2
Severity: corruption
Source: file I/O audit, deep-dive group(s) o10-frontmatter-fidelity (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity corruption)
- Claims covered: fidelity-8

**How a user hits it.** Needs a legacy Latin-1 or Windows-1252 note, which is rare on macOS. Then: open it from the file tree and type anything (autosave), or run an icon or favorite write by path. The claimed rename link-update path is refuted: the Rust index skips non-UTF-8 files (fs::read_to_string fails), so they have no backlinks. A second variant needs no legacy note: a binary file whose extension is not in BINARY_FILE_EXTENSIONS (src/lib/core/filesystem/fs.logic.ts:79-88 lists only image, audio, video, pdf and archive types, so .docx, .xlsx, .epub, .sqlite or .db get through). The folder lens lists files of every kind, and clicking the row opens it through openFileInEditor, whose isBinaryFile gate lets it pass. One accidental keystroke then autosaves the file as U+FFFD text.

**Recoverable from.** None. File History stores only post-save content, and no backup of the original bytes is made.

**Root cause.** src/lib/core/frontmatter/frontmatter-write.service.ts:117 and src/lib/core/editor/editor.service.ts:124 (readTextFile with lossy decode). The writes at :149 and editor.service.ts:168 encode UTF-8 with no check for U+FFFD.

**Evidence.** Fetched tauri-apps/plugins-workspace fs-v2.7.1 plugins/fs/guest-js/index.ts: readTextFile = new TextDecoder(options?.encoding ?? 'utf-8').decode(bytes), non-fatal. writeTextFile = new TextEncoder().encode(data). Rust commands/vault.rs:1302,1320 use read_to_string and skip such files from the index. The file tree comes from read_dir (scan_vault), so the note can still be opened.

**Repro test.** `.scratch/file-io-audit/repro/o10-frontmatter-fidelity/non-utf8-rewrite.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: ---\ntitle: Caf�\n_favorite: true\n---\nR�sum� body\n: expected true to be false (EF BF BD present after the write)
```

**Fix sketch.** Read with a fatal decoder (or check for U+FFFD) before any write path. Refuse to save or rewrite such a note, or open it read-only with a toast.

**Binary files with an unlisted extension.** The fatal-decode check this Issue adds at openFileInEditor (src/lib/core/editor/editor.service.ts:124, today a plain lossy readTextFile) must apply to every extension, not only `.md`, so it also catches a binary file that the extension gate at editor.service.ts:108 lets through. Do not scope the fix to Markdown notes, and do not rely on growing BINARY_FILE_EXTENSIONS: no extension list covers every binary format. Adding common formats to the list is optional and only improves the message.

- [ ] Opening a file with invalid UTF-8 bytes through openFileInEditor, under any extension, is refused with a toast or opened read-only, and is never autosaved: its bytes on disk are unchanged after an edit attempt
- [ ] A test feeds invalid UTF-8 bytes under a `.sqlite` name (an extension missing from BINARY_FILE_EXTENSIONS) through openFileInEditor and asserts no editable tab holds U+FFFD and nothing is written to that path

## Audit evidence (editor-data-safety, 2026-11-02)

Source: .scratch/editor-data-safety/audit-2026-11-02.md (finding F184), cross-referenced in .scratch/editor-data-safety/xref-file-io-audit.md. Re-checked on main at 1351a35d.

- F184 (P1, rare), non-UTF-8 notes and binary files with unrecognized extensions are decoded lossily and corrupted on the first edit. Repro test: /Users/diegorv/Dev/pet-projects/koko/brain/.scratch/editor-data-safety/repro/non-atomic-writes-encoding/lossy-utf8-decode.test.ts (copy to src/tests/audit-repro/non-atomic-writes-encoding/ to run, see the repro README). It stubs only the Tauri IPC, so the real plugin-fs readTextFile and writeTextFile run. It covers the Latin-1 `.md` case; no repro covers the binary variant yet, which is what the second checklist item adds.
- Code path verified: the folder lens lists "the folder's direct files of every kind" (src/lib/features/rail-shell/lens.logic.ts:689-717), with unknown extensions labelled 'File' (fileKind at :621-631, 'other'). The Rust scan adds every non-hidden file to the tree with no extension filter (src-tauri/src/commands/vault.rs:91-150). The row click is src/lib/features/note-list/NoteRow.svelte:63 `openFileInEditor(note.path)`. In openFileInEditor, `isBinaryFile` (editor.service.ts:108, fs.logic.ts:95-97) checks only the extension set at fs.logic.ts:79-88, then readTextFile at editor.service.ts:124 decodes without `fatal`, and addTab stores the result as both content and savedContent (:140). The next keystroke autosaves through saveFileByPath (editor.service.ts:161-177, write at :168).

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/31-non-utf8-rewrite.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.

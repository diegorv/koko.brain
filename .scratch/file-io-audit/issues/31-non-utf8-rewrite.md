# 31: Non-UTF-8 notes are written back with U+FFFD, losing the original bytes

**Status:** needs-triage

**Blocked by:** none
Priority: P2
Severity: corruption
Source: file I/O audit, deep-dive group(s) o10-frontmatter-fidelity (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity corruption)
- Claims covered: fidelity-8

**How a user hits it.** Needs a legacy Latin-1 or Windows-1252 note, which is rare on macOS. Then: open it from the file tree and type anything (autosave), or run an icon or favorite write by path. The claimed rename link-update path is refuted: the Rust index skips non-UTF-8 files (fs::read_to_string fails), so they have no backlinks.

**Recoverable from.** None. File History stores only post-save content, and no backup of the original bytes is made.

**Root cause.** src/lib/core/frontmatter/frontmatter-write.service.ts:117 and src/lib/core/editor/editor.service.ts:124 (readTextFile with lossy decode). The writes at :149 and editor.service.ts:168 encode UTF-8 with no check for U+FFFD.

**Evidence.** Fetched tauri-apps/plugins-workspace fs-v2.7.1 plugins/fs/guest-js/index.ts: readTextFile = new TextDecoder(options?.encoding ?? 'utf-8').decode(bytes), non-fatal. writeTextFile = new TextEncoder().encode(data). Rust commands/vault.rs:1302,1320 use read_to_string and skip such files from the index. The file tree comes from read_dir (scan_vault), so the note can still be opened.

**Repro test.** `.scratch/file-io-audit/repro/o10-frontmatter-fidelity/non-utf8-rewrite.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: ---\ntitle: Caf�\n_favorite: true\n---\nR�sum� body\n: expected true to be false (EF BF BD present after the write)
```

**Fix sketch.** Read with a fatal decoder (or check for U+FFFD) before any write path. Refuse to save or rewrite such a note, or open it read-only with a toast.

# 43: A case-only rename is refused as already exists

**Status:** wontfix

**Blocked by:** none
Priority: P3
Severity: minor
Source: file I/O audit, deep-dive group(s) o04-delete-rename (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P3, severity minor)
- Claims covered: rename-move-delete-7

**How a user hits it.** A common action on default macOS: fixing a note's or folder's capitalization from FilesNavigator or NoteRowMenu rename. No data loss, and renaming twice through a temporary name works around it.

**Recoverable from.** Nothing is lost.

**Root cause.** src/lib/core/filesystem/fs.service.ts:205 (exists(newPath) true for a different-case name; the :204 equality check is exact-case)

**Evidence.** fs.service.ts:204 oldPath===newPath compares exact case, then :205 exists(newPath) -> targetExistsError. Fetched commands.rs: exists -> resolved_path.exists(), which is case-insensitive on APFS. Callers FilesNavigator.svelte:140-153, NoteRowMenu.svelte:99-102 (buildRenameFileName type-note-list.logic.ts:14-23) and type-definitions.service.ts:209 have no special case.

**Repro test.** `.scratch/file-io-audit/repro/o04-delete-rename/case-insensitive-names.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: promise rejected "Error: "Meeting Notes.md" already exists …" instead of resolving
```

**Fix sketch.** Skip the exists check when oldPath.toLowerCase()===newPath.toLowerCase(). std::fs::rename handles a case-only rename on APFS.

## Comments

- 2026-11-06: closed by audit 2026-11-05 at `5f8003d67` (wontfix): Owner decision: 'a case-only rename being refused is wontfix'. renameItem's exists() check at fs.service.ts:284-285 stays as is.

# 19: Duplicate overwrites a sibling whose name differs only in case (APFS)

**Status:** wontfix

**Blocked by:** none
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o04-delete-rename (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: rename-move-delete-2

**How a user hits it.** Default macOS APFS (case-insensitive). Needs x.md plus 'X copy.md' that differ only in case, for example after duplicating Note.md, deleting it and creating note.md, or with files made outside the app or synced. Uncommon but realistic, and the overwrite is silent.

**Recoverable from.** No Trash entry. File History has snapshots only if 'X copy.md' was ever saved in the editor (a copyFile copy has none). Otherwise only an external backup.

**Root cause.** src/lib/core/filesystem/fs.logic.ts:185 (generateCopyName uses an exact-case sibling Set) together with src/lib/core/filesystem/fs.service.ts:278 (copyFile with no exists check)

**Evidence.** fs.service.ts:266-279 calls generateCopyName(itemName, false, siblingNames), and fs.logic.ts:185/203/206 compares names with exact case. generateUniqueName (fs.logic.ts:216-226) lowercases on purpose for APFS. Fetched plugins-workspace fs-v2.7.1 commands.rs: copy_file -> std::fs::copy, which is documented to overwrite `to`. Folders are safe because mkdir is non-recursive (fs.service.ts:252). Entry point: NoteRowMenu.svelte:67-69.

**Repro test.** `.scratch/file-io-audit/repro/o04-delete-rename/case-insensitive-names.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected 'source note body' to be 'a different note the user wrote'
```

**Fix sketch.** Compare lowercased sibling names in generateCopyName, matching generateUniqueName. Optionally check exists(newPath) before copyFile.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/113-duplicate-never-overwrites-sibling-whose-name-differs.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.

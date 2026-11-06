# 113: Duplicate never overwrites a sibling whose name differs only in case (APFS)

**Migrated from:** `.scratch/file-io-audit/issues/19-duplicate-case-insensitive-overwrite.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). It needs case-variant siblings. It is next to N-file-io-07 because both change duplicateItem.

**Audit check at `5f8003d67`:** still_present (corner, low). src/lib/core/filesystem/fs.logic.ts:193-223 generateCopyName builds an exact-case Set (:198) and checks candidates against it (:216, :220), while generateUniqueName :233-238 lowercases on purpose for APFS. src/lib/core/filesystem/fs.service.ts:344-358 duplicateItem reads sibling names, calls generateCopyName (:351) and copyFile (:357) with no exists check, and plugin-fs copyFile overwrites the target. Folders fail safely because copyDirectoryRecursive uses a non-recursive mkdir (:330). Trigger needs a sibling 'X copy.md' whose case differs from the duplicated note's name, which is uncommon; the fix is one line.

**Stale in the text below:** Line refs drifted: generateCopyName is at fs.logic.ts:193-223 (Issue :185/:203/:206), generateUniqueName at :233 (Issue :216-226), duplicateItem copyFile at fs.service.ts:357 (Issue :278), mkdir at :330 (Issue :252).

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Blocked by:** 112
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

## Acceptance criteria

Written by audit 2026-11-05 from the text above and its audit header; the original Issue had none.

- [ ] Failing test first, in src/tests/lib/core/filesystem/fs.logic.test.ts (describe 'generateCopyName'): generateCopyName('Note.md', false, ['note.md', 'NOTE copy.md']) must not return 'Note copy.md' (a name that equals 'NOTE copy.md' ignoring case); it returns the next free name ('Note copy 2.md' or whatever the existing numbering scheme produces). It fails today because the sibling Set at fs.logic.ts:198 compares with exact case.
- [ ] Failing test first, in src/tests/lib/core/filesystem/fs.service.test.ts (describe 'duplicateItem'): with the sibling listing returning 'note.md' and 'NOTE COPY.md', duplicateItem('/vault/note.md', false) calls copyFile with a target path that is not a case-insensitive match of any sibling, and the returned path matches that target. It fails today because copyFile is called on the case-variant sibling and overwrites it.
- [ ] generateCopyName compares the candidate against the siblings lowercased, the same way generateUniqueName (fs.logic.ts:233-238) does, for notes and for folders (isDir true).
- [ ] Existing behavior is unchanged: with no case-variant sibling the copy name is the same as before, and the existing generateCopyName and duplicateItem tests pass without edits.
- [ ] Frontend gate: pnpm check + pnpm vitest run pass.

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/19-duplicate-case-insensitive-overwrite.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: Blocked by 112 added after the order review (`raw/first-wave-order-review.json`): the two edit the same code.

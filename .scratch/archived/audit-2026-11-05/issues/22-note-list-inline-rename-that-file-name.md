# 22: A note-list inline rename that the file name rules refuse says why, like the folder rename does

**What to build:** commitRename (src/lib/features/note-list/NoteRowMenu.svelte:116-126) leaves rename mode and returns when buildRenameFileName (src/lib/features/type-definitions/type-note-list.logic.ts:15-24) gives null, and that function returns null both for 'nothing to do' (empty or unchanged title) and for an illegal name (isValidFileName false). The input vanishes and the note keeps its old name with no message. The folder rename in src/lib/features/rail-shell/FilesNavigator.svelte:163-175 toasts getFileNameError (src/lib/core/filesystem/fs.logic.ts:133-140) for the same input. Fix direction: tell the two null cases apart (return the reason, or check getFileNameError in commitRename) and toast 'Could not rename "<title>": Name cannot contain ":"' for the illegal case; empty or unchanged input stays silent.

**Blocked by:** none

**Status:** resolved

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [x] Failing test first, in src/tests/lib/features/note-list/NoteRowMenu.test.ts: start a rename on a row, set the input to 'Meeting: weekly sync', press Enter; assert toast.error was called with a message containing 'Name cannot contain ":"' and renameItem was not called. It fails today.
- [x] Empty, whitespace-only and unchanged titles still exit rename mode silently.
- [x] type-note-list.logic tests cover the new contract for an illegal name, an empty name and an unchanged title.
- [x] A legal new title still renames the note (existing tests stay green).
- [x] Frontend gate: pnpm check and pnpm vitest run.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/medium. A title with ':' or '?' is a common input and today fails silently.
- **Trigger:** Select a note row, press F2 (or right-click > Rename), type a title with ':' or '?' (for example 'Meeting: weekly sync' or 'What next?'), press Enter or click away.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/features/note-list/NoteRowMenu.svelte:116 doc 'silently discards invalid input'; :121 fsStore.setRenamingPath(null); :123-124 `const newName = buildRenameFileName(...); if (!newName) return;` -> src/lib/features/type-definitions/type-note-list.logic.ts:16-17 null for empty/unchanged, :22 null when !isValidFileName(newName) -> src/lib/core/filesystem/fs.logic.ts:133-140 getFileNameError rejects [<>:"/\\|?*] and a leading dot -> src/lib/features/rail-shell/FilesNavigator.svelte:171-175 toasts nameError for folders.
- **Source:** audit 2026-11-05, domain `file-io`, finding `N-file-io-05` (from file-io-ux-1). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, medium). NoteRowMenu.svelte:117-126 clears renamingPath, then returns when buildRenameFileName gives null. type-note-list.logic.ts:16-23 returns null both for empty or unchanged input and when isValidFileName fails. FilesNavigator.svelte:163-175 toasts getFileNameError for the same input. A title with ':' or '?' is common. The named test file NoteRowMenu.test.ts exists.

## Comments

- 2026-11-06, branch issue/22-note-list-inline-rename-that-file-name: buildRenameFileName now returns null for empty, whitespace-only or unchanged titles and { ok: false, error } for a name the file name rules refuse; commitRename in NoteRowMenu.svelte toasts 'Could not rename "<title>": <rule>' for the refused case and stays silent otherwise. Tests in NoteRowMenu.test.ts and type-note-list.logic.test.ts. Review round 1: APPROVED with one nit (toast names the title, not the file name), rejected in review.md Resolution since the Issue specifies the title form. Full suite at 61688708f: 546 files, 12979 passed, 1 skipped, 1 todo; pnpm build ok (exit 0).

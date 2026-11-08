VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first, in src/tests/lib/features/note-list/NoteRowMenu.test.ts: start a rename on a row, set the input to 'Meeting: weekly sync', press Enter; assert toast.error was called with a message containing 'Name cannot contain ":"' and renameItem was not called. It fails today. — NoteRowMenu.test.ts:508-521 ('toasts the rule an illegal name breaks and keeps the old row') sets 'Meeting: weekly sync', presses Enter, asserts toast.error with 'Could not rename "Alpha": Name cannot contain ":"' and renameItem not called. On main, type-note-list.logic.ts returned null for !isValidFileName and commitRename returned before any toast, so the test cannot pass there (read from `git show main:` code; not re-run against main). Passes on the branch.
- [met] Empty, whitespace-only and unchanged titles still exit rename mode silently. — NoteRowMenu.svelte:126-127 returns on null, which buildRenameFileName (type-note-list.logic.ts:25) gives for empty, whitespace and unchanged input. Component tests: whitespace (NoteRowMenu.test.ts:482-494, now also asserts no toast) and unchanged (:496-506) assert renameItem and toast.error not called and renamingPath null. Pure empty '' is covered at the logic level (type-note-list.logic.test.ts:429).
- [met] type-note-list.logic tests cover the new contract for an illegal name, an empty name and an unchanged title. — type-note-list.logic.test.ts:428-431 (empty/whitespace -> null), :433-435 (unchanged -> null), :437-442 (':', '?', '/', leading '.' -> { ok: false, error }).
- [met] A legal new title still renames the note (existing tests stay green). — NoteRowMenu.test.ts 'Gamma' Enter test asserts renameItem(ALPHA, 'Gamma.md'); logic tests :420-426 and :444-446 assert { ok: true, name }. All note-list and logic test files pass (see Tests below).
- [met] Frontend gate: pnpm check and pnpm vitest run. — `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings. Targeted vitest (files below): exit 0, 4 files, 88 tests passed. The full suite is deliver's to run.

## Tests the verdict rests on

Run by the reviewer, exit 0: src/tests/lib/features/note-list/NoteRowMenu.test.ts, src/tests/lib/features/note-list/NoteRowMenu.favorite.test.ts, src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts, src/tests/lib/features/type-definitions/type-note-list.logic.test.ts (4 files, 88 tests). `buildRenameFileName` has no other caller in src/ or e2e/ (grep), so the return type change reaches only NoteRowMenu.svelte.

## Findings

1. nit, src/lib/features/note-list/NoteRowMenu.svelte:129 — the illegal-name toast names the note by its title ('Could not rename "Alpha": ...'), while the taken-name toast from runOrToast (:70) names it by file name ('Could not rename "alpha.md": ...'), and the string is hand-built instead of going through fileOperationErrorMessage. The Issue asks for `<title>`, so this follows the spec; fix only if the owner wants one form: use `fileOperationErrorMessage('rename', getFileName(note.path), result.error)` (or pass the title to runOrToast) so both rename failures read the same.

No correctness bugs, layer-baseline changes or scope creep found. The Enter-then-blur double call stays single-shot: the first call clears renamingPath, so the blur call finds no note and returns before toasting.

## Resolution

1. Rejected (nit). The Issue's fix direction names the message form explicitly: 'Could not rename "<title>": Name cannot contain ":"'. The title is what the user typed into the row and sees in the list, so the toast matches the spec as written. Unifying it with the taken-name toast (file name form) is an owner choice the reviewer also left open; no change made.

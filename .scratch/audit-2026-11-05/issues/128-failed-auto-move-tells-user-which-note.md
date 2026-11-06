# 128: A failed Auto Move tells the user which note did not move and why

**What to build:** moveItem throws when the target exists or the rename fails (src/lib/core/filesystem/fs.service.ts:307-327, targetExistsError at :272-274 and :312) and only logs through error() (:324), which writes console, Sentry and the optional log file, never a toast. evaluateAndMove catches it with a bare `catch { return; }` (src/lib/features/auto-move/auto-move.service.ts:189-194), also skipping the rule's icon. For a lifecycle rule the note stays flagged `_archived: true` in its old folder, so it leaves the lists and the missing move goes unnoticed. The failure repeats silently on every later save. Fix direction: report the failure in a toast naming the note and destination (moveItem's message already names the clash), without stacking a new toast on every autosave of the same note for the same failure.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/auto-move/auto-move.service.test.ts: vaultStore.open('/vault'), a matching rule -> Archive, moveItem mocked to reject with Error('"note.md" already exists in this folder'), svelte-sonner mocked as in other service tests; call the captured observer for '/vault/notes/note.md' and advance past the debounce; toast.error was called once with a message naming note.md. It fails today.
- [ ] A disk error from moveItem is reported the same way.
- [ ] Later autosaves of the same note hitting the same failure do not add a toast per save.
- [ ] A successful move and an already-in-destination note show no toast.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** corner case (bucket 4-corner). Ux/low. It needs Auto Move plus a name collision at the destination.
- **Trigger:** A rule or a type's _archive_to sends a note to a folder that already holds a note with the same file name (for example archiving a second 'Weekly sync.md' from the same folder), or the rename fails on disk.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/filesystem/fs.service.ts:272-274 targetExistsError, :312 throw when target exists, :323-326 error() log then rethrow; src/lib/utils/debug.ts error() has no toast; src/lib/features/auto-move/auto-move.service.ts:189-194 bare catch return, :195-196 skips icon; no toast import anywhere in src/lib/features/auto-move/ (rg); lifecycle archive rule: help/documentation/22-auto-move.md:138-147, note keeps _archived: true in place.
- **Source:** audit 2026-11-05, domain `metadata`, finding `N-metadata-03` (from metadata-ux-2). Size S.

## Comments

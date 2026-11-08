# 059: New File from Template says the name is taken instead of silently opening the existing note

**Origin:** `audit-2026-11-05` Issue 56, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** createFileFromTemplate (src/lib/plugins/templates/templates.service.ts:55-69) calls openOrCreateNote, which opens the existing file when exists() is true and skips the template (src/lib/core/note-creator/note-creator.service.ts:87-127). Nothing throws, so TemplatePicker (src/lib/plugins/templates/TemplatePicker.svelte:33-46) shows no message and the user may type into the older note believing it is new. Fix direction: createFileFromTemplate checks for an existing file first and refuses with a clear error, and the picker shows a toast naming the existing note (it may keep the naming step open so the user can choose another name).

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/plugins/templates/templates.service.test.ts: with exists resolving true for `/vault/Meeting.md`, createFileFromTemplate('/vault/_system/templates/Meeting.md', 'Meeting') rejects with an error naming the existing note and openOrCreateNote is not called. It fails today.
- [ ] A free name still creates the note from the template (existing tests stay green).
- [ ] TemplatePicker shows a toast for the taken name (src/tests/lib/plugins/templates/TemplatePicker.test.ts).
- [ ] Frontend gate: `pnpm check` + `pnpm vitest run` pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/low. It needs a name that collides with an existing note.
- **Trigger:** Run New File from Template, pick a template and type a name that already exists in the vault root (or differs only in case on APFS).
- **Evidence (verified by reading code at `5f8003d67`):** templates.service.ts:55-69 createFileFromTemplate -> openOrCreateNote with filePath `${vaultPath}/${fullFileName}`. note-creator.service.ts:87-88 exists(filePath); :90-122 create branch skipped when it exists; :124-125 openFileInEditor. TemplatePicker.svelte:33-46 toast only on a throw.
- **Source:** audit 2026-11-05, domain `calendar`, finding `N-calendar-08` (from calendar-ux-6). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, low). Confirmed. createFileFromTemplate (templates.service.ts:55-69) passes `${vault}/${name}.md` to openOrCreateNote. When exists() is true, openOrCreateNote (note-creator.service.ts:87-127) skips creation and the template and just opens the file. Nothing throws, so TemplatePicker.svelte:33-46 shows no toast. No test asserts the opposite. templates.service.test.ts mocks plugin-fs exists and openOrCreateNote, so the proposed failing test can be written. Nothing on disk is lost, so the category is ux.

## Comments

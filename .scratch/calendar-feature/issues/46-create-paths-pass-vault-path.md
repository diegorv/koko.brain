# 46: Created notes reach FTS5 at creation

**What to build:** `createFile` and the note creator pass `vaultPath` to `applyNoteChange`, so a newly created note (calendar events included) is searchable in the FTS5 and semantic legs from creation, not from its first save.

**Blocked by:** None

**Status:** ready-for-agent

- Plan D19: "no FTS5 leg at creation, matching every other create path". Callers today: `src/lib/core/filesystem/fs.service.ts:131` (`source: 'fs'`) and `src/lib/core/note-creator/note-creator.service.ts:106` (`source: 'create'`), both without `vaultPath`.
- Plan: `.scratch/calendar-feature/plan-2026-10-28.md`, deleted by ticket 37; read it with `git show c0103ff5:.scratch/calendar-feature/plan-2026-10-28.md`.
- `vaultRelativeKey` (`utils/path.ts`) skips a path outside the vault; never fall back to the absolute path (CLAUDE.md Indexing #6).

- [ ] Both create paths pass `vaultStore.path`
- [ ] Tests: a created note gets its FTS5 upsert with the vault-relative key; a path outside the vault is skipped
- [ ] An E2E that a note created via "New Event" is found by text search before any edit

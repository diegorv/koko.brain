# 55: Icon and favorite writers go through `updateNoteFrontmatter`

**What to build:** `frontmatter-icon.service.ts` and `toggleFavoriteForPath` write through `updateNoteFrontmatter` (dirty-tab aware, refuses lossy frontmatter, runs the after-save observers) instead of writing the file directly.

**Blocked by:** None

**Status:** ready-for-agent

- Disk-direct writers: `src/lib/features/file-icons/frontmatter-icon.service.ts:22-54` (`setFrontmatterIcon`, `removeFrontmatterIcon` at `:57`) and `src/lib/features/type-definitions/type-definitions.service.ts:236` (`toggleFavoriteForPath`). Plan D-notes: they "clobber dirty tabs and skip the after-save observers".
- Plan: `.scratch/calendar-feature/plan-2026-10-28.md`, deleted by ticket 37; read it with `git show c0103ff5:.scratch/calendar-feature/plan-2026-10-28.md`.
- Writer: `src/lib/features/properties/frontmatter-write.service.ts`. Note ADR-0029's amendment: the calendar writer refuses lossy frontmatter while these writers drop; decide whether they adopt the refusal (and how the UI reports it).

- [ ] Both writers use `updateNoteFrontmatter`; a dirty open tab keeps its edits
- [ ] The refusal behavior is decided and tested

## Comments

- 2026-10-28 18:30 — discovery — both writers move to updateNoteFrontmatter; refusal adopted with a toast; remove keeps its no-op early return — base 48e49feb
- 2026-10-28 18:34 — implement — icon and favorite writers use updateNoteFrontmatter; lossy refusal toasted (toastFrontmatterWriteError), icon store untouched on refusal; ADR-0029 amended; pnpm check 0 errors — 4af94d3b
- 2026-10-28 18:37 — review — CHANGES_REQUESTED: ACs met; auto-move icon rule toasts a refusal on every save of a lossy note (medium), toast does not name the note, no after-save observer test — 6a2d2daa

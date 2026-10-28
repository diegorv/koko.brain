# 55: Icon and favorite writers go through `updateNoteFrontmatter`

**What to build:** `frontmatter-icon.service.ts` and `toggleFavoriteForPath` write through `updateNoteFrontmatter` (dirty-tab aware, refuses lossy frontmatter, runs the after-save observers) instead of writing the file directly.

**Blocked by:** None

**Status:** ready-for-agent

- Disk-direct writers: `src/lib/features/file-icons/frontmatter-icon.service.ts:22-54` (`setFrontmatterIcon`, `removeFrontmatterIcon` at `:57`) and `src/lib/features/type-definitions/type-definitions.service.ts:236` (`toggleFavoriteForPath`). Plan D-notes: they "clobber dirty tabs and skip the after-save observers".
- Writer: `src/lib/features/properties/frontmatter-write.service.ts`. Note ADR-0029's amendment: the calendar writer refuses lossy frontmatter while these writers drop; decide whether they adopt the refusal (and how the UI reports it).

- [ ] Both writers use `updateNoteFrontmatter`; a dirty open tab keeps its edits
- [ ] The refusal behavior is decided and tested

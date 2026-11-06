# 92: Search results and link rows reserve a gutter for their hover actions

**Migrated from:** `.scratch/ux-polish/issues/71-hover-action-gutter.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Polish/low. It shows only on event notes.

**Audit check at `5f8003d67`:** still_present (polish, low). src/lib/features/search/SearchResult.svelte:175-178 places ShowInCalendarButton absolute right-1 bottom-1 over the card with no pr-7 on the snippet/subtitle; src/lib/features/backlinks/LinkItem.svelte:34 places it absolute right-1 top-0.5 over the title row with no gutter. The button renders only when the note is an event (ShowInCalendarButton.svelte:64 {#if isEvent}) and is always visible, not hover-only, so overlap affects event notes only. LayoutSection.svelte:133-165: the Search row has no chevrons and Search/Today rows have no switch, so chevrons land in a different column per row.

**Stale in the text below:** Line numbers shifted (SearchResult about 176 is now 175-178; LinkItem about 34 is the same). The action is not hover-only: it shows whenever the note is an event, which the owner does not list as daily use.

**What to build:** The hover calendar action covers the end of the text in `SearchResult.svelte` (about line 176) and `LinkItem.svelte` (about line 34). Reserve a `pr-7` gutter for the action. Also align the LayoutSection chevrons on one column and reserve the switch slot.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Component tests assert the text container keeps the gutter padding
- [ ] The action stays clickable (existing tests green)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Shell layout row 9.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/71-hover-action-gutter.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.

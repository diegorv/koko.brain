# 71: Search results and link rows reserve a gutter for their hover actions

**What to build:** The hover calendar action covers the end of the text in `SearchResult.svelte` (about line 176) and `LinkItem.svelte` (about line 34). Reserve a `pr-7` gutter for the action. Also align the LayoutSection chevrons on one column and reserve the switch slot.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Component tests assert the text container keeps the gutter padding
- [ ] The action stays clickable (existing tests green)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Shell layout row 9.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/92-search-results-link-rows-reserve-gutter-their.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.

# 62: The collection table reads as a table

**What to build:** The collection table shows raw keys as headers (`collection.logic.ts`, about line 389 falls back to `key`), header and cells at the same size, native disabled checkboxes for booleans (`CollectionTableView.svelte`, about line 65), icon names as text (about line 72), no truncation and a header that scrolls away. Humanize the header fallback without changing stored config, style the header as a `section-label`, render `true` as a read-only check icon, truncate cells at `max-w-80` with a `title`, and make the header sticky on the real scroller (`CollectionView.svelte`, about line 587).

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: `collection.logic` test for the humanized header fallback (`due_date` reads "Due date"), with stored config unchanged
- [ ] Component tests for the check icon and truncation
- [ ] The header stays visible while the table scrolls (E2E or component check)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Feature views row 5.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/215-collection-table-reads-table.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.

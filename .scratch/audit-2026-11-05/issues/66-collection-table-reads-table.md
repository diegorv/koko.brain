# 66: The collection table reads as a table

**Migrated from:** `.scratch/ux-polish/issues/62-collection-table-readable.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Still present, polish/medium on daily views. A sticky header has to account for the inner overflow-auto at CollectionTableView.svelte:39.

**Audit check at `5f8003d67`:** still_present (polish, medium). Every point still holds at HEAD. The header fallback to the raw key is in collection.logic.ts:456 (resolveColumns toColumn: `definition.properties?.[key]?.displayName ?? key`). Booleans are a native disabled checkbox (CollectionTableView.svelte:64-65). Icon display values render their name as text (:71-72). Cells use whitespace-nowrap with no truncation or title (:61). The thead is not sticky (:41-52).

**Stale in the text below:** The header fallback is at collection.logic.ts:456, not about line 389. The real scroller is CollectionView.svelte:684 (`flex-1 overflow-auto`), not about line 587. CollectionTableView.svelte:39 also wraps the table in its own `overflow-auto` div, which a sticky header has to account for: as the inner scroll container it would capture `position: sticky`. Status is still needs-triage, so it needs triage before relay.

**What to build:** The collection table shows raw keys as headers (`collection.logic.ts`, about line 389 falls back to `key`), header and cells at the same size, native disabled checkboxes for booleans (`CollectionTableView.svelte`, about line 65), icon names as text (about line 72), no truncation and a header that scrolls away. Humanize the header fallback without changing stored config, style the header as a `section-label`, render `true` as a read-only check icon, truncate cells at `max-w-80` with a `title`, and make the header sticky on the real scroller (`CollectionView.svelte`, about line 587).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: `collection.logic` test for the humanized header fallback (`due_date` reads "Due date"), with stored config unchanged
- [ ] Component tests for the check icon and truncation
- [ ] The header stays visible while the table scrolls (E2E or component check)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Feature views row 5.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/62-collection-table-readable.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.

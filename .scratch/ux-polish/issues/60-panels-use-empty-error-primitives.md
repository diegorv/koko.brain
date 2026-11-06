# 60: Sidebar panels and settings use the empty and error primitives

**What to build:** Move the sidebar panels (tags, tasks, backlinks, outgoing links, table of contents, search) and the settings sections that show empty or error text onto `EmptyState` and `InlineAlert`. Replace raw `String(err)` UI copy in TodoistPopover, SearchSection and EventCalendarView with a fixed message plus the error in the log.

**Blocked by:** 59

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] No panel renders raw `String(err)` text (test per site)
- [ ] Empty and error states use the primitives (component tests on the migrated panels)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Feature views row 6; dropped from Issue 06 as copy and presentation work.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/146-sidebar-panels-settings-use-empty-error-primitives.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.

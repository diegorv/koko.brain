# 146: Sidebar panels and settings use the empty and error primitives

**Migrated from:** `.scratch/ux-polish/issues/60-panels-use-empty-error-primitives.md` (audit 2026-11-05). Priority: later (refactor, deferred, feature) (bucket 5-later). A refactor that needs 59's primitives. The EventCalendarView part is already gone.

**Audit check at `5f8003d67`:** design_or_refactor (refactor, low). Blocked by 59, whose primitives do not exist. Raw String(err) still rendered as UI text at src/lib/features/tasks/TodoistPopover.svelte:76,89,107 (shown at :217) and src/lib/features/search/SearchSection.svelte:50,86 (shown at :122,:156). Tauri commands reject with strings, so String(err) is mostly already the message; the owner does not list Todoist or semantic-model downloads as daily use.

**Stale in the text below:** EventCalendarView no longer renders raw String(err) as panel copy: lines 140 and 212 use err.message in a toast description, and line 242 shows eventCalendarStore.loadError with role=alert. Only TodoistPopover and SearchSection still match the Issue text.

**What to build:** Move the sidebar panels (tags, tasks, backlinks, outgoing links, table of contents, search) and the settings sections that show empty or error text onto `EmptyState` and `InlineAlert`. Replace raw `String(err)` UI copy in TodoistPopover, SearchSection and EventCalendarView with a fixed message plus the error in the log.

**Blocked by:** 145

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] No panel renders raw `String(err)` text (test per site)
- [ ] Empty and error states use the primitives (component tests on the migrated panels)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Feature views row 6; dropped from Issue 06 as copy and presentation work.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/60-panels-use-empty-error-primitives.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.

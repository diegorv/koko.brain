# 70: Settings groups render as cards with dividers

**What to build:** After Issue 24 fixes the row anatomy (its part 2, merged from Issue 25), render each settings group as one card with `divide-y` between rows instead of separate row backgrounds. Review both themes.

**Blocked by:** 24

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] The shared group wrapper renders rows inside one card with dividers (component test)
- [ ] Every settings section uses it (test over `sectionComponents`)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "Settings row anatomy" (deferred there as a separate visual change).
- Owner check: a visible style change across every settings page.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/96-settings-groups-render-cards-dividers.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.

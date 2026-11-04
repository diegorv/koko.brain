# 70: Settings groups render as cards with dividers

**What to build:** After Issue 25 fixes the row anatomy, render each settings group as one card with `divide-y` between rows instead of separate row backgrounds. Review both themes.

**Blocked by:** 25

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] The shared group wrapper renders rows inside one card with dividers (component test)
- [ ] Every settings section uses it (test over `sectionComponents`)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "Settings row anatomy" (deferred there as a separate visual change).
- Owner check: a visible style change across every settings page.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

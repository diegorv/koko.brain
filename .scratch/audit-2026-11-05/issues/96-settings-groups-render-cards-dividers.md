# 96: Settings groups render as cards with dividers

**Migrated from:** `.scratch/ux-polish/issues/70-settings-grouped-cards.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Design polish that ends with the owner's visual check. Its blocker 24 is resolved.

**Audit check at `5f8003d67`:** design_or_refactor (polish, low). Blocker Issue 24 is resolved (c43c873bd, row anatomy done). src/lib/core/settings/sections/SettingItem.svelte:19-23 still gives every row its own rounded-lg bg-setting-item-bg; sections such as EditorSection.svelte:37 stack rows with flex-col gap-2; no shared group wrapper and no divide-y anywhere in src/lib/core/settings. Owner-check visual restyle, not a defect.

**What to build:** After Issue 24 fixes the row anatomy (its part 2, merged from Issue 25), render each settings group as one card with `divide-y` between rows instead of separate row backgrounds. Review both themes.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] The shared group wrapper renders rows inside one card with dividers (component test)
- [ ] Every settings section uses it (test over `sectionComponents`)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "Settings row anatomy" (deferred there as a separate visual change).
- Owner check: a visible style change across every settings page.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/70-settings-grouped-cards.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.

# 52: Right sidebar sections share one header recipe and one left edge

**What to build:** The right sidebar has three left edges and a flat hierarchy: Properties at 12px (`PropertiesView.svelte`, about line 152), its rows at 16px (`px-2` inside `p-2`, about line 256), Table of contents, Backlinks and Outgoing links at about 32px, all titles in `text-title` accent. Add a `SidebarSection` wrapper (`h-10 px-3` header with a reserved chevron slot, `border-t border-divider` between sections) and use it for the four sections; "Relationships" becomes a `section-label` sub-heading. Keep one add-property entry point.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] All four sections render through the wrapper; a component test asserts the shared header structure
- [ ] Section contents align on one left edge in both themes (screenshot check noted in the commit)
- [ ] Existing panel tests stay green

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Shell layout row 6; `work/layout.md`.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/94-right-sidebar-sections-share-one-header-recipe.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.

# 94: Right sidebar sections share one header recipe and one left edge

**Migrated from:** `.scratch/ux-polish/issues/52-right-sidebar-sections.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). It is visual consistency work, not a defect, and its mismatch is smaller since Issue 50.

**Audit check at `5f8003d67`:** design_or_refactor (polish, low). No SidebarSection component exists (rg SidebarSection src: no match). PropertiesView.svelte:154-158 now uses the shared pane-toolbar band (Issue 50), then p-2 body with px-2 rows (:168, :178), and a 'Relationships' text-title h2 at :257. BacklinksPanel.svelte:56-60, OutgoingLinksPanel.svelte:54-58 and TableOfContentsPanel.svelte:48-51 use h-10 px-3 headers with ml-1.5 titles and p-2 bodies. Left edges still differ between Properties and the other three. Status is needs-triage in the Issue.

**Stale in the text below:** The '12px' Properties header description is out of date because Issue 50 moved it onto pane-toolbar; the spacing mismatch remains but is smaller than described. This is visual consistency work, not a defect.

**What to build:** The right sidebar has three left edges and a flat hierarchy: Properties at 12px (`PropertiesView.svelte`, about line 152), its rows at 16px (`px-2` inside `p-2`, about line 256), Table of contents, Backlinks and Outgoing links at about 32px, all titles in `text-title` accent. Add a `SidebarSection` wrapper (`h-10 px-3` header with a reserved chevron slot, `border-t border-divider` between sections) and use it for the four sections; "Relationships" becomes a `section-label` sub-heading. Keep one add-property entry point.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] All four sections render through the wrapper; a component test asserts the shared header structure
- [ ] Section contents align on one left edge in both themes (screenshot check noted in the commit)
- [ ] Existing panel tests stay green

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Shell layout row 6; `work/layout.md`.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/52-right-sidebar-sections.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.

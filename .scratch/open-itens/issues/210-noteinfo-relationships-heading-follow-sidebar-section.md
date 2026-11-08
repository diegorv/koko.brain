# 210: NoteInfo and the Relationships heading follow the right sidebar section recipe

**Origin:** `audit-2026-11-05` Issue 164, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Three leftovers from Issue 94's review (`.scratch/audit-2026-11-05/work/94/review.md`, findings 1, 2 and 4), after Issue 94 drew the four right sidebar sections through `SidebarSection` (src/lib/core/layout/SidebarSection.svelte).

1. NoteInfo (src/lib/features/properties/NoteInfo.svelte:43-46) still draws its own icon-led `text-title` h2, about 36 px against the 30 px of the four section titles, so the sidebar keeps two title edges. Render it through `SidebarSection` (static, not collapsible), or record in the Notes why it stays different.
2. The "Relationships" sub-heading (src/lib/features/properties/PropertiesView.svelte:244) uses the same `section-label` recipe as the kind labels under it (:249, "Belongs to", "Related to"), so it reads as their sibling. Owner decision below.
3. The collapsible header in SidebarSection.svelte:110-122 renders an `h2` inside a `button`, which is invalid HTML (carried over from the old `Collapsible.Trigger`). Put the `button` inside the `h2`, as in the WAI-ARIA accordion pattern, keeping the click target and the aria attributes.

**Blocked by:** none

**Status:** needs-info

**Owner decision needed:** for item 2, drop the "Relationships" heading (the kind labels already name themselves), or keep it and make it weightier (for example a stronger weight plus `mb-2`).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in the NoteInfo component test (src/tests/lib/features/properties/): NoteInfo renders its title through SidebarSection, so the title carries the same section-title classes as the Backlinks section. It fails today.
- [ ] The Relationships heading follows the owner decision above (removed, or a weight that sets it apart from the kind labels), with a render test.
- [ ] In src/tests/lib/core/layout/SidebarSection.test.ts: the collapsible header has a `button` inside an `h2`, not an `h2` inside a `button`, and clicking it still toggles the section and sets aria-expanded.
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Notes

- **Source:** Issue 94's review, findings 1, 2 and 4 (finding 3 was fixed in Issue 94). Polish, size S. Not in the first wave.

## Comments

- 2026-11-06: filed by the main session from Issue 94's review.

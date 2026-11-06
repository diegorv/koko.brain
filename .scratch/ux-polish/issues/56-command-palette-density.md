# 56: The command palette shows dense one-line rows with key hints

**What to build:** The palette forces `py-3` rows with 20px icons (`src/lib/components/ui/command/command-dialog.svelte`, about line 33), shows about 4.5 rows (`max-h-[300px]`) and has a close X. Make rows one line `h-9` with the category muted on the right, raise the list to `max-h-[min(60vh,400px)]`, add a footer with key hints (Enter, arrows, Esc), and drop the close X. Use a density prop on the item instead of descendant selectors.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Component tests assert one-line rows, no close button, and the footer hints
- [ ] Keyboard navigation and Escape still work (existing tests green)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "Overlay anatomy" (palettes) and section 3 Overlays row 6.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/70-command-palette-shows-dense-one-line-rows.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.

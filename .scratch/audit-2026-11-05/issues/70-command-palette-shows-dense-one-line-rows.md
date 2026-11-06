# 70: The command palette shows dense one-line rows with key hints

**Migrated from:** `.scratch/ux-polish/issues/56-command-palette-density.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Polish/medium. CommandDialog is shared with QuickSwitcher, TemplatePicker and OneOnOnePicker, which the Issue does not mention.

**Audit check at `5f8003d67`:** still_present (polish, medium). src/lib/components/ui/command/command-dialog.svelte:31-35 still forces py-3 rows, 20px icons and h-12 input; command-list.svelte:13 still max-h-[300px]; the Dialog.Content at dialog-content.svelte:36-45 still renders the close X (showCloseButton defaults true, CommandDialog does not pass false). src/lib/features/command-palette/CommandPalette.svelte renders each row as two stacked lines (label + category below) and has no key-hint footer. No later commit touched this (git log on command-dialog/command-palette shows only Issues 57, 22, 27, 25, 21, 07, 03).

**Stale in the text below:** Line numbers fine (about line 33 is now 31-35). CommandDialog is shared by QuickSwitcher, TemplatePicker and OneOnOnePicker, so a density change hits those too, not only the palette; the Issue does not say so.

**Owner decision (2026-11-06):** the dense rows go into the shared CommandDialog, so the Quick Switcher, Template picker and One-on-one picker change too.

**What to build:** The palette forces `py-3` rows with 20px icons (`src/lib/components/ui/command/command-dialog.svelte`, about line 33), shows about 4.5 rows (`max-h-[300px]`) and has a close X. Make rows one line `h-9` with the category muted on the right, raise the list to `max-h-[min(60vh,400px)]`, add a footer with key hints (Enter, arrows, Esc), and drop the close X. Use a density prop on the item instead of descendant selectors.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Component tests assert one-line rows, no close button, and the footer hints
- [ ] Keyboard navigation and Escape still work (existing tests green)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "Overlay anatomy" (palettes) and section 3 Overlays row 6.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/56-command-palette-density.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: owner decision recorded from the 2026-11-06 survey; status ready-for-agent.

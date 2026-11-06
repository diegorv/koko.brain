# 06: Docs for the rail forms

**What to build:** the docs describe the rail as Issues 01-05 left it. No app code. Read the shipped code first; describe what it does, including the final pane sizes.

- **`docs/adr/0033-icon-rail-and-note-list-replace-sidebar-modes.md`:** a dated amendment in the file's style. Whole-rail scroll replaces "the group scrolls and the rest of the rail stays fixed" from the 2026-11-04 pinned items amendment. The three forms, the `layout.railStyle`, `layout.railCollapsed` and `layout.railWidth` keys with their defaults and `parse*` functions, width saved when the drag ends, the fixed palette and the theme-independent reason for the full-text-color active title, divider token and why, the new default pane sizes with the editor width they give at 1440 px, replacing "navigator 14 %, note list 20 %, right sidebar 20 %" and "about 640 px", `--rail-header-pad` and why a CSS variable, and the mod `color` manifest key. Name the code.
- **`help/documentation/01-getting-started.md`:** § The Rail (it says "column of icons", "Hover an icon for its name" and "With many pins, this group scrolls"), and lines 54, 73 and 82, which say "icon rail" and "the rail never hides". Explain the toggle and that it differs from Cmd+Shift+B.
- **`help/documentation/19-settings.md`:** § Layout > Rail, rows for Rail style and Collapse rail with their keys and defaults, and a sentence on `layout.railWidth`, which has no control other than dragging.
- **`help/documentation/02-file-explorer.md:3`, `07-sidebar-panels.md:5`:** "icon rail".
- **`help/documentation/26-theming.md:126,135`:** the rail's dividers no longer use `fileExplorerBorder`, and its item colors do not come from the theme. Say which tokens still apply (the edge uses the border token, titles use `fileExplorerFg`).
- **`help/documentation/25-types-and-relationships.md` § Pinned Rail Items** and anything else a search for `icon rail`, `column of icons` or `48 px` finds under `help/` and `docs/`. Do not rewrite amendments that record past states in other ADRs.
- `28-mods.md` was done in Issue 05. Screenshots are not regenerated.

**Blocked by:** 05

**Status:** ready-for-agent

**Gate:** docs only: `pnpm check` + `pnpm vitest run` for the help tests.

- [ ] ADR-0033 has the amendment, with every item above, and states the final pane sizes as they are in `settings.store.svelte.ts`.
- [ ] `git grep -n -E "icon rail|column of icons|Hover an icon" help/` finds nothing that describes the current rail.
- [ ] `help/documentation/19-settings.md` lists the three keys with the defaults the code has.
- [ ] `help/documentation/26-theming.md` no longer says the border token paints the rail's dividers.
- [ ] No file outside `docs/`, `help/` and `.scratch/rail-styles/` changes.

## Notes

- Every value in the docs comes from the code as delivered, not from the PRD: Issues 01-05 may have adjusted pane sizes.

## Comments

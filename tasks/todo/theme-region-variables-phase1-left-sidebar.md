# Phase 1: Left Sidebar Region Variables

Add per-region foreground, muted foreground, and accent variables for the left sidebar so themes can independently control sidebar text colors without clashing with global foreground.

## Tasks

- [x] Task 1: Add `fileExplorerFg`, `fileExplorerMutedFg`, `fileExplorerAccent` to `UIColors` type + default theme + `app.css`
- [x] Task 2: Wire `FileExplorer.svelte` + `FileTreeItem.svelte` + `FileExplorerHeader.svelte` to new vars
- [x] Task 3: Wire `SearchPanel.svelte` + `SearchResult.svelte` to new vars
- [x] Task 4: Wire `CalendarPanel.svelte` + `CalendarGrid.svelte` to new vars
- [x] Task 5: Wire `TypeSidebar.svelte` to new vars
- [x] Task 6: Verify — `pnpm check` + `pnpm vitest run` pass

## Notes

- Defaults match current global values — zero visual change on deploy.
- `mergeThemeWithDefaults()` handles backward compat automatically.
- ThemeEditor renders new fields dynamically — no UI work needed.
- Part of 3-phase plan: Phase 2 = right sidebar, Phase 3 = editor.

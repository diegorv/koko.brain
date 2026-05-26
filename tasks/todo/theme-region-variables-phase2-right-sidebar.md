# Phase 2: Right Sidebar Region Variables

Add per-region background, foreground, muted foreground, and accent variables for the right sidebar so themes can independently control right sidebar colors.

## Tasks

- [x] Task 1: Add `rightSidebarBg`, `rightSidebarFg`, `rightSidebarMutedFg`, `rightSidebarAccent` to `UIColors` type + default theme + `app.css`
- [x] Task 2: Wire `AppShell.svelte` right pane container to `bg-right-sidebar-bg`
- [x] Task 3: Wire `BacklinksPanel.svelte` + `LinkItem.svelte` to new vars
- [x] Task 4: Wire `OutgoingLinksPanel.svelte` to new vars
- [x] Task 5: Wire `PropertiesView.svelte` + `PropertyField.svelte` + `LifecycleActions.svelte` to new vars
- [x] Task 6: Wire `TableOfContentsPanel.svelte` to new vars
- [x] Task 7: Verify — `pnpm check` + `pnpm vitest run` pass

## Notes

- Defaults match current global values — zero visual change on deploy.
- Part of 3-phase plan: Phase 1 (left sidebar) done. Phase 3 = editor.

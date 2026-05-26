Status: done

# Left sidebar refactor + selection state

## Parent

`.scratch/type-panel-layout/PRD.md`

## What to build

Refactor TypeSidebar from a collapsible tree (types with inline notes) into a flat navigation list. Two sections:

1. **Top nav items** above the types list: Inbox, All Notes, Archive, Favorites. Each shows a cross-type count. Clicking one sets the selection to that nav item.

2. **Types list** below a separator: type names with icons, counts, and no inline note expansion. Clicking a type sets the selection to that type (highlight it visually). No more collapse/expand toggle.

Add a `selectedTypeOrNav` reactive state to the type-definitions store. It holds either a type name string or a nav item identifier (inbox/all/archive/favorites). Default to the first type on mount.

Remove the filter tabs (All/Inbox/Archived/Favorites) from the left sidebar header entirely -- filtering moves to the middle panel in a later slice.

Context menus on type rows stay (New note of type, Open definition, Change icon, Copy path, Reveal in Finder). Note-level context menus are removed from the sidebar (they move to the middle panel in slice 02).

## Acceptance criteria

- [ ] TypeSidebar shows top nav items (Inbox, All Notes, Archive, Favorites) with cross-type counts
- [ ] TypeSidebar shows type names + counts without inline note lists
- [ ] Clicking a type or nav item updates `selectedTypeOrNav` in the store
- [ ] Selected item has a visual highlight (e.g., `bg-primary/25` or similar)
- [ ] Filter tabs (All/Inbox/Archived/Favorites) are removed from the sidebar header
- [ ] Untyped section still shows at the bottom with count (clickable, sets selection)
- [ ] Type context menus still work (New, Open definition, Change icon, etc.)
- [ ] Tests cover: selection state changes, nav item counts, type list rendering
- [ ] `pnpm check` passes
- [ ] `pnpm vitest run` passes

## Blocked by

None - can start immediately

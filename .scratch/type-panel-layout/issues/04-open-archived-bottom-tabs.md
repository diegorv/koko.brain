Status: ready-for-agent

# Open/Archived bottom tabs

## Parent

`.scratch/type-panel-layout/PRD.md`

## What to build

Add Open/Archived sub-filter tabs at the bottom of the middle panel, styled like Tolaria's bottom bar. Each tab shows its count (e.g., "Open 3", "Archived 1").

Visibility rules:
- **Show** for type selections and "All Notes" nav item
- **Hide** for Inbox, Archive, and Favorites nav items (these are already filtered by definition)

When shown, default to "Open" tab. Switching tabs filters the note list in the middle panel:
- **Open**: notes where `archived === false`
- **Archived**: notes where `archived === true`

The sub-filter state is local to the middle panel component (not persisted in settings). Resets to "Open" when changing the selected type or nav item.

## Acceptance criteria

- [ ] Bottom tab bar appears when a type is selected
- [ ] Bottom tab bar appears when "All Notes" is selected
- [ ] Bottom tab bar is hidden for Inbox, Archive, Favorites selections
- [ ] Each tab shows its count
- [ ] "Open" tab selected by default
- [ ] Switching tabs filters the note list correctly
- [ ] Sub-filter resets to "Open" when changing selection
- [ ] Tests cover: tab visibility rules, filtering logic, count computation, reset behavior
- [ ] `pnpm check` passes
- [ ] `pnpm vitest run` passes

## Blocked by

- `.scratch/type-panel-layout/issues/02-middle-panel-note-list.md`

Status: ready-for-agent

# Cross-type views in middle panel

## Parent

`.scratch/type-panel-layout/PRD.md`

## What to build

When a top nav item is selected in the left sidebar (Inbox, All Notes, Archive, Favorites), the middle panel should display matching notes across all types.

Filtering logic per nav item:
- **Inbox**: notes where `organized === false` and `archived === false` (unorganized notes, requires `explicitOrganization` setting enabled)
- **All Notes**: all non-archived notes (regardless of type)
- **Archive**: notes where `archived === true`
- **Favorites**: notes where `favorite === true`

Adjust the middle panel header for cross-type views:
- Show the nav item name as the title (e.g., "All Notes", "Inbox")
- Hide the "+" create button (no single type to create for)
- Optionally show a relevant icon next to the title

Note cards use the same format as type views (icon + title + date). The icon resolves per-note (custom icon -> type icon -> generic file icon).

Extract the filtering logic into a pure function in a logic file so it's testable without UI.

## Acceptance criteria

- [ ] Selecting "All Notes" shows all non-archived notes in the middle panel
- [ ] Selecting "Inbox" shows unorganized, non-archived notes (when explicitOrganization enabled)
- [ ] Selecting "Archive" shows archived notes
- [ ] Selecting "Favorites" shows favorited notes
- [ ] Middle panel header shows nav item name, no "+" button
- [ ] Note cards render correctly with per-note icon resolution
- [ ] Pure filtering function exists in a logic file with unit tests
- [ ] `pnpm check` passes
- [ ] `pnpm vitest run` passes

## Blocked by

- `.scratch/type-panel-layout/issues/02-middle-panel-note-list.md`

# Issue 07 discovery: palette shortcut hint and Settings sidebar text

## Re-verified on main

- F12: `features/command-palette/command-palette.service.ts:207-213` hard-codes
  `shortcut: { meta: true, shift: true, key: 'e' }` for `layout:cycle-sidebar-view`.
  The real binding lives in `settingsStore.keybindings.cycleSidebarView`
  (`core/settings/settings.store.svelte.ts:68`, rebound by
  `core/settings/sections/KeybindingsSection.svelte:51`).
- `CommandPalette.svelte:11` calls `getBuiltInCommands()` once at mount, and the
  component is always mounted (`core/layout/AppOverlays.svelte:14`), so a value
  copied at build time would go stale after a rebind. The template renders
  `formatShortcut(command.shortcut)` (`CommandPalette.svelte:59`).
- `CommandShortcut` (`command-palette.types.ts:9-15`) has no `ctrl`, and
  `formatShortcut` (`command-palette.logic.ts:11-24`) prints only ⌘⇧⌥. A user
  binding with Ctrl would lose its modifier in the hint.
- "Tags": `core/settings/sections/GeneralSection.svelte:12` description and
  `core/settings/settings.types.ts:56` JSDoc. The right sidebar's panels are
  Properties, Backlinks, Outgoing links, Table of Contents (the section's own
  toggles, `GeneralSection.svelte:24-57`, and `settings.types.ts:57-65`).

## Plan

1. Palette: make `shortcut` a getter on the cycle command that maps
   `settingsStore.keybindings.cycleSidebarView` to a `CommandShortcut`. Reading
   the store at render keeps the hint live without rebuilding the command list.
2. Add `ctrl?: boolean` to `CommandShortcut`; `formatShortcut` prints ⌃ before
   ⌘ (default stays ⌘⇧E; existing ⌘⇧⌥ order unchanged).
3. Text: "Show the right sidebar (Properties, Backlinks, Outgoing links, Table
   of Contents)"; JSDoc lists the same panels.

## Tests

- `src/tests/lib/features/command-palette/command-palette.service.test.ts`:
  default formats ⌘⇧E; after `settingsStore.updateKeybindings` the same command
  object formats the new binding (pattern: the `event-calendar:toggle` test
  using `formatShortcut`, line ~146).
- `command-palette.logic.test.ts`: ctrl prints ⌃.

## Risks / defaults

- Not unifying the two formatters (⌘⇧ vs ⇧⌘ order) from F12: out of scope; the
  Issue keeps ⌘⇧E as the default hint.
- Special keys (arrows, Space) print as `formatShortcut` uppercases them
  (e.g. ARROWUP); pre-existing palette behavior, not changed here.

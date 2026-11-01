# Issue 25 discovery: remove the classic shell

No `spec.md`; the source is `PRD.md` (Rollout step 4, Q6, shortcut table: Cmd+Shift+E -> nothing).
Blockers 23, 24, sidebar-fixes 02 and 07 say `**Status:** resolved` on main.

## Files that change (src/lib unless noted)
- `core/settings/settings.types.ts:49-110,325-345,384`: drop `SidebarMode`, `LayoutShell`, `shell`,
  `railMigrated`, `sidebarMode`, `leftSidebarVisible`, `leftPaneSize`, `middlePanelSize`,
  `KeybindingConfig`, `KeybindingsSettings`, `AppSettings.keybindings`, the `'keybindings'` section.
- `core/settings/settings.store.svelte.ts:53-82,169,256-266`: defaults, `keybindings` getter, `updateKeybindings`.
- `core/settings/settings.logic.ts:4-31,191`: `migrateShellToRail` goes; a pure `mergeLayout(defaults, saved)`
  keeps only the keys `defaults` has (stale keys dropped, so they are not written back).
- `core/settings/settings.service.ts:79-89`: layout via `mergeLayout`; `keybindings` no longer merged.
- `core/settings/SettingsPanel.svelte`, `sections/KeybindingsSection.svelte` (deleted: its only row was the
  cycle binding), `sections/GeneralSection.svelte:11-26` (Layout select).
- `core/keybindings/global-keybindings.ts:22-50,64,132-145,209-211`; `core/keybindings/keybindings.logic.ts`
  (deleted: only the recorder and the cycle listener used it). Cmd+Shift+C calls `toggleEventCalendarTab` directly.
- `core/layout/layout.service.ts`, `layout.logic.ts:1-14`: `cycleSidebarMode`, `nextSidebarMode`, shell guards.
- `core/layout/AppShell.svelte`: classic branches, left toggle button, spacers, classic resize handlers.
- `features/command-palette/command-palette.service.ts:204-215`: Cycle Sidebar View entry.
- `features/search/open-search.service.ts`, `SearchPanel.svelte` (`rail` prop), `search.store.svelte.ts`
  (`isOpen` / `setOpen` / `toggle` if nothing else reads them).
- `features/rail-shell/neighbourhood.service.ts:12`, `features/note-action-bar/NoteActionBar.svelte:78`: shell checks.
- Deleted components (callers traced: AppShell only): `core/file-explorer/*`, `features/type-definitions/
  {TypeSidebar,TypeNoteList,SidebarModeToggle}.svelte`, `plugins/calendar/{CalendarPanel,OpenCalendarButton}.svelte`,
  plus exports only they used.
- Help: `01`, `02`, `08`, `19`, `20`, `25`, `27`; help tests under `src/tests/help/`.
- E2E: `test-vault.ts` loses the `shell` option (always rail); `helpers.ts` `openTreeItem` opens through the
  Files navigator; specs pinned to classic (or asserting `[role="tree"]`) move to the rail.

## Plan (test-first where there is a seam)
1. `settings.logic.test.ts` / `settings.service.test.ts`: an old file with `sidebarMode`, `shell`, `railMigrated`,
   `leftSidebarVisible`, `leftPaneSize`, `middlePanelSize`, `keybindings.cycleSidebarView` loads and the written
   file has none of them; rail keys kept. Then the type/store removal.
2. Keybindings, palette, layout service, search, AppShell, components, tests.
3. Help pages, E2E fixture/helper/specs, ADR 0033 amendment.

## Defaults taken
- The Settings Keybindings section is removed: the cycle binding was its only row (nothing left to show).
- `railPanelsVisible` and the rail keys keep their names (renames are out of scope).
- `toggleSearch` goes; Cmd+Shift+F and the palette call `openSearch` (the rail had no closed state).

## Risks
- E2E: about 28 specs open notes through the classic tree; the helper change touches all of them.
- Unit tests for deleted components go with them; logic exports used only by them go too (traced per export).

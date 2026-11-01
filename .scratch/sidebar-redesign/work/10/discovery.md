# Issue 10 discovery: Cmd+1, Cmd+2 and Cmd+Shift+B in the rail shell

No `spec.md`; the source is `PRD.md` (Layout, Shortcuts, Q12). Builds on `work/07` (rail shell in AppShell).

## Files that change
- `core/settings/settings.types.ts:54-78`, `settings.store.svelte.ts:52-65`: `layout.railPanelsVisible: boolean`
  (default `true`). The loader spreads `parsed.layout` over defaults, so old files load with the panels shown.
- `core/layout/layout.service.ts:22-26`: `hideRailPanels()` / `showRailPanels()` (no-ops in the classic shell) and
  `toggleLeftSidebar()` flips `railPanelsVisible` in the rail shell instead of returning (today it is a no-op there).
- `core/keybindings/global-keybindings.ts:120-129`: register Cmd+1 -> `hideRailPanels`, Cmd+2 -> `showRailPanels`.
- `core/keybindings/keybindings.logic.ts:101-125`: `RESERVED_KEYBINDINGS` gains Cmd+1 / Cmd+2 so the Cycle Sidebar
  View recorder warns on them.
- `core/layout/AppShell.svelte:121-140`: wrap the rail note-list pane + handle in `{#if railPanelsVisible}`; when hidden,
  a `w-6` spacer (`bg-tab-bar` strip with the `--divider` shadow over `bg-editor-bg`, same tokens as the classic
  traffic-light spacer) keeps the tabs at x >= 72 px, clear of the traffic lights that overflow the 48 px rail.
- Help: `help/documentation/20-keyboard-shortcuts.md` (Navigation table + reference card), `01-getting-started.md:84`,
  `06-search-and-navigation.md:61`.

## Plan (test-first)
1. `layout.service.test.ts`: hide/show/toggle in the rail shell persist `railPanelsVisible`; no-ops in classic
   (classic toggle still flips `leftSidebarVisible`, rail toggle leaves it alone).
2. `global-keybindings.test.ts`: count 23 -> 25; Cmd+1 / Cmd+2 / Cmd+Shift+B handlers in both shells.
3. `keybindings.logic.test.ts`: Cmd+1 / Cmd+2 are reported as conflicts.
4. `settings.service.test.ts`: missing key loads `true`; saved `false` is restored (persists across restarts).
5. E2E `rail-shell.spec.ts`: Cmd+1 hides the list (tab x >= 72, spacer visible), Cmd+2 shows it, Cmd+Shift+B
   toggles, settings.json carries `railPanelsVisible`.

## Prior art
`layout.service.test.ts` (`persisted()` helper), `global-keybindings.test.ts` (`findHandler`, `persistedAfter`),
`sidebars.spec.ts` "keeps the tabs clear of the traffic lights" (spacer + tab bounding box).

## Defaults taken
- There is no navigator yet (Types / Calendar / Files navigators come later); the flag is named for both panels so
  a navigator pane added later sits under the same `{#if}`.
- One flag for the pair, separate from `leftSidebarVisible`, so switching shells never carries one shell's hidden
  state into the other.
- The "Toggle Left Sidebar" palette command shares `toggleLeftSidebar`, so it toggles the panels in the rail shell too.
  No new palette commands.

## Risks
- Paneforge: removing the list pane resizes the editor pane; `noteListSize` is restored from settings on show.
- Cmd+1 / Cmd+2 must not be bound by CodeMirror or the tab bar (checked: no `Mod-1` / `Digit1` bindings in `src/lib`).

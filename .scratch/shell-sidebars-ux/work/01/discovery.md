# Discovery: Issue 01, palette panel toggles and Open Trash

No `spec.md` exists for shell-sidebars-ux; the Issue is the spec.

## Files that change

- `src/lib/core/layout/layout.service.ts:24-34`: add `RightPanel` type, `setRightPanelVisible(panel, visible)` and `toggleRightPanel(panel)` after `toggleRightSidebar`. Flag is `${panel}Visible` over the four `LayoutSettings` booleans (`settings.types.ts:98-104`). Turning on also writes `rightSidebarVisible: true` unless `hidesRightSidebar(editorStore.activeTabPath)` (`layout.logic.ts:23`); turning off writes only the flag.
- `src/lib/app/commands.ts:330-337`: TOC command keeps id/label, action becomes `toggleRightPanel('tableOfContents')`. Add after it `layout:toggle-properties` ("Toggle Properties Panel"), `layout:toggle-backlinks` ("Toggle Backlinks Panel"), `layout:toggle-outgoing-links` ("Toggle Outgoing Links Panel"), category Layout.
- `src/lib/app/commands.ts:405-411`: after Open Settings, `...(vaultStore.isOpen ? [{ id: 'settings:open-trash', label: 'Open Trash', category: 'Settings', action: () => settingsPanelStore.open('trash') }] : [])`, the `eventCalendarStore.canUndo` pattern (`:254-265`).
- Tests: `src/tests/lib/core/layout/layout.service.test.ts` (new `describe('toggleRightPanel')`), `src/tests/lib/app/commands.test.ts` (count pin `:151` 43 -> 46, new id tests, Open Trash tests), `e2e/specs/settings.spec.ts` (palette "Open Trash" shows the `Trash` heading).
- Help: `06-search-and-navigation.md:69-78` (Layout + Settings rows), `20-keyboard-shortcuts.md:101-125` (no-shortcut rows), `07-sidebar-panels.md:13,162` ("or from the palette"), `18-trash.md:13-15` (second way).

## Plan

1. Failing layout.service tests, then the two helpers. Commit.
2. Failing commands tests (ids, twice-run round trip, Open Trash, count 46), then the commands. Commit.
3. E2E case in settings.spec.ts, modeled on `event-calendar.spec.ts:96-98` (fill palette input, click the option). Commit.
4. Help pages. Commit.

## Prior art

- `layout.service.test.ts:136-238` (`resetAll`, `editorStore.addTab` with a non-note path). `.kanban` tab: `{ path: '/vault/b.kanban', fileType: 'kanban' }` as the canvas case at `:171-181`.
- `commands.test.ts:527-540` TOC round trip; `:555-562` settings panel test with real `settingsPanelStore`.

## Risks

- Moving TOC onto the helper changes its behavior: turning TOC on now also shows a hidden sidebar (wanted per item 1/2). The existing TOC test still passes since it only checks the flag.
- Count pin: the vault-closed total gains only the three toggles (Open Trash needs a vault): 43 + 3 = 46.
- Later Issues (05, 26) build on `setRightPanelVisible`; keep its signature as written.

## Defaults taken

- Command ids are not named in the Issue: `layout:toggle-properties`, `layout:toggle-backlinks`, `layout:toggle-outgoing-links`, `settings:open-trash`.
- Properties also hiding Info needs no code: `AppShell.svelte:278,290` both read `propertiesVisible`.
- No shortcut for the new commands (Issue names none).

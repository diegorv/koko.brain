# 23: The command palette reaches every rail item and view; a rail click shows hidden panels

**What to build:** The command palette gets one "Go to <item>" command per rail item (Search, Inbox, Today, Favorites, Types, each registered navigator such as Calendar, Files, Archive) and one "Open view: <label>" command per `.view` (picks the view lens, or opens it in the editor for `_open_in_editor` views). Cmd+1 and Cmd+2 get command ids ("Hide rail panels", "Show rail panels"), so they appear in the palette and can be rebound like other commands. Clicking a rail item while the panels are hidden (after Cmd+1) shows them, as Search already does. The palette label "Toggle Left Sidebar" becomes "Toggle Rail Panels" (the command id stays), and the theme editor group that says "Left Sidebar" is renamed to match.

**Blocked by:** 21

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] The command list contains a Go to command per built-in rail item and per registered navigator, built from the same item list the rail renders (logic or store test; a navigator registered later appears without code changes)
- [ ] Running a Go to command sets `layout.railItem` and shows the panels (service or component test, real settings store)
- [ ] One "Open view" command per `.view`, labelled with the view's label, updating when views are added or removed (test with real entries)
- [ ] Cmd+1 / Cmd+2 have command ids and still work by keyboard (keybinding test)
- [ ] A rail click with `railPanelsVisible: false` sets it to true (component test on `AppShell` select handler or its extracted function)
- [ ] Palette and theme labels say "Rail panels"; the command id `layout:toggle-left-sidebar` and saved keybindings keep working (test)
- [ ] Help 20 (keyboard shortcuts) lists the new commands

## Notes

- **Today (traced):** no palette command picks a rail item or a view (`app/commands.ts:49-314`); Cmd+1 / Cmd+2 have no `command` field (`app/global-keybindings.ts:140-141`); the rail's `onSelect` writes only `railItem` (`app/AppShell.svelte:186-189`); the palette label is at `app/commands.ts:207` and the theme group at `core/settings/theme-editor.logic.ts:69`.
- **Pins:** Issue 21 (a blocker) added pinned items; they get Go to commands from the same item list.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F96, F37, F08.
- **Size:** S.

## Comments

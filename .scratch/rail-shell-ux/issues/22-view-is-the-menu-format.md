# 22: `.view` is the menu format: `_rail_view`, Convert to view, New view in folders

**What to build:** Three changes make `.view` the one file that defines a menu entry, while `.collection` stays an editor-only table/calendar file. (1) A top-level `_rail_view: <view name>` picks which of a multi-view `.view`'s views the rail runs (list, count, Sort/Filter edits); missing or unknown falls back to the first view, and an unknown name is reported through Issue 10's ignored-key note. (2) A `.collection` row in Files gets "Convert to view", which renames the file to `.view` through the path-change owner (same content; tabs and links follow) and refuses with a toast when the target name exists. (3) The Files folder menu gets "New view", which creates the view in that folder (the New view dialog from Issue 17, with the folder as target). Help 12 and 25 say which file to use for what.

**Blocked by:** 13, 17

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] `queryViewLens` / the row-set function from Issue 13 runs the view named by `_rail_view`, and the first view when the key is missing or unknown (logic test)
- [ ] Sort/Filter edits from the rail write to the `_rail_view` view, not to `views[0]` (service test, real parser)
- [ ] "Convert to view" renames `x.collection` to `x.view` through `applyPathChange`, keeps the bytes, and the file then appears under Types > Views; a name clash shows a toast and changes nothing (service test, Tauri boundary mocked, real stores)
- [ ] "New view" in the folder menu creates the `.view` in that folder (service and component test); the Views row picks it up
- [ ] The New Collection menu item uses the Database icon, so it no longer shares the icon of `.view` rows (component test or snapshot of the menu item)
- [ ] Help 12 says `.collection` is for editor tables and calendars and `.view` for menu entries; help 25 documents `_rail_view`; ADR 0027 lists `_rail_view`; ADR 0004 gets a note on the two extensions' roles

## Notes

- **Owner decision (2026-11-04):** `.view` is the menu format; `.collection` stays editor-only (Rust keeps indexing only `.view`).
- **Today (traced):** only `.view` is indexed (`src-tauri/src/utils/fs.rs:114-117`) and listed (`features/type-definitions/type-sidebar.logic.ts:297-315`); the rail runs `views[0]` (`features/rail-shell/lens.logic.ts:550-556`, `view-lens.service.ts:24`); New view writes at the vault root from the Types header only (`type-definitions.service.ts:257-282`), New Collection is in the folder menu with the view icon (`features/rail-shell/FilesNavigator.svelte:71-77`).
- **Builds on Issue 17:** `createView(name, filters?)` gains a target folder; the dialog's duplicate-name check stays per vault.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F53, F02, F03, F08 (icon).
- **Size:** S-M.

## Comments

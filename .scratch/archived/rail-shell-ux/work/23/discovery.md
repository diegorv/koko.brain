# Issue 23 discovery

No `spec.md` in `.scratch/rail-shell-ux/`. Builds on Issue 21 (`work/21`): reuses `pinnedRailItems` and `RailPin`.

## Files that change

- New `features/rail-shell/rail-items.logic.ts`: `railItems(navigators, pins)` returns `{ key, label, group: 'top' | 'navigator' | 'pinned' | 'bottom', navigator?, pin? }[]` in rail order (Search, Inbox, Today, Favorites | Types, registered navigators, Files | pins | Archive).
- `features/rail-shell/Rail.svelte:40-64`: the constant lists become one `$derived` `railItems(...)`, rendered per group; built-in icons keyed by item key, navigator icon from `item.navigator`, pin from `item.pin`. The pin click branch (`openFileInEditor` for `_open_in_editor`) stays, so `Rail.test.ts` stays green.
- New `app/rail-navigation.ts`: `selectRailItem(item)` (Search -> `openSearch()`; `_open_in_editor` pin -> `openFileInEditor(path)`, layout untouched; else `{ railItem, railPanelsVisible: true }`) and `openRailView(path, opensInEditor)` (editor, or `{ railItem: 'types', railTypesLens: { kind: 'view', target }, railPanelsVisible: true }`).
- `app/AppShell.svelte:186-189`: `onSelect={(key) => selectRailItem({ key })}`.
- `app/commands.ts`: Go to commands from `railItems(railRegistryStore.navigators, pinnedRailItems(...))`, Open view commands from `collectViewFiles(fsStore.fileTree)` + `typeDefinitionsStore.entriesByPath`, all read while building; `layout:hide-rail-panels` / `layout:show-rail-panels`; label "Toggle Rail Panels" (:207).
- `app/global-keybindings.ts:140-141`: `command` on the Cmd+1 / Cmd+2 entries.
- `core/settings/theme-editor.logic.ts:69`: "Rail and Panels". `core/layout/layout.service.ts:7-8`: doc comment label.
- Help 20, 06, 26.

## Tests (prior art)

- New `rail-items.logic.test.ts` (list and order); `Rail.test.ts` unchanged.
- New `src/tests/lib/app/rail-navigation.test.ts`: real settings store, `editor.service.js` mocked as in `commands.test.ts`.
- `AppShell.test.ts`: a rail click with `railPanelsVisible: false` sets it true.
- `commands.test.ts`: count 32 -> 41 on empty stores; Go to with real `railRegistryStore` (register after a first build) and pins; Open view with a real tree and entries (`_visible: false` included, add/remove); hide/show commands; Toggle Rail Panels label. Reset `typeDefinitionsStore` and `railRegistryStore` in `beforeEach`.
- `global-keybindings.test.ts`: Cmd+1 / Cmd+2 carry the commands (`shortcutFor`), still 25 bindings.
- `CommandPalette.test.ts:110`, `theme-editor.logic.test.ts`: new labels.

## Defaults / risks

- Category of Go to and Open view: "Navigation" (Issue is silent).
- Open view's `_open_in_editor` is read when the list is built (the palette rebuilds it on every store change it read).
- `selectRailItem` takes `{ key, pin? }`; the rail click passes only the key, because the Rail itself still opens an `_open_in_editor` pin (keeps `Rail.test.ts:303` green); the Go to command passes the whole item.

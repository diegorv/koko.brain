---
type: ADR
id: "0033"
title: "An icon rail and one note list replace the left-sidebar modes"
status: active
date: 2026-10-31
---

## Context

The left sidebar holds three modes in one slot (`layout.sidebarMode`: `files`, `types`,
`calendar`, default `types` at `src/lib/core/settings/settings.store.svelte.ts:56`), plus Search,
which overrides whichever mode is set (`src/lib/core/layout/AppShell.svelte:286-294`). They are
three different kinds of tool: a vault tree, a type navigator that alone opens a second resizable
column (`AppShell.svelte:175-177, 300-310`, `TypeNoteList`), and a month grid that is the only sidebar
entry point to weekly, monthly and quarterly notes. Each mode grew its own header strip, each
mounting the same `SidebarModeToggle` (`FileExplorerHeader.svelte:14`, `TypeSidebar.svelte:188`,
`CalendarPanel.svelte:75`), plus its own context menu, rename flow and pin concept. Lifecycle
actions lived inside the Properties panel, so they were gone whenever the right sidebar was hidden
(they moved to the note action bar, `src/lib/features/note-action-bar/NoteActionBar.svelte`, during
this change). ADR 0026 says the file tree is the default; the code said `types`.

The audit is `.scratch/ux-sidebar/discovery-2026-10-31.md` on the branch
`docs/ux-sidebar-discovery`; the owner approved a prototype (variant A, same branch,
`src/routes/prototype-sidebar/`) and the product decisions in `.scratch/sidebar-redesign/PRD.md`.
The ADR was `proposed` until the rail shell became the default (ticket 23 of
`.scratch/sidebar-redesign/issues/`), which set it `active` and amended ADR 0026.
The feature folder was removed when it closed; read it with
`git show 54bcd0e1:.scratch/sidebar-redesign/PRD.md` (or `git ls-tree 54bcd0e1 .scratch/sidebar-redesign/`).

## Decision

**Use an always-visible icon rail whose every pick is a lens, and one note list column that every
lens fills; Types, Calendar and Files become navigators that set the lens instead of modes that
replace the sidebar.**

- The rail lists Search, Inbox, Today, Favorites, then Types, Calendar, Files, with Archive at the
  bottom. A lens resolves to a label, a plain-language rule and the notes to list, and it decides
  what "+ New here" writes (folder, type, date, `_organized: false`, `_favorite: true`).
- The day a note belongs to has one owner, a pure function in `utils/`: frontmatter `date`, else
  frontmatter `created`, else the disk creation time.
- Lifecycle and view actions move from the Properties panel to a per-note action bar above every
  markdown note, modelled on Tolaria's BreadcrumbBar. It writes the active note's frontmatter
  directly, so it does not depend on the Properties panel being mounted.
- The rail shell, the lens model and the note list live in `features/`. Plugin-owned parts (the
  Calendar navigator and Day lens from `plugins/calendar` and `plugins/periodic-notes`, Today's My
  people and "New 1:1" from `plugins/one-on-one`) register into it, following ADR 0003's
  registration rule instead of a `features/` to `plugins/` import.
- The change ships expand-contract behind a temporary `layout.shell` setting. The classic modes,
  `layout.sidebarMode`, the Cycle Sidebar View command and keybinding, and the bookmarks feature
  (merged into `_favorite`) are removed at the end.

### Where it lives

- Rail, note list and navigators: `src/lib/features/rail-shell/` (`Rail.svelte`, `RailNoteList.svelte`,
  `TypesNavigator.svelte`, `FilesNavigator.svelte`); the lens model and its rules in `lens.logic.ts`
  (`resolveLens`, `restoreRailItem`, `newNoteRule`); "+ New here" in `new-note.service.ts`; plugin
  registration in `rail-registry.store.svelte.ts`.
- Shared row and row menu: `src/lib/features/note-list/NoteRow.svelte`, `NoteRowMenu.svelte`.
- Note date: `src/lib/utils/note-date.ts` (`noteDateKey`).
- Action bar: `src/lib/features/note-action-bar/` (`NoteActionBar.svelte`, `note-action-bar.logic.ts`).
- Plugin parts: `src/lib/plugins/calendar/calendar-rail.service.ts` (Calendar navigator, Day lens),
  `src/lib/plugins/one-on-one/one-on-one-today.service.ts` (Today's My people),
  `src/lib/plugins/kanban/kanban.service.ts` (New Kanban Board in the folder menu).
- Settings: `mergeLayout` in `src/lib/core/settings/settings.logic.ts` keeps only the layout keys
  the app has, so the removed classic keys are dropped when `loadSettings` reads an old file.
- Layout and keys: `src/lib/app/AppShell.svelte` (rail branch), `src/lib/core/layout/layout.service.ts`
  (`hideRailPanels`, `showRailPanels`, `toggleLeftSidebar`), `src/lib/app/global-keybindings.ts`
  (Cmd+1, Cmd+2, `/`, Cmd+D). Both files moved to `src/lib/app/` on 2026-11-01 (ADR-0003 amendment).

## Alternatives considered

- **Keep the three modes and tidy the chrome**: one shared header, a fixed toggle. Rejected: the
  modes stay three different tools, Search stays hidden and each mode keeps its own list and menus.
- **One stacked sidebar with no rail (Tolaria's layout)**: Inbox, Favorites, Views, Types and
  Folders as collapsible groups feeding one note list. Rejected by the owner in the prototype: with
  a calendar and periodic notes on top it becomes a long scroll, and nothing is reachable while the
  panels are hidden.
- **Timeline plus filters**: one chronological list narrowed by facets. Rejected in the prototype:
  folder and type navigation become filter juggling.
- **A Types accordion that expands into notes**: rejected because it reads like a second file tree.
- **Hub pages with relationship tabs** in the editor area: rejected; relationships stay in the
  right sidebar (Backlinks, Outgoing links, Properties).

## Consequences

- This replaces ADR 0026's consequence that the file-tree sidebar is the default (see its
  2026-11-01 amendment). The file tree survives as the Files navigator, folders only; a folder's
  files are listed in the note list.
- Every navigation surface shares one row style and one row context menu, so rename, delete and
  favorite behave the same whatever lens listed the note.
- The Calendar navigator keeps the sidebar entry points to weekly, monthly and quarterly notes and
  the free date picker for the Calendar tab, and adds one for yearly notes (periodic wikilinks
  already open all of them).
- The rail, navigator and note list together cost width; Cmd+1 / Cmd+2 hide and show the navigator
  and the list, and the rail never hides. The default pane sizes (navigator 14 %, note list 20 %,
  right sidebar 20 %) leave the editor about 640 px at 1440 px with every panel open
  (`e2e/specs/sidebars.spec.ts` keeps it at 600 px or more).
- Today's "last 1:1" counts notes whose `_related_to` links the person. The collection view engine
  cannot express it (its expressions evaluate one record), so it is a pure function over the vault
  entries snapshot.
- Cmd+D (Favorite) is taken from CodeMirror's select-next-occurrence, and Raw moves from Cmd+K to
  Cmd+\.
> **Amendment (2026-11-01):** the contract step ran. `layout.shell`, `layout.railMigrated`,
> `layout.sidebarMode`, `layout.leftSidebarVisible`, the classic pane sizes, the Cycle Sidebar View
> command and its `keybindings` setting, and the classic Files, Types and Calendar panels are
> removed. Cmd+Shift+E is unbound. An old settings.json loads and is written back without them;
> a layout still on Classic (as every 3.0.12 file is) gets the rail default pane sizes once.
> **Amendment (2026-11-04): pinned rail items.** A `.view` or a type definition with `_rail: true`
> (ADR 0027 amendment of the same day) is a rail item. Pinned items form their own group under the
> navigator items (Types, Calendar, Files), after a divider that renders only when there is a pin, and
> above Archive; they go by `_order` (a view's default 50, a type's `TypeMetadata.order`), then label.
> There is no pin limit: the group scrolls and the rest of the rail stays fixed. A pin is a lens like
> Inbox (no navigator pane): its key in `layout.railItem` is `view:<absolute path>` or
> `type:<TypeMetadata.name>`, which `restoreRailItem` maps to the view or type lens without checking
> the target. A pinned `_open_in_editor` view opens the `.view` in the editor and leaves
> `layout.railItem` alone. Pins follow the files the Types navigator reads: the system folder is not
> excluded and `_visible` is not read. A saved pin that is no longer pinned falls back to Today once
> per vault open (`staleRailPinFix`, next to `staleTypesPickFix`); a pinned view moved to the Trash
> from the app falls back at once (the Types navigator path-change consumer); a moved or renamed
> `.view` is not followed. Code: `pinnedRailItems`, `staleRailPinFix`, `followRailPinPathChange` in
> `features/rail-shell/lens.logic.ts`, `Rail.svelte`, and `setViewRailPin` / `setTypeRailPin` in
> `features/type-definitions/type-definitions.service.ts`.
> **Amendment (2026-11-05):** of the two pin writers above, only `setViewRailPin` is in
> `features/type-definitions/type-definitions.service.ts`; `setTypeRailPin` is in
> `features/properties/lifecycle.service.ts`.
> **Amendment (2026-11-04): Settings > Rail.** A Settings page (General, after Sidebar) hides the
> built-in rail items and the registered navigators, reorders them within their group (top: Search,
> Inbox, Today, Favorites; navigators: Types, the registered navigators, Files; bottom: Archive), and
> switches the rail's Inbox badge apart from the dock badge. Search cannot be hidden or moved and
> stays first; Today cannot be hidden (it is the fallback lens) but can move. Pins and Neighbourhood
> are not listed and cannot be hidden. The state is `layout.railHidden`, `layout.railOrder` (one flat
> list of keys, applied per group; a move writes the full order of the listed items, so a navigator
> registered after the last move goes after the listed ones) and `layout.railInboxBadge` (default
> on), read through `parseRailHidden` / `parseRailOrder` / `parseRailInboxBadge`. `railItems` applies
> them (`arrangeRailGroups`), so the rail and the Go to commands share one list and a hidden item
> has neither a button nor a command. While the saved `layout.railItem` is hidden, `restoreRailItem`
> gives Today and the saved value stays, so showing the item again brings it back; a command that
> picks a hidden item still writes `layout.railItem`. Hiding a registered navigator (Calendar) hides
> its button only: the plugin stays registered, its Day lens provider included. Code:
> `features/rail-shell/rail-items.logic.ts`, `RailSection.svelte`, `restoreRailItem` in `lens.logic.ts`.

> **Amendment (2026-11-05): Settings > Layout.** The Settings > Rail amendment above still holds, but
> the page moved: Sidebar and Rail merged into a Layout page under General, which also holds the dock
> badge. `RailSection.svelte` is now `features/rail-shell/LayoutSection.svelte`.
> **Amendment (2026-11-04): palette commands and the Views section.** Every rail item has a
> command: `rail:go-to:<key>` ("Go to <label>", `railGoToCommands` in `src/lib/app/commands.ts:56-67`)
> for each item `railItems` returns, so a hidden item has none, and `rail:open-view:<path>` ("Open
> view: <label>", `openViewCommands`, `commands.ts:73-86`) for every `.view` in the tree, hidden
> ones included. Both go through `src/lib/app/rail-navigation.ts`, which the rail's own clicks use
> too: Search opens search, a pinned `_open_in_editor` view opens in the editor and leaves the
> layout alone, and any other pick also sets `layout.railPanelsVisible: true`, so a click after
> Cmd+1 shows the panels again. Cmd+1 and Cmd+2 are commands (`layout:hide-rail-panels`,
> `layout:show-rail-panels`, `src/lib/app/global-keybindings.ts:140-141`); Cmd+Shift+B keeps the
> id `layout:toggle-left-sidebar` under the label "Toggle Rail Panels". In the Types navigator, Views
> gained `_group` subheadings and `_visible: false` (ADR 0027 amendment), a New view dialog with a
> name and filters, Edit view and Move to Trash on the row menu, and New view in the Files folder
> menu (ADR 0004 amendment); a view that is loading, missing or broken says so in the note list and
> marks its row (`ViewLensStatus` in `src/lib/features/rail-shell/rail-shell.types.ts`); and the
> editor and the rail list a `.view` through one row set (`viewRowSet` in `lens.logic.ts`). The user
> documentation is `help/documentation/01-getting-started.md` § The Rail and
> `help/documentation/25-types-and-relationships.md` § The Types Navigator.
> **Amendment (2026-11-06): the rail's forms.** The rail is no longer only a 48 px column of icons. It
> has three forms: labeled by default (icon and title on one line in 28 px rows, section titles
> Workspace, Browse, Pinned and Actions, a width that drags), captioned (84 px, 72 px buttons, a 20 px
> icon above its title, dividers but no section titles) and collapsed (48 px, 16 px icons, no titles,
> native tooltip only). Collapsing keeps the style, and expanding returns to it. The Decision's rule
> that every pick is a lens, the flat structure and the `data-rail-*` hooks stay, and the rail still
> never hides. The state lives per vault in `layout.railStyle` (default `labeled`, read through
> `parseRailStyle`: only `captioned` gives captioned), `layout.railCollapsed` (default `false`,
> `parseRailCollapsed`: only the boolean `true` collapses) and `layout.railWidth` (default `192`,
> `parseRailWidth`: a finite number rounded and clamped to `RAIL_WIDTH`, 140 to 320, anything else
> reads as 192); `railFormWidth` turns them into the frame's width. The width is saved when the drag
> ends: `Rail.svelte` keeps the live width in its local `dragWidth` and calls `updateLayout({ railWidth })`
> once, in `endResize`, because each `updateLayout` re-serializes every setting and a pause over 500 ms
> would write mid-drag. Settings > Layout has the style picker and a Collapse rail switch; the toggle
> (`data-rail-collapse`, fixed at left 88 px, top 7 px in every form) is the other way to collapse, and
> is not Cmd+Shift+B, which hides the panels and not the rail.
> **Whole-rail scroll** replaces "the group scrolls and the rest of the rail stays fixed" from the
> 2026-11-04 pinned items amendment: the `nav` scrolls in every form with no scrollbar, Archive
> included, and every child is `shrink-0`. The top strip is sticky, and the edge and the resize handle
> sit in a frame around the `nav`, so they do not scroll.
> **Palette.** Icon colors are fixed and the same on every theme (`RAIL_ITEM_COLORS` in `rail-items.logic.ts`):
> Search `#64748b`, Inbox `#3b82f6`, Today `#f97316`, Favorites `#eab308`, Types `#8b5cf6`, Calendar
> `#f43f5e`, Files `#14b8a6`, Archive `#78716c`, any other navigator `#0ea5e9`, a pin its resolved icon
> color else `#0ea5e9` (`RAIL_PIN_COLOR`), a mod button `#d946ef` (`RAIL_ACTION_COLOR`) unless it declares
> one. An active item is an 18 % `color-mix(in oklch, ...)` tint of its color with `aria-current="page"`.
> Its title uses the full `text-file-explorer-fg`, never the item color: the palette does not change with
> the theme, so only the theme's own text token stays readable on every theme. An item color on its own
> tint measured 1.53 to 3.42 on Lavender Haze; the full text color measured 9.83 to 12.33 across both
> themes.
> **Divider token.** Dividers use `bg-file-explorer-fg/25`, not `bg-file-explorer-border`, which measured
> 1.07 contrast on the default dark theme. The right edge stays on `bg-file-explorer-border`.
> **Pane sizes.** The defaults in `settings.store.svelte.ts` are now navigator 13 %, note list 18 %,
> right sidebar 20 %, replacing "navigator 14 %, note list 20 %, right sidebar 20 %" above; with the
> 192 px rail they leave the editor about 610 px at 1440 px with every panel open, replacing "about
> 640 px" (`e2e/specs/sidebars.spec.ts` still keeps it at 600 px or more). `mergeLayout` keeps saved sizes,
> so a vault that saved 14 and 20 keeps them, with the editor at about 575 px, until its panes are dragged.
> **`--rail-header-pad`.** `AppShell.svelte` sets it as an inline style on its root from `railHeaderPad`,
> `max(12, 120 - rail width)` px, and the first pane's header (`RailNoteList`, `SearchPanel`,
> `FilesNavigator`, `TypesNavigator`, `CalendarNavigator`) and the panels-hidden spacer read it by class,
> so the traffic lights and the toggle stay clear at any width. It is a CSS variable because that carries
> no import: `CalendarNavigator` in `plugins/` adds no layer violation, and no `document.documentElement`
> write is needed.
> **Mod color.** A mod declares `color: { light, dark }` in `manifest.json`, for all of its buttons, both
> values required, each `#rgb` or `#rrggbb` because the value reaches an inline style (`parseModManifest`
> in `plugins/mods/mods.logic.ts`). `addRailButton` passes it as `RailAction.color`, and `Rail.svelte` reads
> `railActionColor(action.color, appliedThemeStore.isDark)`, so a theme change follows at once.
> `ModRailButtonV1`, `ModInfoV1` and `apiVersion` do not change: the contract's rule is about
> `ModContextV1` members, and a v1 mod with a `color` key already loaded, since unknown keys were ignored.
> Code: `features/rail-shell/rail-items.logic.ts`, `Rail.svelte`, `src/lib/app/AppShell.svelte`,
> `LayoutSection.svelte`. The user documentation is `help/documentation/01-getting-started.md` § The Rail,
> `19-settings.md` § Layout and `28-mods.md` § The manifest.
> **Amendment (2026-11-06): default sizes are the minimums.** The defaults are now `layout.railWidth` 140
> (`RAIL_WIDTH.default`, also its minimum) and navigator, note list and right sidebar at 3 %, the `minSize`
> in `AppShell.svelte`. This replaces the 192 px, "13 %, 18 %, 20 %" and "about 610 px" of the rail's forms
> amendment above. What fits a 27-inch monitor does not fit a 32-inch ultrawide, so the owner drags the
> panes to size on each monitor, and a new vault opens with its panes too narrow to read until then. Saved
> sizes still win, per vault and not per monitor. The E2E fixtures save working sizes; `Default pane sizes`
> in `e2e/specs/sidebars.spec.ts` drops them and checks the minimums.
- Re-evaluation trigger: the editor becomes too narrow to use with the panels open at common window
  sizes, or a new top-level area needs a rail slot that does not fit the lens model.

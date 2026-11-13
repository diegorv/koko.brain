<!-- Recovered from the agent return value (agent adab73216a1ad5ca6); the scout did not write this file itself. -->

Summary (the output file was not written, see the note at the end):

- No responsive layer exists. There are no breakpoints, `matchMedia`, `innerWidth`, or touch/pointer-type detection in the shell. The only `@media` is `prefers-reduced-motion` (`src/lib/features/event-calendar/EventCalendarView.svelte:283`). The viewport meta is set (`src/app.html:6`).
- `AppShell.svelte` nests four PaneForge panes (rail 48px, navigator 8-30%, note list 8-40%, editor with no minSize, right sidebar 5-30%). At iPhone width 390pt with defaults (14%/20%/20%, `settings.store.svelte.ts:66-68`) the editor gets about 131px.
- Palette and quick switcher have no visible trigger. They open only through Cmd+P / Cmd+O (`global-keybindings.ts:66,72`). Every app shortcut is `meta: true`, so none works on iPhone without a keyboard. Rail Search (`Rail.svelte`) is the only touch-reachable search entry.
- Rename is F2-only (`NoteRow.svelte:67`), and the context menu is the only other route, opened by `contextmenu` (`NoteRowMenu.svelte`, `FilesNavigator.svelte:286,393`, `TypesNavigator.svelte:182,215,244`, `EditorTabs.svelte`). No long-press handler exists in the shell, so rename, move, and favorite are unreachable on touch.
- Hover-only controls: tab close button (`EditorTabs.svelte:71`), property remove buttons (`PropertyField.svelte:133,143,160`, `PropertiesView.svelte:289`). Resize handle grip is hover-only and its hit area is 12px (`resizable-handle.svelte`).
- Drag-and-drop moves notes and folders between Files folders (`FilesNavigator.svelte:217-257,385-392`, `NoteRow.svelte` draggable). A touch move needs a "Move to..." action.
- Fixed sizes below 44pt: rail-list header icons are size-3.5 with p-1 (`RailNoteList.svelte:378-433`); settings panel is 820px with a 192px nav (`SettingsPanel.svelte:112,118`).
- No Sheet/Drawer/Vaul primitive exists (`src/lib/components/ui/` has no sheet or drawer, and `package.json` has no vaul).
- Tauri: `src-tauri/src/lib.rs:222` already has `#[cfg_attr(mobile, tauri::mobile_entry_point)]`. `src-tauri/gen/apple/` (kokobrain.xcodeproj, an iOS xcarchive) exists locally and is untracked (`git ls-files` returns 0). `plugins-workspace/global-shortcut` is compiled only `not(android|ios)` (github.com/tauri-apps/plugins-workspace, plugins/global-shortcut/src/lib.rs:15), yet `lib.rs:61` registers it unconditionally.

**Findings**

Mobile readiness by area:

| Area | Ref | Touch/iPhone blocker | Effort (iPhone / iPad) |
|---|---|---|---|
| AppShell 4-pane PaneGroup | `AppShell.svelte:165-290` | No single-pane mode | L / M |
| Rail (12 items + divider + bottom Archive) | `Rail.svelte:58-95` | Needs bottom tab bar + overflow; keep rail on iPad | M / S |
| TypesNavigator | `TypesNavigator.svelte` (383 lines) | Hover + right-click menus | M / S |
| FilesNavigator | `FilesNavigator.svelte` (450 lines) | DnD move, right-click, F2 rename | L / M |
| RailNoteList | `RailNoteList.svelte` (506 lines) | 16px header icons, popover panels | M / S |
| NoteRow + NoteRowMenu | `NoteRow.svelte`, `NoteRowMenu.svelte` (252 lines) | Long-press menu, rename sheet, draggable | M / S |
| EditorTabs | `EditorTabs.svelte:29-71` | Hover close, tab strip; use a tab switcher on phone | S / S |
| Right sidebar (props/TOC/backlinks) | `AppShell.svelte:~224-250` | Needs a sheet on phone; third column on iPad | M / S |
| Settings panel | `SettingsPanel.svelte:112-118` | 820px fixed right panel; full screen on phone | M / S |
| Command palette | `CommandPalette.svelte` (Command.Dialog) | Needs visible trigger; dialog itself OK | S / S |
| Quick switcher | `QuickSwitcher.svelte` | Needs visible trigger; dialog OK | S / S |
| Context menu primitives | `components/ui/context-menu/*` | Add long-press trigger or sheet variant | M / M |
| PaneForge resize handles | `resizable-handle.svelte` | Hide on phone; 44pt hit area on iPad | S / S |
| Status bar | `StatusBar` in `AppShell.svelte:~277` | Trim on phone | S / S |
| Keybindings | `global-keybindings.ts`, `utils/keybindings.ts` | Keep for iPad keyboard; no touch twin needed | S / S |
| Dialogs | `dialog-content.svelte` | Already `max-w-[calc(100%-2rem)]` | S / S |
| Canvas, kanban, event-calendar DnD and hover | `CanvasInner.svelte` (svelte-flow hover, mouse drag) | Not reviewed in depth | L (not scoped) |

Totals: iPhone L overall (single-pane shell, bottom bar, sheets, long-press, rename/move actions). iPad M (keep PaneGroup, enlarge handles, add long-press and touch-safe hover).

**Unverified or not checked**
- WKWebView long-press contextmenu: the Apple WKWebView page did not state it. The fetched text was from model memory, so this is UNVERIFIED. Treat long-press as needing a custom touchstart timer.
- PaneForge touch support, virtua scrolling inside WKWebView, safe-area insets, and iOS keyboard vs CodeMirror: not checked.
- iPad hardware keyboard forwarding Cmd+P to the page: UNVERIFIED.
- Tauri `minWidth` behavior on iPad split/slide-over: the schema fetch failed, so UNVERIFIED.
- Whether `build_menu` (`lib.rs:153-218`, `app.set_menu` at line 257) is cfg-guarded on iOS: not checked.
- Canvas, kanban, and event-calendar gesture code: out of depth.

**Output file**
I did not write `/Users/diegorv/Dev/pet-projects/koko/brain/.scratch/ios-app/research/scout-09-frontend-layout-mobile-ux.md`. The harness rule forbids writing report .md files, which overrides the assigned path. The findings above are the full result; the parent can save them if it wants the file.
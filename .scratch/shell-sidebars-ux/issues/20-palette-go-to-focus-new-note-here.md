# 20: Palette "Go to X" lands focus in the note list, and "New note here" becomes a command

**Origin:** design review 2026-11-17, proposal P37 (focus and command; counted here, direct keys are ticket 30), prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html` (section `#P37`), research `.scratch/shell-sidebars-ux/research/verdict-sh-view-headers-entry.md` (ticket V6) and `.scratch/shell-sidebars-ux/research/breakdown.md` (old ticket 38).

**What to build:**

1. **Focus after Go to.** Running a palette "Go to <list>" (Inbox, Favorites, a type, a view lens; not Search, not a view that opens in the editor) or "Open view: X" leaves keyboard focus on a note row, so the arrow keys (ticket 19) work at once. The row is the active note's row when it is mounted, else 19's current row. A rail mouse click does not move focus. "Search in Vault" still focuses the search input.
2. **"New note here".** A palette command, same path as the list's "+" (`handleNewHere`, `RailNoteList.svelte:593`). It is listed only while the note list is mounted and can create: not on Search, not while the panels are hidden, not on a view whose toolbar is not ready. Its label follows ticket 13's "New <kind>" sentence-case rule. The "+" button keeps its accessible name "New here".
3. **The request seam.** New `src/lib/features/rail-shell/rail-list-requests.store.svelte.ts`: a focus request counter with a handled marker, `canCreate`, and a new-here request, modelled on `search.store.svelte.ts` (`focusRequest`, `handledFocusRequest`, `requestFocus`, `markFocusHandled`) and `SearchPanel.svelte:24-34` (an `$effect` with `untrack`, so a mount never steals focus for an old request). `RailNoteList.svelte` publishes `canCreate` while mounted and clears it on destroy, and honours a request pending at mount once. `commands.ts` bumps the request from `railGoToCommands` (`:63-73`) and from the `openRailView` path (`rail-navigation.ts:32-38`); `selectRailItem` itself does not bump, so a rail click is unaffected.
4. **The palette must not restore focus over the command.** bits-ui's `FocusScope.unmount()` refocuses the element that had focus before the dialog opened, after the exit animation (`node_modules/bits-ui/dist/bits/utilities/focus-scope/focus-scope.svelte.js:56-62,93-112`), which is after `executeCommand` (`CommandPalette.svelte:41-51`) has run and the list has focused a row. Add `onCloseAutoFocus` with `preventDefault()` when the command moved focus, forwarded through `src/lib/components/ui/command/command-dialog.svelte` (it forwards nothing to `Dialog.Content` today) from `CommandPalette.svelte`. Precedents: `EventDialog.svelte:192`, `TasksView.svelte:896`.
5. Docs: `help/documentation/06-search-and-navigation.md`, `help/documentation/20-keyboard-shortcuts.md` (Commands Without Shortcuts), and one palette amendment sentence in `docs/adr/0033-icon-rail-and-note-list-replace-sidebar-modes.md`.

Not in this ticket: a rail click that moves focus into the list, merging Cmd+1, Cmd+2 and Cmd+Shift+B (a breaking shortcut change for no new capability), an F6 focus cycle, direct keys for rail items (ticket 30), and palette creators that follow the lens (13 keeps them on the vault root). Open-itens 142 (the New here type from a compound filter) is inherited, not fixed here.

**Blocked by:** 13, 19

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` for the new case (add it to `e2e/specs/rail-shell.spec.ts`)

- [ ] Failing test first, `src/tests/lib/app/commands.test.ts` (real stores): "Go to Inbox" and "Open view: X" (a view that does not open in the editor) bump the focus request; "Search in Vault", "Go to Search" and an `_open_in_editor` view do not.
- [ ] Failing test first, a `RailNoteList` mount test: after a request `document.activeElement` is a `[data-note-row]` (the active note's row when mounted, else the current row); a request made while the list was unmounted is honoured once at mount and not replayed on a remount; an empty list focuses nothing and does not throw.
- [ ] Failing test first: with the list mounted on Inbox the palette lists "New note here"; running it creates the note through the real `createNoteHere` (only Tauri `fs` mocked) and the new tab is active. On Search, on a view whose toolbar is not ready, and with the panels hidden (list unmounted) the command is absent.
- [ ] The count pin in `commands.test.ts:151` changes on purpose for the new command.
- [ ] E2E: open the palette from the editor, run "Go to Inbox", and the focused element is a note row (this fails without `onCloseAutoFocus`); run "Search in Vault" and the search input is focused (unverified whether it already loses focus the same way).
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P37.** The keyboard can open a lens but not enter it. Selecting a lens moves focus to its active or first row. Add a "New note here" command. Owner decisions in the proposal: direct keys for rail items (Ctrl+1..9 or Cmd+Opt+1..9), merging the three panel bindings, and an optional F6 focus cycle. (Review validation: revise, Cmd+1..9 would reverse ADR-0033.) This ticket builds the focus and the command; the direct keys are ticket 30.

## Problem

After "Go to Inbox" the focus stays in the editor, so the keyboard user still has to Tab through the rail to reach the list. "New here" exists only as a button in the list header, so the palette cannot create a note in the list being shown.

## Evidence

Checked at `ab143a411`.

- `src/lib/app/rail-navigation.ts:14-24`: `selectRailItem` writes layout only and moves no focus; `:32-38` `openRailView` the same.
- `src/lib/app/commands.ts:63-73`: `railGoToCommands`; `:203` "Search in Vault".
- `src/lib/features/rail-shell/RailNoteList.svelte:588` (`canCreate`, already a derived from `currentNewNoteRule()`), `:593-606` (`handleNewHere`), `:790-801` (the "+" button, `aria-label="New here"`).
- `src/lib/app/AppShell.svelte:205` (`{#if settingsStore.layout.railPanelsVisible}`; the list unmounts while the panels are hidden), `:245-250` (Search or `RailNoteList`). Because the list unmounts, `canCreate` must be cleared on destroy rather than read stale.
- `src/lib/features/search/search.store.svelte.ts:24-77` and `src/lib/features/search/open-search.service.ts:14`: the focus request seam to copy.
- `src/lib/features/command-palette/CommandPalette.svelte:41-51` (`executeCommand`), `:67` (`Command.Dialog`); `src/lib/components/ui/command/command-dialog.svelte` (no `onCloseAutoFocus` forwarding).
- `src/lib/app/global-keybindings.ts:133-141`: Cmd+Shift+B, Cmd+1 and Cmd+2 stay as they are.

## Why blocked

- 13: Files header gets a "+" menu, and every creator says "New <kind>" (the palette creator label rule)
- 19: Rail note list: one Tab stop, arrow keys, focus follows removals and rename (the list's current row and focus target in both `VList`s)

## Sequence with

- `commands.ts` and the count pin `commands.test.ts:151`: 01, 08, 15, 24, 28, 29, 32 each add or relabel a fixed command and change the number on purpose.
- `app/rail-navigation.ts`: 29 (the tab entries branch) and 30 (digit selection). 20 and 29 are not chained.
- `RailNoteList.svelte`: 12, 16, 17, 24, 34 (band class `:699`).
- ADR-0033 amendments: 29 and 30. `help/documentation/06-search-and-navigation.md`: 08, 13, 18.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the 34-ticket split. Defaults (not individually answered): 20.1 (old 38.1), only the palette's Go to and Open view move focus, not a rail click.

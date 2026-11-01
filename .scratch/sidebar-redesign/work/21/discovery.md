# Issue 21 discovery: Search on the rail

No `spec.md`; the source is `PRD.md` (Rail, Lenses: Search, Shortcuts, Q14). Adds one built-in rail item to the
`work/07` / `work/11` rail (persisted `layout.railItem`). Only the differences are listed.

## Files that change
- `features/rail-shell/lens.logic.ts:100-138`: `SEARCH_RAIL_ITEM = 'search'`, `SEARCH_LENS = { kind: 'search' }`
  in `RAIL_ITEM_LENSES`, so `restoreRailItem('search')` keeps it.
- `features/rail-shell/Rail.svelte:38-42`: Search (lucide `search`) first, above Inbox.
- `features/search/search.store.svelte.ts`: `focusRequest` counter + `requestFocus()` (getter tested, reset).
- NEW `features/search/open-search.service.ts`: `openSearch(query?)` - rail shell: `railItem: 'search'`,
  `railPanelsVisible: true`, query if given, `requestFocus()`; classic: query if given, `setOpen(true)`.
  `toggleSearch()` - rail: `openSearch()`; classic: `searchStore.toggle()` (today's behavior).
- Callers: `core/keybindings/global-keybindings.ts:90-94` (Cmd+Shift+F -> `toggleSearch`) plus a dedicated
  "/" keydown listener (no modifiers, rail shell only, skipped when `isTypingTarget(e.target)`: inputs and the
  contenteditable editor); `command-palette.service.ts:128` -> `toggleSearch`; `deep-link.service.ts:165-169`
  and `tags/TagsView.svelte:17-20` -> `openSearch(query)`.
- `features/search/SearchPanel.svelte`: `rail` prop. Rail: no close strip; the h-10 tab-bar header (pl-6, drag
  region) holds the input; Escape blurs; refocuses on `focusRequest`. Modes, stats and result rows are the same
  markup, so they behave as in the panel. Classic path unchanged.
- `core/layout/AppShell.svelte:226-234`: note list pane renders `<SearchPanel rail />` when the lens is search;
  the rail's Search click goes through `openSearch()` (re-focus when already there).

## Plan (test-first)
1. `lens.logic.test.ts` restore; `Rail.test.ts` Search first + onSelect.
2. `search.store.test.ts` focusRequest; NEW `open-search.service.test.ts` both shells, with/without query.
3. `global-keybindings.test.ts`: "/" on body opens in rail; ignored in input / contenteditable / classic /
   with Meta; Cmd+Shift+F rail vs classic. `command-palette`, `deep-link` tests: both shells.
4. NEW `SearchPanel.test.ts` (real store): rail header input, mode buttons, rows + snippets, empty/no-results,
   Escape blurs (rail) vs closes (classic), focus request focuses.
5. E2E `rail-shell.spec.ts`: rail shell, press "/", type, row with its snippet shows.

## Prior art
`Rail.test.ts`, `SearchResult.test.ts` (row rendering), cycle-sidebar listener test, `rail-shell.spec.ts`.

## Defaults taken
- "/" is rail-only (PRD: "Search on the rail"); the classic shell keeps no "/" binding.
- In the rail, Cmd+Shift+F and the palette command open (never close) Search; classic still toggles.
- Rail Escape only blurs; the lens stays. No rule line under the header (the input shows the query).
- The query is not persisted; a restored Search item opens with an empty input.

## Risks
- The "/" listener must not fire in CodeMirror (contenteditable) or dialogs' inputs: covered by isTypingTarget.

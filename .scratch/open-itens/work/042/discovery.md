# 042 discovery: Enter in the quick switcher creates the note when nothing matches

No `spec.md` in `.scratch/open-itens/`; the Issue is the spec.

## Files that change

- `src/lib/features/quick-switcher/QuickSwitcher.svelte:96-105`: the `{:else if searchQuery.trim().length > 0}` branch renders a plain `<button onclick={createAndOpenNote}>` inside `<Command.Empty>`. bits-ui's Enter handler (`node_modules/bits-ui/dist/bits/command/command.svelte.js`, `case kbd.ENTER`) only clicks the `[data-selected]` valid item, so Enter does nothing here.
- `src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts:58-72`: `createFromQuery` clicks a `button`; it changes to click the `[data-slot="command-item"]` whose text has `Create "<query>"`.

## Plan

1. Failing first: two tests in `QuickSwitcher.test.ts` (Enter with no match creates and opens `/vault/Ideas.md`, closes the switcher; Enter with a match opens it, no create item rendered). Confirmed: the no-match test fails on current code, the match test passes today (guard).
2. Replace the branch with `<Command.Group><Command.Item value={`create:${query}`} onSelect={createAndOpenNote}>` keeping `FilePlus` and the `Create "<query>"` label. Rewrite `createFromQuery` to click that item.

## Selection

bits-ui registers items and runs `#sort()` after a tick; with `shouldFilter={false}` it calls `#selectFirstItem()` when the root value is empty, and when the selected item unmounts (`registerItem` cleanup) it selects the first remaining item. So the create item becomes selected on its own once it is the only item, and when typing changes a file list into the create item. Default taken: rely on that and do not bind the Command's `value`; the Enter test proves it. If it does not hold, bind `value` and set it when the branch renders, as the Issue allows.

## Value

`create:<trimmed query>`: file item values are absolute paths (`/vault/...`), which never start with `create:`.

## Tests to copy

The existing helpers in the same file (open, type via `input` event, `flushSync`). Enter is dispatched on the input as a bubbling `keydown`; the helper waits one macrotask first because bits-ui selects the first item a tick after render.

## Risks

- `Command.Empty` is no longer used for the create case; `Command.Empty` renders only when bits-ui counts zero filtered items, so it would hide once an item exists. The "No files found." branch for an empty query stays as is.
- The create item gets the item padding/hover styles of a normal row instead of the centered muted button look; accepted, it is now a selectable row like the file rows.

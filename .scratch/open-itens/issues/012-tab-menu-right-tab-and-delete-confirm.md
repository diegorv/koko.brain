# 012: Tab-strip menu acts on the right tab, and Delete asks first

**Origin:** `view-engine-fixes` Issue 01, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-engine-fixes/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** in the `.view` tab the `ContextMenu.Trigger` wraps the whole tab strip, the "+" button and the empty space included (`src/lib/features/collection/CollectionView.svelte:517-551`). `tabContextIndex` is set only by a tab's `oncontextmenu` (`:536`) and never cleared (declared `:105`, read `:553-554`). Right-clicking "+" or the empty strip after an earlier tab right-click opens the menu for that earlier index, and Rename, Change type or Delete act on whatever view sits there now. `handleDeleteView` writes at once, with no confirmation (`:443-449`, `:577`).

- Put the menu trigger on each tab only, and clear `tabContextIndex` when the menu closes.
- Delete view asks first, naming the view: `Delete view "<name>"?`. Cancel writes nothing.

**Blocked by:** 010

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first, `src/tests/lib/features/collection/CollectionView.view-writes.test.ts`:
  - Right-click tab 1, close the menu, right-click "+": no Delete item renders.
  - Delete renders a confirmation containing the view name; without confirming, no write happens and the tab still renders.
- [ ] `help/documentation/12-collection.md` § Managing views: Delete asks first.

## Notes

- **Run after (other feature):** view-editor 01: both edit `CollectionView.view-writes.test.ts`. It can run in parallel with view-editor 02 (no shared file). relay-lite does not enforce this.
- A deleted view is recoverable only through file history today.
- **Size:** S.

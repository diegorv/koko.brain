# 012: Tab-strip menu acts on the right tab, and Delete asks first

**Origin:** `view-engine-fixes` Issue 01, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-engine-fixes/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** in the `.view` tab one `ContextMenu.Root` (`src/lib/features/collection/CollectionView.svelte:519-585`) has a `Trigger` that wraps the whole tab strip: every tab button, the rename input and the "+" button. `tabContextIndex` is set only by a tab's `oncontextmenu` (`:538`) and never cleared (declared `:106`, read `:555-556`). Right-clicking "+" or a gap in the strip after an earlier tab right-click opens the menu for that earlier index, and Rename, Change type or Delete act on whatever view sits there now. `handleDeleteView` (`:445-451`) writes at once, with no confirmation; its `onView` guard (`:360-363`) only catches a file changed on disk.

- One `ContextMenu.Root` per tab inside the `{#each}`, as `src/lib/core/markdown-editor/EditorTabs.svelte:46-110` does. The `Trigger` wraps only the tab button (not the rename input, not "+"), and the `Content` closes over the loop's `i`. Delete `tabContextIndex` and its doc comment. The strip `div` becomes a plain flex container with no trigger props. Several Triggers under one Root are not an option: they share one `triggerNode` (bits-ui `menu.svelte.js:1537`).
- Delete view asks first with the native `ask` from `@tauri-apps/plugin-dialog`, as file deletion does (`src/lib/features/rail-shell/FilesNavigator.svelte:195-202`): message `Delete view "<name>"?` with `{ title: 'Delete view', kind: 'warning', okLabel: 'Delete', cancelLabel: 'Cancel' }`. Read `name` from `definition.views[idx]` before the `await`. After a Cancel the handler returns and writes nothing. An `ask` failure propagates; it is not swallowed.
- Keep the tab buttons in the Tab order. The trigger props set `tabindex: -1` (`menu.svelte.js:1599`), so use the Trigger's default `children` form (bits-ui renders its own wrapper, as `EditorTabs.svelte:49-50` does) or set `tabindex={0}` after the spread.

**Blocked by:** 009

**Status:** ready-for-agent

**Answered:** owner, 2026-11-12: Blocked by 009 only (was 010). After 010's split, 010 shares no file with this Issue; 009 shares `CollectionView.view-writes.test.ts`. The confirmation mechanism (native `ask`) follows the repo convention for deletes; nothing else is open.

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first, `src/tests/lib/features/collection/CollectionView.view-writes.test.ts`. Mock the dialog as `CollectionView.restored-view.test.ts:19` does (`vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }))`), with `ask` resolving `true` in `beforeEach` and flipped per test.
  - Right-click the `All` tab, close the menu with `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`, settle, then right-click `button[title="Add view"]`. No `[role="menu"][data-state="open"]` exists, and none contains "Delete view". Scope every menu query to `data-state="open"`, as `CollectionView.test.ts:723` does: a closed menu stays in the DOM under jsdom (`NoteRowMenu.test.ts:155`). Fails today: the one Root reopens on the bubbled `contextmenu` with the stale index.
  - Delete calls `ask` once with a message containing `Delete view "Second"?`. With `ask` resolving `false`, `writeTextFile` is not called, the file on disk is unchanged and the `Second` tab still renders. Fails today: there is no `ask` call and the write happens.
- [ ] The existing tests "deletes a view from its tab menu" (`:332`) and "refuses to delete a view another one replaced" (`:350`) keep their disk and toast assertions, with `ask` resolving `true`. Without the mock, the real `ask` returns false over the mocked `invoke` and both would see no write. This is the intended behavior change, not a weakened test.
- [ ] Rename through the menu: right-click `Second`, choose Rename, type `Later`, Enter: the file has `Later`. No test covers this path today (the rename test at `:316` double-clicks). If the input loses focus when the menu closes, `onblur={commitTabRename}` ends the rename at once; `onCloseAutoFocus={(e) => e.preventDefault()}` on `ContextMenu.Content` is the likely fix.
- [ ] `help/documentation/12-collection.md:150` § Managing views: Delete view asks for confirmation, naming the view. Keep the "Delete is disabled when only one view remains" sentence.

## Notes

- **Run after:** 009 (both edit `CollectionView.view-writes.test.ts`). It can run in parallel with 131 (no shared file), but the views chain runs in series (`priority-2026-11-08.md:63`). It blocks 013 and 138.
- The tab strip shows only when a `.view` is open as an editor tab, not in the rail views. Impact is low; the more likely harm is a misclick on Delete for the right tab.
- A deleted view is recoverable only through file history today.
- **Size:** S.

## Comments

- 2026-11-12, deep dive (`research/deep-dive-2026-11-12/refute-012.md`, critique M6): Blocked by is now 009 only (was 010; the overlap with 010 is textual and goes away with 010's split). The menu becomes one Root per tab with `tabContextIndex` removed, the confirmation is the native `ask` with its exact message and labels, the stale-menu test closes with Escape and queries only open menus, and the criteria now cover the existing delete tests (`ask` true), a Rename-through-the-menu test and keyboard reach of the tabs. Line numbers refreshed; old feature numbers in Notes translated.

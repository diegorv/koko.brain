# 23: Tab menu: Close others, Close to the right, and the shared note-actions group

**Origin:** design review 2026-11-17, proposal P39 (tab-menu half, counted in new 15; `.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html`, research `.scratch/shell-sidebars-ux/research/verdict-nl-actions-keyboard.md` (ticket C) and `breakdown.md` (old ticket 30).

**What to build:** the per-tab menu in `src/lib/core/markdown-editor/EditorTabs.svelte` (`ContextMenu.Content` `:101-112` today) and two bulk closes in `src/lib/core/editor/editor.service.ts`:

1. **Menu order.** Pin tab / Unpin tab; then, for unpinned tabs, Close tab, Close others (disabled when there is no other closable tab) and Close to the right (disabled on the last tab); then, for markdown note tabs only, the shared group from new 15 (Archive, Mark organized, History, Move to Trash) acting on that tab's note, not the active one. Tasks, Graph, Tags, canvas, kanban and `.view` tabs get no shared group (owner default 23.1).
2. **Bulk close rules.** Pinned tabs are skipped. A dirty tab whose save fails still asks "Close anyway", and a declined prompt keeps that tab while the others close. After Close others the target tab is active.
3. **Service.** `closeOtherTabs(path)` and `closeTabsToTheRight(path)` in `editor.service.ts`: snapshot the target paths first, then for each one re-find the index with `findTabIndex` and `await closeTab(index)` (`closeTab` at `:362-395` already skips pinned tabs, runs the flush and the second-save loop and shows the prompt, and re-finds by path after its awaits).
4. **Shared group wiring.** `EditorTabs.svelte` gets an optional `noteActions?: Snippet<[EditorTab]>` (core cannot import `features/`; `EditorView.svelte:67` already passes snippets). `EditorView.svelte` fills it from new 15's `note-actions.logic.ts` list with `getActionBarState(tab.path, tab.content)` and by-path writers; History first activates the tab (`await openFileInEditor(path)`) and then opens, so it cannot restore into the wrong note (open-itens 023). No shortcut hints in this menu: Cmd+E acts on the active tab, not the menu's target.
5. Help `help/documentation/03-editor.md:27` (the tab menu).

Not in this ticket: Trash and History on canvas and kanban tab menus; "Move to..." (no folder picker exists).

**Blocked by:** 15, 22

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` for `tab-pinning` (or `tabs`), whichever carries the new case.

- [ ] Failing test first, `editor.service.test.ts`: tabs [A, B pinned, C dirty and saving, D dirty with a failing save and "Close anyway" declined, E]: `closeOtherTabs(A)` leaves [A, B, D] with A active and C saved first; `closeTabsToTheRight(C)` closes only tabs after C, skips pinned ones and leaves `activeIndex` valid when the active tab was among them.
- [ ] Failing test first, `EditorTabs.test.ts`: an unpinned markdown tab lists Pin tab, Close tab, Close others, Close to the right, then the shared group in new 15's order (the `['Pin tab', 'Close tab']` case at `:143-149` is the intended change); a pinned tab lists Unpin tab then the shared group; Tasks, Graph and Tags tabs list no shared group; disabled states as above.
- [ ] Failing test first, `EditorView.test.ts`: Archive and Mark organized on a non-active markdown tab write that tab's path and leave the active tab's content unchanged.
- [ ] History on a non-active tab activates it first: after the click `editorStore.activeTabPath` is that tab and the history dialog targets it.
- [ ] `EditorTabs.svelte` imports nothing from `features/` or `plugins/` (`layer-rules.test.ts` baseline unchanged); `menu-item-anatomy.test.ts` stays green.
- [ ] E2E (`tab-pinning.spec.ts` or `tabs.spec.ts`): Close others and Close to the right keep a pinned tab.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P39 (tab-menu half).** Note actions are split across five surfaces. Build one note-actions list with the same labels and order in the row menu, the More menu, the tab menu and the palette. The tab menu adds Close others and Close to the right.

## Problem

The tab menu has only Pin and Close. It cannot close the rest of a crowded strip in one step, and a note's Archive, Mark organized, History and Move to Trash are reachable only for the active note.

## Evidence

Checked at `ab143a411`.

- `src/lib/core/markdown-editor/EditorTabs.svelte:101-112` the menu; `:106-111` Close only for unpinned tabs.
- `src/lib/core/editor/editor.service.ts:362-395` `closeTab` (pinned guard `:366`, flush and second save `:369-382`, the prompt, the re-find by path `:384-386`); no bulk close exists.
- `src/lib/app/EditorView.svelte:67` passes `tabIcon` and `tabTitleColor` as the only props into `EditorTabs`.
- `src/tests/lib/core/markdown-editor/EditorTabs.test.ts:114-158` the context-menu tests (`:143-149` pins `['Pin tab', 'Close tab']`).
- `restoreSnapshot` (`file-history.service.ts:82-105`) writes into the active tab, which is why History activates the tab first.

## Why blocked

- 15: One note-actions group in the row menu, the More menu and the palette, with a one-click Mark organized on Inbox rows
- 22: Tabs can be dragged to reorder, show their full path on hover, and markdown labels drop .md

## Sequence with

- `EditorTabs.svelte` and `EditorTabs.test.ts`: new 21 and new 22 (both blockers of this ticket), new 34.
- `EditorView.svelte` and `EditorView.test.ts`: this ticket fills the `noteActions` snippet; new 25 removes the floating toggles and the local flags from the same file and rewrites the same test file; new 26 edits the empty branch.
- `editor.service.ts`: this ticket adds `closeOtherTabs` and `closeTabsToTheRight`; new 25 reroutes `toggleSourceMode` (`:437-439`); new 31 extracts the loader from `openFileInEditor` and touches the close path.
- `help/documentation/03-editor.md`: new 21, 22, 24, 25, 27, 31, 32, 33.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: none for this ticket. Defaults (not individually answered): 23.1 (old 30.1) no Trash or History on canvas and kanban tab menus, markdown tabs only.

# Refute: Issue 012, Tab-strip menu acts on the right tab, and Delete asks first

Adversarial validation, 2026-11-12, HEAD `318b6e9b5`. Read-only: nothing was run (no pnpm, vitest, cargo, app). "Verified" = read in code at HEAD. "Inferred" = reasoned, not run. The last commit touching `CollectionView.svelte` or `CollectionView.view-writes.test.ts` is `107bcf35a`, so the dossier's HEAD `afc0a9df8` and this one have the same code.

## Verdict

- **Still present: yes.** Both defects are in the code exactly as described. The Issue's line numbers are off by 2.
- **Impact: low** for this owner. The dossier says low-medium; I rate it lower (see below).
- **Complexity: S. Risk: low.** One component, one handler, one test file, one help line. No store, no Rust, no write path change.
- **Recommendation: run-after-edits.** The fix is sound, but as written a fresh relay-lite agent has to guess two things: the confirmation mechanism and the menu structure. One acceptance criterion cannot be met as worded ("renders a confirmation"), and the other, written the obvious way, can stay red after a correct fix.

### Verified facts (`src/lib/features/collection/CollectionView.svelte`)

- One `ContextMenu.Root` (`:519`) whose `Trigger` `child` snippet spreads its props onto the strip `div` (`:520-522`). That div holds every tab button (`:533-541`), the rename input (`:524-532`) and the "+" button (`:544-550`).
- `tabContextIndex` is declared at `:106`. Its only write is the tab button's `oncontextmenu` (`:538`), and its only reads are `:555-556`. It is never cleared.
- bits-ui 2.20.4 `ContextMenuTriggerState.oncontextmenu` opens the menu for any `contextmenu` event that reaches the trigger node and is not `defaultPrevented` (`node_modules/bits-ui/dist/bits/menu/menu.svelte.js:1564-1571`). A right-click on "+" or on the rename input bubbles to the div and opens the menu with whatever `tabContextIndex` holds. That is the stale view after any earlier tab right-click, and an empty popup before one.
- `handleDeleteView` (`:445-451`) writes at once. Its `onView` guard (`:360-363`) reads `name` from the current `definition` at click time, so a stale index that still points at some view passes the guard and deletes that view. No `@tauri-apps/plugin-dialog` import exists in the file (imports `:2-38`).

### Impact (inference from code plus the owner profile)

- The tab strip appears only when a `.view` file is open in an editor tab (`EditorView.svelte` mounts `CollectionView`; the rail's "Open view" item, `TypesNavigator.svelte:309`). The rail views the owner uses daily render through `RailNoteList`, which has no tab strip. So the owner is on this surface only when editing a `.view` as a file.
- In practice the stale path needs a right-click on "+" (the "empty strip" is only the `gap-0.5` gaps, since the div is not `flex-1`, `:522`) followed by choosing Delete, Rename or Change type from a menu that names no view. That is unlikely.
- The more plausible harm is a misclick on Delete for the right tab, which loses one view definition with no prompt. The Issue says it can be recovered through file history (not verified here). No notes are touched.
- Rank: low. It is cheap enough to keep in the queue after 010, as planned.

## Must-fix edits to the Issue text

### M1. Name the confirmation mechanism and make the criterion match it

The Issue does not say how to ask. "Delete renders a confirmation" suggests a DOM dialog. Every confirmed delete in the repo uses the native `ask` from `@tauri-apps/plugin-dialog` instead (`src/lib/core/filesystem/delete-note.service.ts:14-19`, `src/lib/features/rail-shell/FilesNavigator.svelte:195-202`, `src/lib/features/note-list/NoteRowMenu.svelte:3`), and `docs/TESTING.md:19` lists it as a mock target. A native `ask` renders nothing in jsdom, so the criterion as written cannot be met with the repo convention.

Replace the second bullet under "What to build":

> - Delete view asks first with the native `ask` from `@tauri-apps/plugin-dialog`, as file deletion does (`FilesNavigator.svelte:195-202`): message `Delete view "<name>"?`, `{ title: 'Delete view', kind: 'warning', okLabel: 'Delete', cancelLabel: 'Cancel' }`. Read `name` from `definition.views[idx]` before the `await`. After a Cancel the handler returns and writes nothing. An `ask` failure propagates; it is not swallowed.

Replace the second test bullet:

> - Delete calls `ask` once with a message containing `Delete view "Second"?`. With `ask` resolving `false`, `writeTextFile` is not called, the file on disk is unchanged and the `Second` tab still renders. Mock it as `CollectionView.restored-view.test.ts:19` does: `vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }))`.

Evidence that it fails today: `handleDeleteView` never calls `ask` and writes at once (`:445-451`).

### M2. Prescribe one Root per tab and delete `tabContextIndex`

"Put the menu trigger on each tab only, and clear `tabContextIndex` when the menu closes" leaves two designs open:

- several `Trigger`s under the one Root, plus a clear on close; or
- one Root per tab.

The first is unsupported territory in bits-ui. Each trigger writes the single `parentMenu.triggerNode` through `attachRef` (`menu.svelte.js:1537`), so the last trigger mounted wins. Clearing on close would also empty the menu during its exit animation; the comment in `context-menu-content.svelte` says a closing menu stays mounted for that animation.

The repo already has the second design for a tab strip: `src/lib/core/markdown-editor/EditorTabs.svelte:46-110`, a Root per tab inside the `each`.

Replace the first bullet under "What to build":

> - One `ContextMenu.Root` per tab inside the `{#each}`, as `EditorTabs.svelte:46-110` does. The `Trigger` wraps only the tab button (not the rename input, not "+"), and the `Content` closes over the loop's `i`. Delete `tabContextIndex` and its doc comment. The strip `div` becomes a plain flex container with no trigger props. A right-click on "+", a gap or the rename input opens no tab menu, so the browser's own menu shows there, as on any other toolbar button.

### M3. Fix the first test so it fails today and passes after a correct fix

Written the obvious way (a document-wide `[role="menuitem"]` query, or no real close), the test stays red after a correct fix:

- The repo's own test notes say a closed bits-ui menu stays in the DOM under jsdom with `data-state="closed"` (`src/tests/lib/features/note-list/NoteRowMenu.test.ts:155`). Tab 1's closed menu would still hold a "Delete view" menuitem.
- Dispatching only `contextmenu` on "+" does not dismiss tab 1's open menu, so after the fix that menu would still be open.

Replace the first test bullet:

> - Right-click the `All` tab, close the menu with `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))` (the bits-ui escape layer listens on the document, `escape-layer/use-escape-layer.svelte.js:29`), settle, then right-click `button[title="Add view"]`. No `[role="menu"][data-state="open"]` exists, and none contains "Delete view". Scope every menu query to `data-state="open"`, as `CollectionView.test.ts:723` does.

Evidence that it fails today: the one Root reopens on the bubbled `contextmenu` with `tabContextIndex === 0` and renders the three items (`:555-582`).

## Should-fix edits

- **S1. Existing delete tests need `ask` resolving `true`.** Add to the criteria: "`CollectionView.view-writes.test.ts` 'deletes a view from its tab menu' and 'refuses to delete a view another one replaced' keep their disk and toast assertions, with `ask` resolving `true` in `beforeEach`." Without the mock, the real `ask` runs over the mocked `invoke` (`view-writes.test.ts:31`, resolves `undefined`). It then returns `false` (`node_modules/@tauri-apps/plugin-dialog/dist-js/index.js:181-187`), so both tests would see no write. The agent could misread that as a regression, or "fix" it by loosening the assertions. This is an intended behavior change, not a weakened test.
- **S2. Keep the tab buttons keyboard-reachable.** The trigger props include `tabindex: -1` (`menu.svelte.js:1599`). Spreading them onto the tab `<button>` through a `child` snippet (the dossier's plan) takes every view tab out of the Tab order. Today they are native buttons inside a `tabindex=-1` div, so they are reachable. Add to the Notes: "Use the Trigger's default `children` form (bits-ui renders its own wrapper element, as in `EditorTabs.svelte:49-50`) or set `tabindex={0}` after the spread. The tab buttons stay in the Tab order."
- **S3. Add a Rename-through-the-menu test.** No test renames through the menu today: the rename test double-clicks (`view-writes.test.ts:316-330`). With a Root per tab, the Trigger node is the button that `startTabRename` swaps for the input (`:524-541`). Add: "Right-click `Second`, choose Rename, type `Later`, Enter: the file has `Later`." Close-time focus goes to the trigger only when it is tabbable (`menu.svelte.js:838-841`). Otherwise bits-ui's focus scope decides, which I did not trace. If the input loses focus, `onblur={commitTabRename}` (`:529`) ends the rename at once.
- **S4. Add 009 to "Blocked by".** The priority note says VD-01 (009) before VE-01 (012) (`priority-2026-11-08.md:63`). The Note says relay-lite does not enforce "Run after". The ledger has 012 blocked by 010 only (`ledger.md:49`). Both Issues edit `CollectionView.view-writes.test.ts` (009's criterion at `issues/009-*.md:22`). "Blocked by: 010, 009" turns the series rule into something the ledger enforces. There is no semantic dependency, only file overlap.
- **S5. Translate the old feature numbers in Notes.** "view-editor 01" is 009 and "view-editor 02" is 131 here (`priority-2026-11-08.md:83` and the mapping). Write the local numbers so the agent does not need the map.
- **S6. Refresh the line numbers.** Trigger `:519-553` (Issue: `:517-551`), tab `oncontextmenu` `:538` (`:536`), declaration `:106` (`:105`), reads `:555-556` (`:553-554`), `handleDeleteView` `:445-451` (`:443-449`), Delete item `:579` (`:577`).
- **S7. Doc criterion.** Point at the exact bullet, `help/documentation/12-collection.md:150`: "Delete view asks for confirmation, naming the view." Keep the existing "Delete is disabled when only one view remains" sentence.

## Dossier errors

1. **Test plan 1a uses a document-wide query.** `document.querySelectorAll('[role="menuitem"]').length === 0` ignores closed menus that stay mounted under jsdom (`NoteRowMenu.test.ts:155`). Tab 1's closed menu could keep the test red after a correct fix. Scope to `[role="menu"][data-state="open"]`. The empty-strip variant has the same flaw.
2. **Section 3 item 3 ("no collision") misses `tabindex: -1`.** The recommended `<button {...props}>` inside a `child` snippet removes the view tabs from keyboard navigation (S2).
3. **Section 3 item 1 says bits-ui returns focus to the trigger on close.** It does so only when the trigger is tabbable (`menu.svelte.js:838-841`), and a trigger with the spread `tabindex: -1` is not. The rename-focus risk is real, but the mechanism is described wrongly. Keep the test (S3) and drop the causal claim.
4. **The "Not verified" line about `onCloseAutoFocus`.** Its existence can be checked: `context-menu-content.svelte:20,42` and `menu.svelte.js:830-831`, with `preventDefault` honored at `:832`. Its effect on the rename was not traced.
5. **The impact rank is "low-medium".** The dossier does not note that the tab strip appears only when a `.view` is open as an editor tab, never in the rail views the owner uses daily (`TypesNavigator.svelte:309`, "Open view"). That puts it at low.
6. **Minor: the HEAD is stale.** The dossier names `afc0a9df8`, but the current HEAD is `318b6e9b5`. The cited code is unchanged (the last commit to both files is `107bcf35a`).

The dossier's other claims hold: the bug is present exactly, `ask` is the repo convention, a Root per tab is the right design, the two existing delete tests need `ask` resolving `true`, the 010 overlap is textual only, and the help line is `:150`.

## Not verified

- No test was run. The red-today claims for M1 and M3 are traced from code.
- Whether jsdom in this setup unmounts a closed menu after one `requestAnimationFrame` (`internal/animations-complete.js:36-38` runs the callback when `getAnimations` is missing) or keeps it, as the `NoteRowMenu` test comment says. The open-scoped query in M3 is correct either way.
- Whether a deleted view can be undone in the editor buffer, beyond the Issue's "file history only" note.

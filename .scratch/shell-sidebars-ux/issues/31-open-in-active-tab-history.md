# 31: Note-list rows open in the active tab and record a per-tab history

**Origin:** design review 2026-11-17, proposal P35 (Replace and history; Back/Forward is new 32, links new 33), prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html`, research `.scratch/shell-sidebars-ux/research/verdict-sh-history-breadcrumb.md` (ticket C) and `breakdown.md` (old ticket 41). Owner decision recorded: Replace.

**What to build:**

1. **Replace rule.** A plain click on a note-list row opens the note in the active tab when that tab is an unpinned markdown note and the target is a `.md` note; the tab remembers where it was. Cmd/Ctrl+click (`isOpenLinkModifier(e, IS_MAC)`, which is Ctrl on Linux CI, `utils/platform.ts:28-33`), a middle click (`auxclick`, button 1) and "Open in new tab" add a tab as today. A target already open elsewhere is focused with no history entry; the active note itself is a no-op. Every other case (pinned, virtual, canvas, kanban or `.view` active tab or target, binary target, no active tab) goes through `openFileInEditor`, because canvas and collection views flush edits into the tab of their path on destroy (`EditorView.svelte:83-91`).
2. **Leaving a note** runs what closing its tab runs: `flushPendingEdits`, save with the second-save loop (`editor.service.ts:369-382`). If the flush or save fails, the target opens in a new tab and the old tab keeps its edits (no prompt).
3. **Pure history** in new `src/lib/core/editor/tab-history.logic.ts`: `push(history, leaving, cap = 50)` (clears forward), `back`, `forward`, and prefix-aware `rewritePath` and `prunePath` (the `oldPath + '/'` rule of `link-updater.service.ts:101-107` and `closeTabsForDeletedPath`, `editor.service.ts:463-470`).
4. **Tab model.** `EditorTab.history?: { back: string[]; forward: string[] }` (`editor.types.ts`); a store method in `editor.store.svelte.ts` that swaps a tab's path, name, content, savedContent and history in place and clears `sourceMode` (new 25).
5. **One shared loader** extracted from `openFileInEditor` (binary gate `:158-162`, `readTextFile`, `fileType` derivation `:176-191`) and used by both paths, so open-itens 094's UTF-8 decode guard covers navigation whichever lands first.
6. **Service.** New `src/lib/core/editor/tab-history.service.ts`: `navigateInActiveTab(path)` re-checks after the read that the active tab is still the leaving path and the target was not opened meanwhile, then swaps, pushes the leaving path and calls `notifyTabClosed(leaving)` (export it from `editor.service.ts:38-46`; it feeds queryjs invalidation). The new open path reports like `openFileInEditor` (open-itens 148).
7. **Path changes.** `updateTabAfterRenameOrMove` (`link-updater.service.ts`) rewrites every tab's history; `closeTabsForDeletedPath` prunes it, both folder-prefix aware.
8. **Row clicks.** `NoteRow.svelte:71` applies the rules above. Tests that mock `editor.service` with a closed factory (`RailNoteList.test.ts:45`, `{ openFileInEditor }` only) mock the new service too.
9. **E2E helper.** `e2e/fixtures/helpers.ts` `openFile` (`:82-90`) clicks with `modifiers: ['ControlOrMeta']`, so the 29 specs that call it more than once keep their tab counts (a hard-coded Cmd+click would be a plain click on Linux CI).
10. Help `03-editor.md` Tabs, `02-file-explorer.md:59` ("Open in new tab" row).

Split point if one context is too small: items 3 to 7 (engine) first, then items 1, 8 and 9 (row rules and the E2E helper). Not in this ticket: Back/Forward (new 32), links (new 33), "make Open in new tab open a second tab on the same path" (a tab is its path), Back/Forward on canvas, kanban and `.view` tabs, quick switcher, search results, Properties link values, Tasks, Calendar, deep links, mods and meta-bind `open` (unchanged add-or-focus).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` for `tabs.spec.ts`, `tab-pinning.spec.ts` and the new spec.

- [ ] Failing test first, `tab-history.logic.test.ts` (no mocks): push clears forward and caps at 50; back then forward round-trips; `rewritePath` handles a file and a folder (`/v/A/x.md` under `/v/A` to `/v/B`); `prunePath` drops a file and everything under a deleted folder.
- [ ] Failing test first, `tab-history.service.test.ts` (real `editorStore`; mock only `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-dialog`, `svelte-sonner`): with unpinned markdown A active, `navigateInActiveTab(B)` leaves one tab whose path, name and content are B's and whose history is `back: [A]`, `forward: []`.
- [ ] Failing test first: a pinned A, a virtual active tab, a `.canvas` target and a binary target each go through `openFileInEditor` with A unchanged; B open elsewhere is focused with no entry; navigating to A itself changes nothing; a dirty A whose save fails (`writeTextFile` rejects) opens B in a new tab and A keeps its content.
- [ ] Failing test first: renaming A's folder rewrites A in another tab's history; deleting it prunes it.
- [ ] Row click: plain navigates; modifier and middle click call `openFileInEditor`. `RailNoteList.test.ts:338,881` change on purpose; `:733`, `:983`, `:1052` are creator paths and stay unchanged (check each).
- [ ] The loader is shared: a non-UTF-8 or binary target is rejected the same way through both paths.
- [ ] E2E: a new spec opens A then B by plain row clicks and sees one tab titled B (label per new 22); the existing multi-`openFile` specs stay green unchanged.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P35.** There is no navigation history: every open adds a tab, and there is no Back. Give each tab its own back/forward history. Owner decision: a plain click replaces the active unpinned tab, with Cmd+click, middle click and the menu item opening a new one. (Back/Forward keys and mouse buttons are new 32; links new 33.)

## Problem

`openFileInEditor` focuses or appends a tab, and `NoteRow.svelte:71` and "Open in new tab" (`NoteRowMenu.svelte:224-227`) call it identically, so browsing notes piles up tabs and nothing is reversible.

## Evidence

Checked at `ab143a411`.

- `src/lib/core/editor/editor.service.ts:148-198` `openFileInEditor` (binary gate `:158-162`, focus `:164-170`, race re-check `:178-182`, `addTab` `:188-191`); `:38-46` `notifyTabClosed` is private; `:362-395` `closeTab`.
- `src/lib/features/note-list/NoteRow.svelte:71` `onclick={() => openFileInEditor(note.path)}`; `NoteRowMenu.svelte:224-227`.
- `src/lib/core/filesystem/link-updater.service.ts:95-108` re-paths tabs under a renamed folder through `updateTabPath`.
- `src/lib/core/editor/editor.store.svelte.ts` has no history or swap method; no `auxclick` handler exists in `src/lib`.
- E2E runs on `ubuntu-24.04` (`.github/workflows/e2e.yml:20`), where the open-link modifier is Ctrl.

## Sequence with

- `NoteRow.svelte`: new 15 (Inbox check), new 19 (`tabindex`), new 24 (flash prop).
- `editor.store.svelte.ts`, `editor.types.ts`, `editor.logic.ts`: new 22 (`moveTab` returns the same objects, so history moves with a tab), new 25 (`sourceMode`).
- `editor.service.ts`: new 23 (bulk closes), new 25 (`toggleSourceMode`); open-itens 094 and 148 (rebase, whichever lands second).
- `help/documentation/03-editor.md`: new 21, 22, 23, 24, 25, 27, 32, 33.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: Replace (old 41.1): a plain click on a note row or link replaces the active unpinned markdown tab, Cmd/Ctrl+click and middle click open a new tab, Back undoes. Defaults (not individually answered): 31.1 (old 41.2) first-pass surfaces are note-list rows here and editor wikilinks plus the Backlinks, Relationships and Outgoing rows in new 33; 31.2 (old 41.3) Replace only markdown to markdown.

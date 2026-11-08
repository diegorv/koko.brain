# Context menus for mods: one generic API or one per surface

Read-only research. Paths are under `/Users/diegorv/Dev/pet-projects/koko/brain/src/lib` unless noted. Every line number below was read in this session.

## Answer

One registry, one `ctx.addMenuItem`, one render component, four small target projections. Not one API per surface, and not a refactor of the existing menus.

- The built-in menus share no code. Each is hand-written JSX over the same `components/ui/context-menu` wrapper: Copy path / Reveal / Rename / Trash are copied in `features/note-list/NoteRowMenu.svelte:230-270`, `features/rail-shell/FilesNavigator.svelte:362-392`, `features/rail-shell/TypesNavigator.svelte:321-340,368-386`. Icon-picker and `runOrToast` helpers are copied too (NoteRowMenu:64,162-186 vs FilesNavigator:111,211-235). Unifying them is a separate refactor and is not needed: the mod seam only appends a group.
- What differs per surface is only the target (what the click was on). So the contract is a discriminated union `target`, and `surfaces: [...]` on the item.
- The registry must live in `core/`, not in `features/rail-shell` like `railRegistryStore`: `EditorTabs.svelte` and `MarkdownEditor.svelte` are core and `core -> features` is a hard rule (`scripts/import-graph.mjs:163`; grep of `src/lib/core` for `#lib/features` and `#lib/plugins` returns nothing). `plugins/mods -> core` and `features -> core` are legal. `components/ui` cannot import core (`import-graph.mjs:168`), so the renderer sits in `core/`, not in `components/ui`. Alternative with no new core state: pass a snippet prop from `app/`, as `EditorTabs.svelte:17-25` already does for `tabIcon`. Costs two more prop drills; the store is simpler for four surfaces.
- Baseline stays at 3 (`src/tests/lib/architecture/layer-baseline.json`, all `utils` entries).

## Verified facts that shape the design

1. Mods have two UI entry points: `addAction` (`mods-host.service.ts:295`) and `addRailButton` (`:323`), contract `mod-api.v1.ts:303,305`. No menu member.
2. Menus today: note row (`NoteRowMenu.svelte:189-273`, one consumer `RailNoteList.svelte:821-897`), Files folder tree (`FilesNavigator.svelte:309-396`), Types navigator for type rows and view rows (`TypesNavigator.svelte:233-396`, targets set at `:285` and `:414`), editor tab (`EditorTabs.svelte:48-110`, one `ContextMenu.Root` per tab), editor body (`MarkdownEditor.svelte:722-757`). Kanban, Collection and Canvas have their own (Canvas is a positioned custom menu, `CanvasContextMenu.svelte:13-30`).
3. Targets today: note row = `NoteRowNote` with an ABSOLUTE `path`, `title`, `favorite`, `frontmatter` (`note-row.types.ts:4-15`); folder = `{path, name, isRoot}` (`FilesNavigator.svelte:92`), where a right-click outside rows is the vault root (`:316-322`); tab = `EditorTab` with `fileType` from a closed union and virtual paths `__virtual__/...` (`editor.types.ts:12`, `editor.logic.ts:18-20`); editor = `view` plus `contextMenuPos` (`MarkdownEditor.svelte:287-305`).
4. Multi-select does not exist anywhere: rows open on click (`NoteRow.svelte:66`), the only `selected*` state in the rail is the list-properties picker (`RailNoteList.svelte:405`). Files tree rows pick one folder (`FilesNavigator.svelte:475`).
5. The note list IS virtualized: `VList` from `virtua/svelte` (`RailNoteList.svelte:4,823,888`), rows built by the `noteRow` snippet (`:901`). Anything mod-owned must stay out of that snippet. A menu item evaluated on the `contextmenu` event never enters it.
6. Existing tests pin the exact menu labels and the blank-area suppression (`tests/lib/features/note-list/NoteRowMenu.test.ts:285-294`; also `FilesNavigator.menu.test.ts`, `EditorTabs.test.ts:112`, `MarkdownEditor.test.ts`). With zero registered items the new code must render nothing extra.
7. Disposal pattern to copy: `disposable()` (`mods-host.service.ts:105-116`) removes the cleanup from `runtime.disposers` and runs it once; `unloadMod` runs the rest in reverse. `railRegistryStore` uses `$state.raw` arrays replaced on register and unregister by identity (`rail-registry.store.svelte.ts:3-10,70-76`). `assertLive` throws once unloaded or after a vault change (`mods-host.service.ts:97-99`).
8. `runAction` (`:204-247`) calls `modPickerStore.showRun` at `:223`, so any action opens the run view, even one-line ones (a single-action rail button does the same via `openPicker`). The busy guard ("one live run per button") lives in `openPicker` (`:257`), NOT in `runAction`; `modsRunsStore.start` replaces the previous run with the same key (`mods-runs.store.svelte.ts:81`). A menu path calling `runAction` directly needs its own guard, or a second right-click run orphans the first run's record.
9. ADR-0036 and `28-mods.md` accept that a sync loop or throw in mod code runs on the main thread; nothing in the host can stop a sync loop.

## Candidate E1: foundation plus note row (rail note list)

- API sketch (`contract/mod-api.v1.ts`, additive after `:305`; imports nothing, function-typed members):
```ts
export type ModMenuSurfaceV1 = 'note' | 'folder' | 'tab' | 'editor';
export type ModMenuTargetV1 =
  | { surface: 'note'; path: string; title: string; kind: 'markdown' | 'other'; favorite: boolean }
  | { surface: 'folder'; path: string } // '' is the vault root
  | { surface: 'tab'; path: string | null; kind: 'markdown' | 'other' | 'virtual'; pinned: boolean; dirty: boolean }
  | { surface: 'editor'; path: string; selection: string };
export interface ModMenuItemV1 {
  id: string; title: string; surfaces: ModMenuSurfaceV1[];
  when?: (target: ModMenuTargetV1) => boolean; // shown only when it returns true
  run: (target: ModMenuTargetV1, run: ModRunV1) => unknown;
}
// in ModContextV1:
addMenuItem: (item: ModMenuItemV1) => () => void;
```
  Paths are vault-relative (`getRelativePath`, `core/filesystem/fs.logic.ts:265`), never the internal `NoteRowNote`. No icon in v1: built-in items use Svelte icon components, mods use string refs; add later, additive.
- Cost M. New: `core/context-menu/menu-contributions.store.svelte.ts` (~40 lines, pattern of `rail-registry.store.svelte.ts`), `menu-contributions.logic.ts` (`itemsFor(surface, target)`, `when` in try/catch, hidden on throw), `ContributedMenuItems.svelte` (~40 lines: separator plus items). Edit: `mod-api.v1.ts:305`, `mods-host.service.ts` after `:356` (validate id/title/surfaces/run, reject duplicate id like `buttonIds` at `:~320`, `disposable`, run through `runAction` with key `mod:<id>:menu:<itemId>` plus a busy guard), `NoteRow.svelte:67` and `NoteRowMenu.svelte:43,55-61,211-271` (compute the item snapshot in the contextmenu handler, render before the Rename/Trash group at `:260`), `mod-api-contract.test.ts:205` (freeze list), `help/documentation/28-mods.md`. Tests: `NoteRowMenu.test.ts` harness with the real registry; `mods-host.service.test.ts`.
- Core/features change and layers: one new core unit, three small edits in features. Layers hold (see Answer). Built-in items stay hard-coded.
- Risks: HOT PATH none if `when` runs once per right-click and the result is held as a `$state.raw` snapshot (do not evaluate inside `{#each}` in Content, which re-runs on any reactive read). Row rename mode stops the event (`NoteRow.svelte:47`). DISPOSAL: a snapshot can outlive the mod while the menu is open; the click wrapper must check `runtime.unloaded` and no-op. Registry changes while a menu is open are not reflected (fine). DATA: absolute to relative conversion; non-markdown rows (`.canvas`, `.view`, PDFs) appear: `kind` lets `when` filter, the host cannot know which items write (mods are fully trusted). Focus: `context-menu-content.svelte:12-17` documents that a closing menu fights focus (a rename input lost focus); an item that opens `ctx.ui.prompt` right after the menu closes may hit this. Not verified, needs a run in the app. REACTIVITY: a `when` that returns a Promise is truthy: use `=== true`.
- Removes: portent's active-tab dependency and "Open a note first" error (`mods/portent/src/portent.service.ts:18-20`, `updateActive`); bulk-tag's folder typed prompt (`mods/bulk-tag/src/bulk-tag.service.ts:45-46`) once E2 lands. Removes no core code; adds about 150 lines.
- Experiments: portent "Set parent" and "Archive" on the right-clicked note; "Copy as wikilink"; a per-note health check from vault-health; send-to-inbox.
- Tier A. Prototype as a mod first: NOT reliably. A note row carries no path in the DOM (`NoteRow.svelte:65` only `data-note-row`, title in `data-note-row-title`), so a DOM-injection mod would map titles to paths through `ctx.kb()` and break on duplicate titles. Spike the registry in a branch instead.

## Candidate E2: folder items in the Files tree

- API sketch: the same `addMenuItem` with `surfaces: ['folder']`; `target.path` is `''` for the vault root, else vault-relative.
- Cost S after E1. Edit `FilesNavigator.svelte:316-322,437-444` (snapshot on contextmenu, where `menuTarget` is already set) and render inside `:343-395` between New folder (`:356`) and the `!target.isRoot` block (`:360`). Test in `FilesNavigator.menu.test.ts`.
- Core/layers: none new. Do NOT reuse `railRegistryStore.folderCreators`: `RailFolderCreator` is a "New <thing>" item with a Svelte `icon: Component`, a `fileName` and `create(dir) => path`, and `handleNewFile` then picks the lens and opens the file (`rail-shell.types.ts:218-229`, `FilesNavigator.svelte:122-127`). It cannot express "Tag notes here". It is a precedent for the pattern, not a seam.
- Risks: root versus folder path form (`menuTarget.path` is absolute, root = `vaultRoot`, `:319`). Stale path if the folder is renamed during a long run: the mod's concern, rare, no handling. While a rename input is open the folder menu is suppressed (`:437-441`). Items in the root menu need `target.path === ''` handling in mods (`ctx.vault.list('')` is legal, contract `mod-api.v1.ts` ModVaultV1.list).
- Removes: bulk-tag's two chained prompts (folder, tag) and the "No notes there" alert (`bulk-tag.service.ts:45-48,66`): the folder comes from the click. New folder-scoped mods without a prompt.
- Experiments: "Tag all notes here", "New PRD here" (`ctx.vault.create`), "Run health check on this folder".
- Tier A. Prototype as a mod: possible but brittle. Folder rows carry the absolute path (`data-files-navigator-row={node.path}`, `FilesNavigator.svelte:431`), so a capture `contextmenu` listener plus a MutationObserver on the portaled `[data-slot="context-menu-content"]` could append a DOM item. Not run; it skips bits-ui keyboard navigation and focus handling, and proves nothing about the real API.

## Candidate E3: editor body menu

- API sketch: `surfaces: ['editor']`, target `{ surface: 'editor'; path; selection }` (selection text, `''` when empty).
- Cost S-M. Edit `MarkdownEditor.svelte:297-305` (snapshot after the cursor move, so `selection` matches what the user sees) and `:729-756` (group after Copy block embed at `:753`). Test `MarkdownEditor.test.ts`.
- Core/layers: core only, uses the core store; holds.
- Risks: not a hot path (menu open). `handleContextMenu` moves the cursor before the menu (`:303`); an item that reads `editorStore` raw sees the moved cursor, not the click spot (the host passes no position in v1). Mutation has no contract API: a mod writes through raw `ctx.app.editorStore.editorView` (`mod-app.service.ts:25`, template `mods/shared/editor.ts:24-40` keeps undo and unsaved edits). Menu rows in the editor must not touch Live Preview decorations (`docs/agents/live-preview-rules.md` rules 1-4, read; a menu click dispatches one ordinary transaction, nothing in the decorator path changes). Whether the editor regains focus after the item is not verified.
- Removes: nothing in core. Mods stop needing a picker round trip for selection actions (playground `index.ts:41-48` stamp).
- Experiments: "Send selection to today's daily note" (daily-log), "Insert link to daily note".
- Tier B: useful mainly together with a stable `ctx.editor`, which is another cluster. Prototype as a mod: partly (capture `contextmenu` on `.cm-editor` plus `ctx.app.editorStore.editorView`), DOM injection again.

## Candidate E4: tab menu

- API sketch: `surfaces: ['tab']`; `path` is `null` and `kind: 'virtual'` for `__virtual__/` tabs; expose `kind`, not the internal closed `fileType` union (`editor.types.ts:12`).
- Cost S. Edit `EditorTabs.svelte:51-62` (add `oncontextmenu` on the tab div; none exists) and `:98-109`. One `ContextMenu.Root` per tab, so the snapshot must be taken per tab on its own event, never in an `{#each}` render. Test `EditorTabs.test.ts:112`.
- Risks: `dirty` (`tab.content !== savedContent`): a mod that writes a dirty note with `ctx.vault.write` loses the edit; the target exposes `dirty` so `when` can hide. Pin state changes under an open menu: snapshot only.
- Removes: nothing. Experiments: "Copy path" and "Reveal" for tabs (built-in menu has only Pin and Close, `:99-108`), "Move note to ..." from the tab.
- Tier C: nothing here a note-row item cannot do, and the tab is reached via the note anyway. Prototype as a mod: possible (tab DOM order equals `editorStore.tabs`, no path in the DOM, `EditorTabs.svelte:51-62`); low value.

## Candidate E5: Types navigator rows (type rows and `.view` rows)

- API sketch: would need two more targets (`{surface:'type', typeName, definitionPath|null}`, `{surface:'view', path}`).
- Cost S-M: `TypesNavigator.svelte:239-247,285,414` plus content `:300-395`. Missed by every scout.
- Risks: two target shapes, a type with no definition file (`definitionPath` null, `:380`), pin state. Tier C. A `.view` row is already reachable as a note on the folder lens. Skip.

## Candidate E6: multi-select targets (`targets: []`)

- Needs a selection model that does not exist (fact 4): modifier clicks in `NoteRow.svelte:66`, selection state, a menu keyed by array, every built-in action still single-path. Cost L, touches list click handling (hot interaction path), and the owner has not asked for it.
- Do not add arrays now. Keep the run argument an object with `target` so a later `targets` field is additive. Tier C. Not prototypable as a mod.

## Candidate E7: blank-area items and moving built-in items into the registry

- Blank area: the note list suppresses the menu there on purpose and tests it (`NoteRowMenu.svelte:195-205`, `NoteRowMenu.test.ts:290`); the Files tree already treats blank as the vault root (E2). Tier C, skip.
- Moving built-ins into the registry would remove the duplication in fact "Answer" but rewrites four tested menus for no mod gain. Tier C, do not do it under this goal.

## Order and trade-offs

1. E1 (store, contract member, renderer, note row) as one Issue with E2 as a second small Issue right after. Together they cover the owner's "right-click on the file and note lists".
2. E3 only after a stable `ctx.editor` exists; E4 on demand; E5 to E7 not scheduled.
- Reuse `runAction` (run view shown, Stop, error toast, matches rail single-action buttons) versus a quiet wrapper (no run view for instant items): recommended reuse plus the busy guard; a quiet mode is a separate improvement for all entry points.
- `when` at open time with a snapshot, versus live: the snapshot keeps mod code off render and reactivity.
- Flat list after a separator, versus per-mod submenu: flat for v1; the mod owns the title. Open for the owner.

## Refuted or corrected scout claims

- "the rail list is not virtualized (grep found no virtualization)" (mod:portent): REFUTED, `VList` from virtua at `RailNoteList.svelte:4,823,888`.
- "folderCreators already exists, only the mod-facing surface is missing, near-zero core change" (mod:focus-timer, mod:bulk-tag, mod:hotkeys): REFUTED as a seam. It only models "New <file>" creators with a Svelte icon component; see E2.
- "NoteRowMenu is the only menu for the file list; FilesNavigator.svelte:309-361 is the second menu" (surface scout): incomplete. The Files menu spans `:343-395`, and a third navigator menu (Types) exists, plus tab and editor menus.
- `addNoteMenuItem({ when(notes), run(notes) })` with arrays (mod:bulk-tag): premature, no multi-select exists (fact 4).
- "hide write items on non-markdown rows by default" (surface scout): not needed. Pass `kind`; mods are fully trusted and the host cannot tell which items write. The built-in gate (`NoteRowMenu.svelte:245-255`) protects built-in writes only.
- "ModNoteV1 should carry frontmatter": not adopted; widens the contract (frontmatter is read through the unstable `ctx.kb`).
- "CLAUDE.md lists core to features violations" (ext:logseq): confirmed stale, baseline has 3 `utils` entries and core imports no features or plugins.
- Confirmed true: `NoteRowNote.path` is absolute (`note-row.types.ts:6`); the 4 portent and bulk-tag hack citations above; Obsidian `file-menu`, `files-menu`, `editor-menu` at `obsidian.d.ts:11073,11079,11092` (reference only, imperative `Menu` there, declarative here).

## Could not verify

- Whether bits-ui `ContextMenu.Content` unmounts its children when closed (inferred from `context-menu-content.svelte:12-17`); the snapshot design does not depend on it.
- Focus behaviour when a mod item opens a dialog or prompt right after the menu closes; needs a run in the app.
- Whether an editor tab can hold a path outside the vault (would need a null or absolute-path rule in the target).
- Nothing was built, run or tested. Canvas, Kanban and Collection menus were only counted, not read.

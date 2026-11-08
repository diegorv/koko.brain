## Verdict
CHANGES PLAN (two small corrections to EP-03; section 5 rows 3 and 21 stand).

## Verified changes

1. EP-03 Paths bullet and Test line ("root gives ''"). The conversion the plan names does not produce '' for the vault root.
   - Read: `src/lib/utils/path.ts:98-103`: `relativePath` returns `filePath` unchanged unless it starts with `vaultPath + '/'`. `getRelativePath` is a thin wrapper (`core/filesystem/fs.logic.ts:265-267`).
   - Read: the Files tree sets the root target to `{ path: vaultRoot, isRoot: true }` (`features/rail-shell/FilesNavigator.svelte:316-319`), with `vaultRoot` the vault path minus trailing slash (`:72`).
   - So `getRelativePath(vault, vaultRoot)` returns the absolute vault root. The planned test fails, and a mod would get the absolute root where it expects ''.
   - Change: add to the Paths bullet "root: `target.isRoot ? '' : getRelativePath(...)`, decided where the snapshot is built, not in the mod." Keep the test line. Also pass the same root form (`vaultStore.path` and the stripped `vaultRoot` must agree on a trailing slash).

2. EP-03 Core and files, rail-registry line ("one more `$state.raw` list"). The store also has `reset()` (`rail-registry.store.svelte.ts:87-93`), which clears every list, and tests call it 25 times (`grep railRegistryStore.reset src/tests`). The plan never mentions it.
   - Change: "one more `$state.raw` list, a getter, a register function that returns an unregister by identity, and a line in `reset()`". Without that line the new list leaks between test files.
   - Teardown does not call `reset()` (no call in `src/lib`). Removal at unload rides on the mod's `disposable()`, as EP-03 already assumes (`mods-host.service.ts:105-116`). Test "none after unload" is therefore the real guard.

3. EP-03 API note (optional, cosmetic, easy route). The plan gives the item no icon. Built-in items are an icon plus label, and `context-menu-item.svelte` supports `inset` (`data-[inset]:ps-8`). A label with no icon sits at 8px; built-in labels sit at 8 + 16 + 8 = 32px, which equals `ps-8`.
   - Change: render mod items with `inset`. No icon field is needed in v1. Add one assertion to the zero-items and one-item tests.

4. Section 5 row 21 (tab and editor menu). The conclusion is right but its reason is cut short. Add: "`railRegistryStore` lives in `features/`; `EditorTabs.svelte` and `MarkdownEditor.svelte` are `core/`, and core may not import features (ADR-0003, baseline holds only 3 `utils` entries), so these two need a new `core/` store or a snippet prop passed down from `app/`."
   - Read: `EditorTabs.svelte:48-110` (one `ContextMenu.Root` per tab, no `oncontextmenu` on the tab div, items by `index`).
   - Read: `layer-baseline.json` (3 entries, all `utils`).
   - Do not schedule it. A selection verb already works through EP-02's raw rows plus `ctx.app.editorStore.editorView`.

## Scout claims refuted
- file-tree-menu: "folderCreators is the cheapest entry point for mods" fails as the seam. `RailFolderCreator` needs a Svelte `icon: Component`, a `fileName` and `create(dir) => path`, and `handleNewFile` then picks the lens and opens the file (`rail-shell.types.ts:218-229`, `FilesNavigator.svelte:122-127`). It cannot run "Tag all here". The plan already rejects it.
- file-tree-menu: "layer rule needs verification before wiring". `mods-host.service.ts:9` already imports `railRegistryStore`, and the baseline has no `plugins -> features` entry. Nothing to verify.
- file-tree-menu: "L cost, arbitrary items need a generic registry replacing hard-coded items". Not needed. The mod group is appended after New folder (`FilesNavigator.svelte:356-360`) and built-ins stay hard-coded; the plan's M holds.
- tab-and-editor-menu: "`ContextMenu.Content` mounts only when open, so a registry read is fresh per open" is an inference, and incomplete. A closing menu stays mounted and still handles the pointer (`components/ui/context-menu/context-menu-content.svelte:12-17`). EP-03's busy guard covers the double run.
- tab-and-editor-menu: a `when` callback running on every open. Rejected in EP-03; not a plan change.
- tab-and-editor-menu: "Reading the selection is S with no API change" is true, but it is a different cluster (raw reach) and EP-02 covers it.

## Confirmed, no change
- Every EP-03 line cite I read matches: `NoteRowMenu.svelte:246` (`isMarkdownFile` gate), `:260` (separator before Rename), `:162-164` (icon picker, no tick), `NoteRow.svelte:67` (`oncontextmenu` sets the target), `RailNoteList.svelte:821` (`NoteRowMenu` wraps the `VList`), `FilesNavigator.svelte:356-360`, `mods-host.service.ts:105` and `:30-46`.
- `NoteRowMenu` has one consumer, `RailNoteList.svelte`, so a default-empty `extraItems` prop is safe.
- The Files tree lists folders only (`lens.logic.ts:928-930`), so `files: 'markdown' | 'all'` applies to note rows only. Say so in the API comment.
- Haiku's facts that the plan lacked but that change nothing: Rename mode stops propagation and keeps the native menu (`FilesNavigator.svelte:439-441`, `NoteRow.svelte:47`).

## Still unverified
- Focus after a mod item opens `ctx.ui.prompt` (needs an app run; EP-03's E2E).
- Whether bits-ui unmounts closed `Content` children. The snapshot-free design does not depend on it.
- `MarkdownEditor.svelte` handler lines (297-305, 722-757) were taken from the scouts, not read. They only matter if row 21 is ever scheduled.
- Whether `inset` renders pixel-aligned in the real theme.

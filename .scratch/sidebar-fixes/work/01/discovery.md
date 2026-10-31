# Issue 01 discovery: file tree failure toasts

No `spec.md` for sidebar-fixes. Source finding: `docs/ux-sidebar-discovery:.scratch/ux-sidebar/work/02-files-mode.md` F10 + section 4 table, re-verified on main.

## Verified on main
- `fs.service.ts` createFile:140, createFolder:160, deleteItem:187, renameItem:199-217, moveItem:226-245, duplicateItem:280 all `error()` + return null/false. Collision is `exists(newPath)` -> null with no reason.
- `FileTreeItem.svelte:115` drops invalid names silently; `:122` rename, `:201` move ignore failure.
- `FileExplorer.svelte:96,108,119,131,143,157,194,253` create/duplicate/delete/root-move ignore failure.
- canvas/kanban/collection `create*File` wrappers catch and return null (also swallow).

## Plan
1. `fs.logic.ts`: `getFileNameError(name): string | null` naming the rule (leading ".", the offending character, control chars, empty). `isValidFileName` delegates.
2. `fs.service.ts`: the six operations log and rethrow. Collision throws `Error('"<name>" already exists in this folder')`. Return types: create*/duplicate/rename -> `Promise<string>`, delete -> `Promise<void>`, move -> `Promise<string | null>` (null only for the same-path no-op).
3. canvas/kanban/collection create wrappers propagate (drop try/catch).
4. File tree components catch and `toast.error('Could not <op> "<name>": <reason>')`. Invalid rename toasts the rule; nothing renamed.
5. Other callers keep their prior behavior under the new contract:
   - type-definitions createNoteOfType keeps `Error('create-failed')` (event-calendar:845 matches on it); createType keeps its toast; renameType/createView return quietly as before (service logs).
   - event-calendar rename/duplicate/delete map the throw to the errors they threw on null.
   - auto-move returns on failure; wikilink-navigation/MarkdownEditor return on failure.
   - QuickSwitcher keeps its "Failed to create file." toast.
   - command palette: errors propagate to CommandPalette.svelte:28-32, which already toasts.
   - TypeNoteList rename/duplicate/delete: toast like the file tree (it calls the same ops and would otherwise get an unhandled rejection).

## Tests (prior art)
- Services: `src/tests/lib/core/filesystem/fs.service.test.ts` (flip null asserts to `rejects`).
- Components: mount in jsdom like `src/tests/lib/features/type-definitions/TypeNoteList.view.test.ts`; mock `svelte-sonner` like `editor.service.test.ts`. New `src/tests/lib/core/file-explorer/FileTreeItem.test.ts` and `FileExplorer.test.ts` assert `toast.error` text.
- Update caller tests that mock null returns (canvas, kanban, collection, type-definitions, event-calendar).

## Risks
- Contract change touches ~20 call sites; each one is adapted to keep its old observable behavior.
- Case-only rename on APFS (`note.md` -> `Note.md`) now toasts "already exists" instead of silently failing. Fixing case-only rename is out of scope.
- Driving the bits-ui context menu in jsdom may be fragile; fallback is triggering handlers through the menu item DOM.

## Defaults taken
- Toast text: `Could not <verb> "<name>": <error message>`.
- Same-parent move stays a silent no-op (not a failure).

# Discovery: Issue 55, icon and favorite writers go through `updateNoteFrontmatter`

## Files that change

- `src/lib/features/file-icons/frontmatter-icon.service.ts:22-54` (`setFrontmatterIcon`) and `:57-75` (`removeFrontmatterIcon`): replace read + `rebuildContent` + `writeTextFile` + `syncExternalContentToEditor` + `applyNoteChange` with one `updateNoteFrontmatter(path, mutate)` call. The writer already syncs the tab and runs `notifyAfterSave` (which calls `applyNoteChange` source `save`).
- `src/lib/features/file-icons/file-icons.service.ts:113-166` (`setIconForPath`, `removeIconForPath`): skip the `fileIconsStore.updateFrontmatterIcon` calls when the write was refused.
- `src/lib/features/type-definitions/type-definitions.service.ts:235-249` (`toggleFavoriteForPath`): same swap; mutate is `toggleFavorite(props, favorite)`.
- `src/lib/features/properties/frontmatter-write.service.ts`: add `toastFrontmatterWriteError(err)`, generic (non-calendar) toast text per reason.
- `docs/adr/0029-frontmatter-yaml-canonical-form.md:101`: the amendment lists these two writers as refusing too.

## Plan

1. Icon writer: `setFrontmatterIcon` / `removeFrontmatterIcon` call `updateNoteFrontmatter`, catch only `FrontmatterWriteError`, toast it and return `false`; return `true` on success. Read errors and anything else still propagate. `setIconForPath` / `removeIconForPath` return early on `false` so the icon store is not updated for a refused write.
2. Favorite writer: `toggleFavoriteForPath` calls `updateNoteFrontmatter`, toasts a `FrontmatterWriteError` and returns; other errors propagate.

## Decisions (open questions)

- Refusal: adopt it. `updateNoteFrontmatter` has no drop mode, and dropping comments or nested values on an icon click is the data loss ADR-0029's amendment exists to stop. The UI reports it with a toast (`svelte-sonner`), no "Open note" action (smallest change). `save-failed` is not toasted (the editor already did), matching `toastEventError`.
- The toast lives in the writer services, not the four Svelte call sites (FileExplorer, TypeSidebar, TypeNoteList x2): they `await` without try/catch today, so a throw would be an unhandled rejection with no UI.
- `removeFrontmatterIcon` keeps its "no icon keys, no write" early return: it checks the current content (open tab, else disk) before calling the writer. Without it, removing an absent icon would rewrite (canonicalize) the note or toast a refusal for a no-op. I did not add a "mutate returned its input" short-circuit to `updateNoteFrontmatter`: `applyEventFields` returns its input for an empty patch, so it would change calendar behaviour.
- The favorite writer no longer limits the tab sync to the active tab: any open tab for the path is patched and saved (the writer's behaviour), which is what keeps a background dirty tab's edits.
- The folder-note placeholder write in `ensureFolderNote` (a brand new file, no tab possible) stays disk-direct: out of scope.

## Tests (prior art: `src/tests/lib/features/properties/frontmatter-write.service.test.ts`, in-memory `disk` map behind mocked `plugin-fs`, real `editorStore` / `vaultStore`)

- `frontmatter-icon.service.test.ts`: add `exists` to the fs mock and `svelte-sonner`; rewrite the tab-sync tests to the new semantics (base is the tab content); add a dirty-tab test (body edit kept, tab clean, disk = merge) for set and remove; add refusal tests (`comments` frontmatter: no write, toast, returns false). Keep the indexing tests (now through `notifyAfterSave`).
- `type-definitions.service.test.ts` `toggleFavoriteForPath`: it mocks `editor.service`, so add `saveFileByPath` to that mock; assert the tab branch patches the tab's own (dirty) content and saves; add a refusal test (toast, no write).
- `file-icons.service.test.ts`: `setIconForPath` on a refused note leaves `fileIconsStore` untouched.

## Risks

- `updateNoteFrontmatter` captures `vaultStore.path`; tests that never open a vault see `null` throughout, which is consistent.
- Callers that relied on the old "write even with lossy frontmatter" path now get a toast instead. That is the decided behaviour.

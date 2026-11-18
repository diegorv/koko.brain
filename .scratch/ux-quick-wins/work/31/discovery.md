# Issue 31 discovery: Auto Organize section copy, hint, toast, names, excluded folders

No `spec.md` in `.scratch/ux-quick-wins/` (README.md only); the Issue file is the spec. Issue 21 already landed the debounce `onchange` (line numbers below are at 46b4732a5, shifted from the Issue's).

## Files that change

- `src/lib/features/auto-organize/AutoOrganizeSection.svelte`
  - `:112` enable description, `:164-167` rules help, `:192-194` excluded help: Issue item 1 copy verbatim.
  - `:33-39` `saveConfig` `.catch`: add `toast.error('Could not save auto-organize rules', { id: 'auto-organize-save' })` next to `error()`.
  - After the Enable row (`:121`): `{#if !enabled && archiveTypeCount > 0}` `<p class="px-4 text-meta text-muted-foreground">` hint. `archiveTypeCount` is a `$derived` count of `typeDefinitionsStore.typeMetadataMap` values with a truthy `archiveTo` (same test as `type-lifecycle-rules.ts:28`).
  - `aria-label`s: Switch `:114` "Enable Auto Organize", debounce Input `:127` "Debounce delay", excluded Input `:197` "Folder to exclude", chip button `:220` "Remove <folder> from excluded folders".
  - `:90-97` `addExcludedFolder`: `isDuplicateExcluded` instead of `includes`; a duplicate sets `duplicateNotice = 'Already excluded'` and keeps the input; typing clears it. An always-rendered `<p aria-live="polite" class="text-meta ...">` holds it (empty `<p>` has no height).
  - Excluded Input gets `list="auto-organize-excluded-folders"` and a `<datalist>` of `[...collectAllDirPaths(fsStore.fileTree)].map((p) => getRelativePath(vaultPath, p))` (`fs.logic.ts:276,297`), `$derived`, empty without a vault.
  - Placeholder `:199` "e.g. _templates"; `{:else}` "No excluded folders" `<p class="text-meta ...">`.
  - Chip shows a muted "missing" when `isExcludedFolderMissing(folder, vaultFolders)`.
- `src/lib/features/auto-organize/auto-organize.logic.ts` (near `isInExcludedFolder` `:875`, which stays unchanged):
  - `isDuplicateExcluded(list, folder)`: trimmed, case-insensitive.
  - `isExcludedFolderMissing(folder, vaultFolders)`: false for an empty `vaultFolders` or a dot-prefixed folder, else no case-insensitive equal entry.

## Tests (test-first)

- `src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts`: copy assertions; hint with `typeDefinitionsStore.setTypeMetadataMap` (2 with `archiveTo`, 1 without), off/on, no new button; save failure: `vi.mock('@tauri-apps/plugin-fs')` (`exists` true, `writeTextFile` rejects) and `vi.mock('svelte-sonner')` as in `auto-organize.service.test.ts:6-11,34-36`, `vaultStore.open('/vault')`; excluded folders with `fsStore.setFileTree`; controls queried by role attribute + `aria-label` (no testing-library in the repo).
- `src/tests/lib/features/auto-organize/auto-organize.logic.test.ts`: `describe` blocks for both helpers, next to `isInExcludedFolder` (`:233`).

## Risks

- `settings-controls.test.ts:24` raw button count stays 1 (the chip button); the datalist and `<p>` are not flagged. `settings-text` requires `text-meta` on every `<p>`: the hint, notice and empty line all carry it.
- `settings-copy` forbids em dashes outside comments.
- `auto-organize.service.ts` is not edited.

## Defaults taken

- Hint copy is literal for every N ("1 of your types set ..."), as the Issue writes it.
- The datalist lists every vault folder, including ones already excluded; tree order.
- "Already excluded" clears on the next keystroke or a successful add.

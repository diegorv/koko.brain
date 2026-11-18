# 29 discovery: template picker names the template and what Enter will do

## Files that change

- `src/lib/plugins/templates/templates.logic.ts` (append after `filterTemplates`, :28-32): two pure functions.
  - `withMdExtension(name)`: `name.endsWith('.md') ? name : name + '.md'`, the same rule as `createFileFromTemplate` (`templates.service.ts:58`). The service stays unchanged (Issue: no change to `createFileFromTemplate`).
  - `noteExistsInTree(tree, vaultPath, fileName)`: walks `tree` segment by segment like `findFileNode` (`fs.logic.ts:25-39`), comparing `node.path` to `${vaultPath}/<segments>` case-insensitively; last segment must be a file, middle ones directories. Empty tree or no match returns false. Imports only the `FileTreeNode` type.
- `src/lib/plugins/templates/TemplatePicker.svelte`
  - :10-19 add `$derived` values: `selectedTemplateName` (from `templatesStore.templates` by `selectedTemplatePath`), `targetFileName` (`withMdExtension(fileName.trim())`), `existingNote` (`noteExistsInTree(fsStore.fileTree, vaultStore.path, ...)`, false when no vault).
  - :48-55 `handleKeydown`: Backspace with `fileName === ''` goes back (`selectedTemplatePath = null`), dialog stays open.
  - :72-90 naming step: template chip left of the input; hint "Creates X.md in the vault root" / "Creates A/X.md in the vault" (name contains `/`) / "Enter opens the existing note"; empty text unchanged.
  - :92 list step `Command.Input` gets `autofocus` so focus returns to the search after Backspace (the naming input that had focus is unmounted).
- `help/documentation/09-quick-notes-and-templates.md:183-184, :190`: chip, Enter hint, Backspace.

## Tests (prior art in the same files)

- `src/tests/lib/plugins/templates/TemplatePicker.test.ts`: reuse `reachNamingStep`/`typeName`/`pressEnter`; add a `pressBackspace` helper. Real `fsStore.setFileTree`, `vaultStore.open('/vault')` (as `periodic-notes.service.test.ts:45`), reset both in `beforeEach` (`fsStore.reset()`, `vaultStore._reset()`). Only `templates.service` mocked (header comment). Existing tests :66-101 unchanged.
- `src/tests/lib/plugins/templates/templates.logic.test.ts`: new `describe` blocks for both functions: root and folder case-insensitive match, directory with same name ignored, `.md` appended (and not doubled), empty tree, path outside tree (missing folder, other vault path).

## Plan

1. discovery commit.
2. logic tests (red) then logic functions (green), commit.
3. picker tests (red) then component changes (green), commit.
4. doc commit. Targeted checks: `pnpm check`, both test files.

## Risks and defaults

- `fsStore.fileTree` is the scanned tree; dot folders are skipped by `scan_vault`, so they never show as existing (out of scope per Issue).
- Hint text for the `/` form uses the typed folder exactly as typed (service creates parent folders, `note-creator.service.ts:98-99`).
- Backspace check uses the raw `fileName === ''`, so a whitespace-only name deletes a space first rather than going back.
- Default taken: the existing-note hint keeps the `Enter` kbd styling; rendered text reads "Enter opens the existing note".

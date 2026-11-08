# Issue 17 discovery

No `spec.md` in `.scratch/rail-shell-ux/`; the Issue alone drives this.

## Files that change

- `src/lib/features/type-definitions/type-sidebar.logic.ts` (after `getViewLabel`, `:328`): `buildNewViewYaml(name)` = `stringifyYaml({ _sidebar_label, _sort: 'title', views: [{ type: 'table', name }] }, { lineWidth: 0 })` (`stringify` already imported at `:2`).
- `src/lib/features/type-definitions/type-definitions.logic.ts:161` next to `validateTypeName`: `validateViewName(name, existingLabels)`: trim, `getFileNameError(trimmed)`, then the case-insensitive trimmed label clash. Import `getFileNameError` beside `isValidFileName` (`:2`).
- `src/lib/features/type-definitions/type-definitions.service.ts:244-280` `createView(name): Promise<string>`: throw without a vault; `createFile(vault, `${name}.view`, buildNewViewYaml(name))` with no own `readDir` (createFile dedupes and rejects on a root read error); keep `setSelection`; `vaultStore.requestPromptIndexRefresh()` after success. Drop the `(as in \`createView\`)` from `createTypedNote` JSDoc (`:113`), nothing else there.
- New `src/lib/features/type-definitions/ViewDialog.svelte`: name input, `saving` flag, inline `role="alert"` error, no `<form>`; calls `createView(trimmed)` and hands the path to `oncreated`. Close guard: `Dialog.Root bind:open={() => open, setter}` whose setter ignores a close while `saving` (one guard covers Cancel-less paths: Escape, outside click, close button); Cancel/Create disabled while saving.
- `src/lib/features/rail-shell/TypesNavigator.svelte:96-99,200,354`: `+` opens the dialog; `existingLabels = viewRows.map(r => r.label)`; `oncreated` -> `onPick({ kind: 'view', target })`.
- `help/documentation/25-types-and-relationships.md:337` "Creating a View" paragraph.

## Tests

- `type-sidebar.logic.test.ts`: `buildNewViewYaml` over the Issue's name list with real `parseCollectionYaml` + `yaml.parse`; `getViewLabel` over `entryV2(..., { frontmatter: parsed })`.
- `type-definitions.logic.test.ts`: `validateViewName` (copy `describe('validateTypeName')`, `:212`).
- `type-definitions.service.test.ts:667-750`: the five `createView` tests rewritten (no-vault / createFile reject / root read error reject; content + dedupe with a typed name), plus `takePromptIndexRefresh`.
- New `src/tests/lib/features/type-definitions/ViewDialog.test.ts` (jsdom, service mocked; mount pattern from `TypesNavigator.test.ts`).
- `TypesNavigator.test.ts:408-423`: the two New view tests rewritten to the dialog flow, plus existing-labels refusal and trimmed name.
- `e2e/specs/rail-shell.spec.ts`: happy path next to the view tests (`:479`).

## Risks

- bits-ui 2 function binding on `open`: the close setter is ignored, so the getter keeps it open; verified by the dialog test (Escape, outside pointerdown, close button while saving).
- Inline reason text: `createFile` rethrows the raw cause (an `Error` or a Tauri string); the dialog formats it with `fileOperationErrorMessage('create', '<name>.view', err)` (`fs.logic.ts:153`).

## Defaults taken

- Component name `ViewDialog` (Issues 18/19 extend it); title "New view", button "Create", placeholder "View name".
- No-vault rejection is `Error('No vault is open')`.
- The validation message shows after the first input event (a typed-then-cleared field shows "Name cannot be empty").

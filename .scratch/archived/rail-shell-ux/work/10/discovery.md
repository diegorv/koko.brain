# Issue 10 discovery: view lens error and loading states

No `spec.md` for rail-shell-ux; the Issue Notes carry the decisions.

## Files that change
- `rail-shell/rail-shell.types.ts:59-84`: `ViewLensStatus` (`loading` | `missing` | `error` + message); `ResolvedLens.status?`; `TypeNavigatorRow.keyNotes: string[]`.
- `rail-shell/lens.logic.ts:512-586`: `ViewLoad` = status | `{ kind: 'ran', result }`; `resolveViewLens(path, load, ctx)` returns the status for a non-ran load, and `error` for a ran result with `filterError` (keeps the `isListableNote` filter); `viewLoadFromQuery(result|null)` (null query = no view, an error); `viewReadError(err)`. `viewNavigatorRows` fills `keyNotes`; type and Untyped rows `[]` (`:367-377`).
- `type-definitions/type-sidebar.logic.ts:325-347`: `RESERVED_KEY_RULES` table (key, check, expected text) seeded with `_order` (number) and `_open_in_editor` (boolean), and `ignoredKeyNotes(frontmatter)`.
- `rail-shell/view-lens.service.ts`: map value `{ count } | { error }`; parse, read and filter errors become `error` entries; read failure still logged.
- `rail-shell/RailNoteList.svelte:131-192,375-493`: precedence Loading (index not ready) > missing (`findNodeByPath` over `fsStore.fileTree`, a `$derived` boolean the effect reads, so only a flip re-runs) > error (parse/read) > ran. Toolbar and New here need a status-free resolved lens. Body: Loading, "This view no longer exists", or the message plus "Open view" (`openFileInEditor`).
- `rail-shell/TypesNavigator.svelte:63-94,206-231`: `viewCounts` holds the new entries; the count slot always renders with a fixed `min-w-8` class, empty while pending; an error shows the mark inside the slot; key notes alone show the mark next to the count. Tooltip: error first, then notes (`title` + `aria-label`).

## Plan (test-first, one commit each)
1. `ignoredKeyNotes` + table (type-sidebar logic test), `keyNotes` on rows (lens.logic.test `viewNavigatorRows`).
2. `ViewLoad` / `resolveViewLens` status (lens.logic.test; parse messages from real `parseCollectionYaml` for `views: [` and a file with no `views`); migrate the existing calls in that describe block.
3. `countViewNotes` map shape (view-lens.service.test, migrate the two named tests).
4. `RailNoteList` states (RailNoteList.view.test: fixtures put the `.view` in `fsStore.fileTree`; migrate the two named tests; missing-after-cached-parse, toolbar hidden, Open view).
5. `TypesNavigator` slot and mark (TypesNavigator.test, migrate the named test).

## Prior art
- Error block style: `collection/CollectionView.svelte:566-571` (destructive tokens, `font-mono text-meta`).
- Component tests: existing `RailNoteList.view.test.ts` and `TypesNavigator.test.ts` harnesses (real stores, disk mocked).

## Defaults taken
- Read error text: `Could not read the view: <err.message>`.
- Note text: `Ignored key _order: expected a number` (value shown as YAML-ish JSON: `got "1"`).
- A key present with `null` is reported too (it is ignored as well).
- Loading text "Loading..." (repo uses ASCII dots, `TrashSection.svelte:81`); the header count stays as is.
- Loading skips the `.view` read; the seed runs on the first load after the index is ready.

## Risks
- `staleTypesPickFix` already moves the pick off a deleted view in `Rail`; the missing state shows in between and for any caller that keeps the lens.
- AppShell/e2e read `[data-types-navigator-count]` text of type rows only; view row count text unchanged once known.

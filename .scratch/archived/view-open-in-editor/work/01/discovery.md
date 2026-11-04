# Issue 01 discovery: a view marked to open in the editor

No `spec.md` exists for this feature; the Issue is the spec.

## Files that change

- `src/lib/features/type-definitions/type-sidebar.logic.ts:317-334` (next to `getViewLabel` / `getViewOrder` / `getViewSort`): add `getViewOpensInEditor(entry)`, true only when `entry.frontmatter._open_in_editor === true`.
- `src/lib/features/rail-shell/rail-shell.types.ts:71-82` (`TypeNavigatorRow`): add `opensInEditor: boolean`.
- `src/lib/features/rail-shell/lens.logic.ts:360-378` (`typeNavigatorRows`): type rows and Untyped set `opensInEditor: false`.
- `src/lib/features/rail-shell/lens.logic.ts:508-516` (`viewNavigatorRows`): `opensInEditor: getViewOpensInEditor(entry)`.
- `src/lib/features/rail-shell/TypesNavigator.svelte:231-252` (view rows): click calls `openFileInEditor(path)` when `row.opensInEditor`, else `onPick(row.lens)`; `active` is `sameLens(row.lens, picked) || (row.opensInEditor && editorStore.activeTabPath === path)`. Type rows unchanged.
- `help/documentation/25-types-and-relationships.md:359-372`: `_open_in_editor` row (default `false`) and the click sentence.

## Plan (test-first)

1. Pure logic: `getViewOpensInEditor` tests in `src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts` (true, false, "true", 1, missing, undefined entry). Implement.
2. Row builder: update `lens.logic.test.ts:388-398, 956-964` `toEqual` shapes to carry `opensInEditor: false`; add a view row with the key -> true. Add the field.
3. Component: in `src/tests/lib/features/rail-shell/TypesNavigator.test.ts` Views block, add a `.view` entry with `_open_in_editor: true`; assert click calls `openFileInEditor` (mocked editor service) and not `onPick`; a list view still calls `onPick`; real `editorStore.addTab` / `setActiveIndex` drive the highlight on/off; a list view open in a tab is not highlighted; picked row and editor row both highlighted at once.
4. Docs.

## Prior-art tests

`TypesNavigator.test.ts` Views block (`mountWithViews`, `viewEl`), `type-sidebar.logic.test.ts` `getViewLabel` / `getViewOrder`.

## Risks

- `TypeNavigatorRow` gains a required field: every literal row (tests at `lens.logic.test.ts:390,397,958`) must add it; `pnpm check` catches the rest.
- `editor.service.js` is mocked in the component test, so the click does not open a tab; the highlight is driven by the real `editorStore` directly.

## Defaults taken

- No `_open_in_editor` entry in `frontmatter-aliases.ts` (Issue: no alias).
- The context-menu "Open view" item is unchanged.

VERDICT: APPROVED

## Acceptance criteria

- [met] Only the boolean `true` turns the behaviour on; `false`, the string `"true"`, other values and a missing key leave the view as a list view (pure-logic tests) — `getViewOpensInEditor` in `src/lib/features/type-definitions/type-sidebar.logic.ts:327-329` is `entry?.frontmatter['_open_in_editor'] === true`; `src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts:731-746` covers `true`, `false`, `"true"`, `1`, `"yes"`, `null`, a missing key and a missing entry. Rust side checked: `.view` files go through `parse_frontmatter_raw_yaml` (`src-tauri/src/vault/entry.rs:237-238`), which yields `JsonValue::Bool` for YAML `true` (yaml-rust2, and the subset fallback at `src-tauri/src/vault/parsing.rs:957`), so the strict check matches real index data.
- [met] The Types navigator's view row carries whether the view opens in the editor; type rows and Untyped never do (row-builder tests) — `TypeNavigatorRow.opensInEditor` (`src/lib/features/rail-shell/rail-shell.types.ts:82-83`); `viewNavigatorRows` sets it from the entry (`src/lib/features/rail-shell/lens.logic.ts:511-522`), `typeNavigatorRows` hard-codes `false` (`lens.logic.ts:373,376`). Tests: `src/tests/lib/features/rail-shell/lens.logic.test.ts:383-386` (type definition and loose note carrying the key still give `false`), `:972-979` (boolean `true` marks, string `"true"` does not), plus the updated row-shape `toEqual`s at `:395,402,968`.
- [met] Clicking a view row with the key opens that `.view` in the editor and does not change the pick; clicking a view row without it still picks the view lens (component test, real stores and real row builder) — `TypesNavigator.svelte:216` branches on `row.opensInEditor`; `src/tests/lib/features/rail-shell/TypesNavigator.test.ts:400-412` mounts with rows from the real `viewNavigatorRows` / `typeNavigatorRows` over the real `typeDefinitionsStore`, and asserts `openFileInEditor(BOARD)` with `onPick` not called, and the reverse for `PROJECTS`. `editor.service` is mocked (side-effect service, allowed by docs/TESTING.md); see finding 1.
- [met] The row of a view with the key is highlighted while that view is the active editor tab, and not while another tab is active (component test, real `editorStore`) — `TypesNavigator.svelte:208` adds `row.opensInEditor && editorStore.activeTabPath === path`; `TypesNavigator.test.ts:414-429` drives the real `editorStore` (`addTab`, `setActiveIndex`) and checks `aria-current` and the highlight class turning on, off, and back on.
- [met] A list view open in an editor tab is not highlighted by the tab; it is highlighted only when it is the picked lens — the tab clause is gated on `row.opensInEditor`; `TypesNavigator.test.ts:431-435` opens `PROJECTS` (no key) in the active tab and asserts no `aria-current`; the picked case is asserted at `:437-442` and by the existing pick tests.
- [met] The picked lens row stays highlighted too, so two rows can show at once (the list's lens and the open editor view); this is intended — `TypesNavigator.test.ts:437-442` picks `PROJECTS`, opens `BOARD` in a tab, and asserts both rows carry `aria-current="true"`.
- [met] The help documentation's View Metadata Fields table lists `_open_in_editor` (default `false`), and the sentence on clicking a view mentions the editor case — `help/documentation/25-types-and-relationships.md:372` (table row, default `false`) and `:374` (click sentence covers the editor case and the active-tab highlight).

## Findings

1. minor — `src/tests/lib/features/rail-shell/TypesNavigator.test.ts:400-405` — the click test asserts only on the mocked `openFileInEditor` call, so it does not prove that the click lands the `.view` as the active tab. Fix (optional): `@tauri-apps/plugin-fs` `readTextFile` is already mocked in this file, so the test could keep the real `editor.service` for this case and assert `editorStore.activeTabPath === BOARD`. Not a blocker: the same call already backs the context-menu "Open view", and the highlight path is tested against the real `editorStore`.
2. nit — `src/lib/features/rail-shell/TypesNavigator.svelte:207` — the comment says "A view that opens in the editor is never the pick", but a saved pick that pointed at the view before the key was added still resolves as its lens (Issue Notes, "Saved pick"). The code handles that case correctly (the `sameLens` clause still applies). Fix: reword to "A click on a view that opens in the editor does not pick it, so its row also follows the active tab."

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts src/tests/lib/features/rail-shell/lens.logic.test.ts src/tests/lib/features/rail-shell/TypesNavigator.test.ts src/tests/lib/architecture`: exit 0, 11 files, 356 tests passed (layer rules included; no baseline or `BASELINE_SIZE` change in the diff).
- `pnpm vitest run src/tests/lib/app/AppShell.test.ts` (the consumer of `viewNavigatorRows`): exit 0, 4 tests passed.
- No other test file names `typeNavigatorRows`, `viewNavigatorRows`, `TypeNavigatorRow` or `_open_in_editor`.
- The full suite and `pnpm build` were not run; deliver runs them. No `src-tauri/` change, so no cargo test.
- Scope: the diff touches only the files listed in discovery plus their tests and the help page; no scope creep.

## Resolution

1. Fixed: `TypesNavigator.test.ts` adds "lands the clicked view as the active editor tab", which runs the real `openFileInEditor` (via `vi.importActual`, `readTextFile` mocked) and asserts `editorStore.activeTabPath === BOARD` and the row's `aria-current`.
2. Fixed: the comment in `TypesNavigator.svelte` now reads "A click on a view that opens in the editor does not pick it, so its row also follows the active tab."

# Issue 21 discovery

No `spec.md` in `.scratch/rail-shell-ux/`. Builds on Issue 20 (`work/20`): same path-change consumer, same menus, same reserved-key table; only the differences are listed.

## Files that change

- `features/type-definitions/type-sidebar.logic.ts`: `RESERVED_KEY_RULES` (:401) gains `_rail` (boolean); new `updateViewRailYaml(yaml, on)` next to `updateViewIconYaml` (:468).
- `features/rail-shell/rail-shell.types.ts`: new `RailPin` (key, label, path, kind `view | type`, opensInEditor).
- `features/rail-shell/lens.logic.ts`: `viewPinKey` / `typePinKey`; `restoreRailItem` (:166) resolves `view:<path>` and `type:<name>` with a non-empty rest; new `pinnedRailItems(entries, typeMetadataMap)` (no `excludeSystemFolder`), `staleRailPinFix(railItem, pinned)` next to `staleTypesPickFix` (:438), `followRailPinPathChange(railItem, from, to)` next to `followTypesPickPathChange` (:887); `typeNavigatorRows` (:378) fills `keyNotes` from the definition entry (`metadata.path` in `ctx.entries`).
- `features/rail-shell/types-navigator.service.ts`: the consumer merges `followRailPinPathChange` into one `updateLayout`.
- `features/rail-shell/Rail.svelte`: pinned group (`data-rail-pinned`, `min-h-0 overflow-y-auto`) after the navigator items, divider only with pins; every other `<nav>` child `shrink-0`; a pin click calls `onSelect(key)`, or `openFileInEditor(path)` for an `_open_in_editor` view; `aria-current` on `activeItem` or, for an opens-in-editor pin, `editorStore.activeTabPath`.
- `app/AppShell.svelte:157-165`: `staleRailPinFix` merged into the same `updateLayout`.
- `features/type-definitions/type-definitions.service.ts`: `setViewRailPin(path, on)` next to `updateViewIcon` (:289) through `writeViewFile`; `setTypeRailPin(definitionPath, on)` through `updateNoteFrontmatter` + `setBooleanFlag` / `removeProperty`, `FrontmatterWriteError` toasted; `renameType` (:248) also moves `layout.railItem` `type:<old>` -> `type:<new>`.
- `features/rail-shell/TypesNavigator.svelte`: "Pin to rail" / "Unpin from rail" after Change icon on the view menu and (inside `{#if row.definitionPath}`) the type menu; Issue 10's mark on a type row with `keyNotes`.
- Docs: ADR 0033 amendment, ADR 0027 amendment (`_rail`), help 25 (View Metadata Fields, Type Definitions table, context menus, The Other Rail Items).

## Tests (prior art)

- `type-sidebar.logic.test.ts`: `updateViewIconYaml` (:709), `ignoredKeyNotes` (:887).
- `lens.logic.test.ts`: `restoreRailItem` (:815), `staleTypesPickFix` (:516), `typeNavigatorRows` (:420), `followTypesPickPathChange`.
- `Rail.test.ts` (real stores; `getIconSync` and `editor.service.js` mocked), `AppShell.test.ts` (stale pin after the first snapshot: drive `vaultStore` index ready + an entries bump like `stepTypesPickCheck` wants).
- `TypesNavigator.test.ts` menu labels (:212, :554) gain the pin item; type row mark.
- `type-definitions.service.test.ts` `.view writes through the note-change owner` (:1111) for `setViewRailPin`; `lifecycle.service.favorite-path.test.ts` for `setTypeRailPin`; `renameType` (:924).
- `types-navigator.service.test.ts` for the Trash reset.

## Risks / defaults

- Prompt refresh is asked before the write (as `editView` and `toggleFavoriteForPath` do: the write's IPC emits the index event), not after; the criterion's test (`takePromptIndexRefresh()` true) holds either way.
- `setViewRailPin` skips the write when the YAML does not parse or already says so (`updateViewRailYaml` returns its input). A failed view pin write is toasted by the menu.
- Pins sort by order, then label (`naturalCompare`), then path.
- `ignoredKeyNotes` on a type definition reports the view rules too (`_group`, `_open_in_editor` with a wrong shape); a type ignores those keys anyway.
- A pin key whose rest is empty is a pin key for `staleRailPinFix` too (no pinned item has it), so it is cleaned to Today at the vault-open check.

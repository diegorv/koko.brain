VERDICT: APPROVED

## Acceptance criteria

- [met] `Rail.svelte`'s pin button calls `onSelect(pin.key, pin)` (the pin's `RailItem['pin']`), with no `openFileInEditor` call and no `editor.service` import left in `Rail.svelte` for this purpose; the `onSelect` prop type in `Rail.svelte` gains the optional second argument and its JSDoc says so — `Rail.svelte:148` is `onclick={() => onSelect(pin.key, pin)}`; the `editor.service.js` import is gone (only `editor.store` remains, for the highlight rule); `Rail.svelte:28-33` types `onSelect: (item: string, pin?: RailItem['pin']) => void` and the JSDoc names the pin argument. Plain rail buttons still call `onSelect(item.key)`.
- [met] `AppShell.svelte` (`onSelect` at about line 192) forwards both arguments: `selectRailItem({ key, pin })` — `AppShell.svelte:200` is `onSelect={(key, pin) => selectRailItem({ key, pin })}`; it is the only `<Rail` mount in `src/lib`.
- [met] `Rail.test.ts` "opens a pinned _open_in_editor view in the editor instead of selecting it" (about line 303) is rewritten on purpose, not deleted: it now asserts `onSelect` is called with the pin key and a pin whose `opensInEditor` is true and whose `path` is the `.view`. The behaviour it used to pin (opens in the editor, layout unchanged) is asserted where it now lives: an `AppShell.test.ts` case that clicks the pinned `_open_in_editor` view and checks `openFileInEditor` was called with its path and that `settingsStore.layout.railItem` and `railPanelsVisible` are unchanged (real settings store, editor service mocked as the existing AppShell tests do) — `Rail.test.ts:360-368` asserts `onSelect` called once with `view:${BOARD}` and `objectContaining({ key, path: BOARD, opensInEditor: true })` and that the Rail opens nothing itself; `AppShell.test.ts:173-187` clicks the pin in the real shell, asserts `openFileInEditor(BOARD)`, `railItem === 'inbox'`, `railPanelsVisible === false`, with the real settings store and a partial `importOriginal` mock of `editor.service` (same pattern as the existing `type-definitions.service` mock at `:22`). Probe: disabling the `opensInEditor` branch in `selectRailItem` makes this AppShell case fail (1 failed), so it does exercise the rule in `rail-navigation.ts`.
- [met] A plain pinned view and a pinned type still pick their lens and show the panels through `selectRailItem` (existing tests stay green) — `Rail.test.ts:349-357` now expects key plus pin for `view:${READING}` and `type:Project`; `rail-navigation.test.ts:34` ("picks ... a pin that does not open in the editor") passes unchanged; AppShell "shows the panels Cmd+1 hid" passes.
- [met] The active highlight rule (`Rail.svelte:126`, a pin is current when its key is `activeItem` or, for an `_open_in_editor` pin, when its path is the active tab) is not part of this change and keeps its tests — the `{@const active = ...}` line in `pinButton` is not in the diff; `Rail.test.ts:369` "highlights the active pin" and `:377` "highlights a pinned _open_in_editor view while it is the active tab" are unchanged and pass.
- [met] `rail-navigation.ts`'s JSDoc no longer implies a second copy exists — `rail-navigation.ts:7-13` now says it is "the only place that decides it: the rail hands every click here (with the pin, for a pinned item), and so do the palette's Go to commands".

## Checks run by the reviewer

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run` on `src/tests/lib/features/rail-shell/Rail.test.ts`, `src/tests/lib/app/AppShell.test.ts`, `src/tests/lib/app/rail-navigation.test.ts`, `src/tests/lib/features/rail-shell/rail-shell.boundary.test.ts`, `src/tests/lib/architecture/layer-rules.test.ts`, `src/tests/lib/app/commands.test.ts`: exit 0, 6 files, 123 tests passed. The test verdict rests on these files.
- Probe (reverted, worktree clean afterwards): `if (false && item.pin?.opensInEditor)` in `selectRailItem` makes the new AppShell case fail.
- No change to `layer-baseline.json`, `BASELINE_SIZE` or the composition roots; no new import edge (`Rail.svelte` loses one, `features/rail-shell` -> `core/editor/editor.service`).
- Full suite and `pnpm build` not run here: deliver runs them.

## Findings

1. nit, `src/tests/lib/app/AppShell.test.ts:184`: `toHaveBeenCalledWith(BOARD)` passes if any call has that argument; `toHaveBeenCalledExactlyOnceWith(BOARD)` (or `toHaveBeenCalledOnce()` plus the current line) would also catch a double open. Optional.
2. nit, `src/tests/lib/app/AppShell.test.ts:173`: on its own this case also passed with the old `Rail.svelte` (the behaviour is the same either way); the "rule lives in one place" claim rests on it together with `Rail.test.ts:360` (Rail opens nothing itself). No change needed; noted so nobody deletes the Rail assertion as redundant.

## Resolution

1. Fixed: `AppShell.test.ts` now asserts `toHaveBeenCalledExactlyOnceWith(BOARD)`, so a double open fails the case.
2. No change, as the finding says: the AppShell case and `Rail.test.ts`'s "Rail opens nothing itself" assertion together carry the one-owner claim; both stay.

# Issue 28 discovery: one owner for the pinned `_open_in_editor` rule

## Files that change

- `src/lib/features/rail-shell/Rail.svelte:12` drop the `openFileInEditor` import (its only use is the pin button).
- `src/lib/features/rail-shell/Rail.svelte:29-30` `onSelect: (item: string, pin?: RailItem['pin']) => void`, JSDoc names the second argument.
- `src/lib/features/rail-shell/Rail.svelte:145` pin button: `onclick={() => onSelect(pin.key, pin)}`. The comment at :136 (active highlight) and the rule at :137 stay as they are.
- `src/lib/app/AppShell.svelte:200` `onSelect={(key, pin) => selectRailItem({ key, pin })}`.
- `src/lib/app/rail-navigation.ts:7-12` JSDoc: say it is the one owner of the rail-click rules (no "both call it" wording that implies a copy elsewhere).

## Tests

- `src/tests/lib/features/rail-shell/Rail.test.ts:359` rewrite "opens a pinned _open_in_editor view in the editor instead of selecting it": asserts `onSelect` gets `view:${BOARD}` and a pin with `opensInEditor: true`, `path: BOARD`, and that the editor is not opened by the Rail. `:349` (plain pins) updates to the two-argument call (`expect.objectContaining({ path })`). The editor mock stays, as `:349` asserts nothing is opened.
- `src/tests/lib/app/AppShell.test.ts` "AppShell rail click": new case clicks the pinned `_open_in_editor` view, asserts `openFileInEditor(BOARD)` and that `railItem` and `railPanelsVisible` are unchanged (real settings store). AppShell.test.ts does not mock `editor.service` today, so add a partial mock (`importOriginal` + `openFileInEditor: vi.fn()`) so the rest of the shell keeps the real module. Prior art: `rail-navigation.test.ts:7` (full mock of the same module), `AppShell.test.ts:22` (partial mock pattern).
- `src/tests/lib/app/rail-navigation.test.ts` already covers both branches of `selectRailItem`; no change.

## Plan

1. Commit this file.
2. Red: rewrite the Rail test and add the AppShell case; the Rail one fails (onSelect not called).
3. Green: Rail.svelte + AppShell.svelte + rail-navigation.ts JSDoc. Run Rail.test.ts, AppShell.test.ts, rail-navigation.test.ts, rail-shell.boundary.test.ts, layer-rules.test.ts, `pnpm check`.

## Risks

- A new AppShell case with a pinned `_open_in_editor` view in the entries: the stale-pin check and the Types navigator read the same entries; the case keeps `railItem` on Types (beforeEach) and asserts it stays.
- Layer rule: no new import edge (`features/rail-shell` keeps calling a prop; `app/` already imports `rail-navigation`).

## Defaults taken

- The pin argument type is `RailItem['pin']` (i.e. `RailPin | undefined`), as the Issue names it; plain rail buttons keep calling `onSelect(item.key)`.

# Discovery: 02 One live run per action

No `spec.md` for this feature; the Issue is the spec.

## Files that change

- `src/lib/plugins/mods/mods-host.service.ts`
  - `runAction` (:303) takes no `buttonKey`; it keys the run by `actionKey(action.id)` (:145) and, when that key is busy, calls `revealRuns.get(key)` and returns without starting (no `action-start`, no toast). The check runs at every start, so an input submitted after a run started elsewhere reveals.
  - `openPicker` (:396) drops its `buttonKey` and the per-button busy check. Rows carry `busy()`; a single resolved row that is busy reveals (even with `input`), else it runs or asks input as today.
  - `addRailButton` (:498-505): the rail key `mod:<id>:<button>` stays the registry key only; `busy` is true while any listed action (all actions without `actions`) is busy.
  - menu (:172) and command (:468) callers lose the key argument.
- `src/lib/plugins/mods/mods-runs.store.svelte.ts`: field `buttonKey` -> `runKey`, JSDoc (:17-24, :39, :54-84) per action key.
- `src/lib/plugins/mods/mod-picker.store.svelte.ts`: `ModPickerAction.busy?` (optional: tests and overlays build rows without it); `runKey` / `showRun` JSDoc.
- `src/lib/plugins/mods/ModActionPicker.svelte` `pick()` (:73): an input row that is busy runs (the host reveals) instead of asking input.
- `help/documentation/28-mods.md`: one rule in the runs section; drop :234, :243, :270 sentence, rewrite :672.

## Plan

1. Failing tests in `mods-host.service.test.ts` (real host, `modsRunsStore`, `modPickerStore`): rail then palette/menu, palette/menu then rail, two buttons one action, quiet run revealed from rail, input action live (open and submit), two actions side by side from one button and two buttons, busy button multi-action picker, target ignored, restart after end. Rewrite trace test :337 to expect the reveal and one `action-start`.
2. Implement host + stores + picker component.
3. Update tests that hard-code `mod:<id>:main` as a run key (host, trace, ModActionPicker, runs store, lifecycle, diagnostics) to the action key / `runKey`.
4. Docs.

## Prior-art tests

`mods-host.service.test.ts` "lazy non-rail run view" (:519) and "long runs" (:1489); trace test :337; `ModActionPicker.test.ts` "clicking the busy rail button" (now opens the picker, choosing the live row reveals).

## Risks / defaults

- Behaviour change: a busy button that lists several actions now opens its picker instead of the run view (AC). Existing tests asserting the old behaviour are rewritten, not kept.
- Default: field name `runKey` (matches `modPickerStore.runKey`).
- Reload/unload paths are untouched: `runtime.runs` is per run, not per key.
- E2E `vault-mods.spec.ts` presses the button only while idle; no change expected.

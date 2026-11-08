# Discovery: 03 The action picker marks the actions that are running

No `spec.md` for this feature; the Issue is the spec. Follows Issue 02 (`work/02/`): rows already carry `busy()` (`mods-host.service.ts:439`, `modsRunsStore.isBusy(actionKey(id))`), which reads `$state` and so is reactive when called from the template.

## Files that change

- `src/lib/plugins/mods/ModActionPicker.svelte` :169-182: inside the row's title line, when `action.busy?.()` is true, render `<span data-mod-action-running>{STATUS_LABELS.running}</span>` after the title. Put `data-mod-action-running` on the `Command.Item` itself (the row) as `data-mod-action-running={action.busy?.() ? '' : undefined}`. `keywords` and `value` stay as they are.
- `src/tests/lib/plugins/mods/ModActionPicker.test.ts`: new `describe('the running mark')` in "a long run" style (Slow job).
- `help/documentation/28-mods.md` :239 (one-live-run paragraph): one sentence that the picker shows **Running** next to an action that is running.

## Plan

1. Failing tests (real `modPickerStore`, `modsRunsStore`, real host):
   - opening the picker while Slow job runs: the slow row has `data-mod-action-running` and text `Running` after `Slow job`; other rows have neither.
   - with the picker open on the list, start Slow job elsewhere (`modsRunsStore` via the host's `runAction` path, e.g. `modPickerStore.actions.find(...).run('')` is the picker path, so instead start it from the palette command or by calling the row's run after closing/reopening; simplest real path: start the run, close, reopen, then end it with `__modRelease` / Stop and assert the mark goes away; and start-while-open: open picker, start through the registry command path) -> mark appears; release -> done -> mark gone; Stop -> cancelled -> gone; throwing -> failed -> gone.
   - typing `running` in the Command input filters out every row (no row matches by the mark).
   - choosing the marked row reveals the run view (already covered by :299, extended to assert the mark first); choosing an unmarked row still starts it (covered by :121) or asks input (:398).
2. Implement the span and attribute.
3. Docs sentence.

## Prior-art tests

`ModActionPicker.test.ts` "a long run" (:164) and "clicking the busy rail button" (:299).

## Risks / defaults

- Default: starting an action "elsewhere" in tests uses the host's palette command registration if the test setup exposes it; otherwise a second rail button / direct `runAction` through the exported host API. Decided at implementation after reading what the host exports.
- bits-ui Command filters on `value` + `keywords` only (`command.svelte.js:132`), and `value` is the action id, so the mark's text cannot match a search.
- Default: mark styled `text-xs text-muted-foreground` like the run view's status, `ml-auto` so it sits at the row's end; visible text, not color.

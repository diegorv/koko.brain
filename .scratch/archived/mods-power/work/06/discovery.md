# Issue 06 discovery: mod callback errors in the Labs row and one toast

## Files that change
- `src/lib/plugins/mods/mods.store.svelte.ts:23,52-54`: `ModCallbackError` type, second `$state.raw` map `callbackErrors`, `callbackErrorFor` / `recordCallbackError` / `clearCallbackError`; `reset()` empties both.
- `src/lib/plugins/mods/mods-host.service.ts`
  - `:127-129` add `let toasted = false` and `callModCallback(name, call)` with an inner `report(err)` (debug always; skip when unloaded or vault changed; record; toast once).
  - `:311-323` theme.onChange body becomes `callModCallback('theme.onChange', () => callback(readModTheme()))`.
  - `:563-568` watch passes `(value) => callModCallback('watch', () => onChange(value))`.
  - `:569-594` onNoteSaved: drop local `report`, timer body calls `callModCallback('onNoteSaved', () => callback(relative))`.
  - `:624-627` `unloadMod` calls `modsStore.clearCallbackError(live.manifest.id)` after `live.unloaded = true`.
- `src/lib/plugins/mods/mod-watch.svelte.ts:7-11,34-38`: callback try/catch becomes `untrack(() => onChange(next))`; JSDoc says the caller handles callback errors.
- `src/lib/plugins/mods/ModsStatusList.svelte:66-74`: after the `entry.error` block, the `data-mod-callback-error` line with `<time datetime>` and an optional Stack trace `<details>`.
- Docs listed in the Issue (help/documentation/mods/15, 07, 13, 14, 01 and 28-mods.md).

## Plan (test-first, one commit per step)
1. Store tests (record, replace, unknown null, clear keeps others, reset) red, then store.
2. `mod-note-saved.test.ts:71` extended (record, one toast `Saver: onNoteSaved callback failed:`, debug kept, no error) red, then the helper + onNoteSaved + unload clear.
3. `mod-watch.test.ts` (throw and async reject recorded under `watch`, keeps firing, read not re-run by store write, throwing read records nothing) then watch wiring and mod-watch cleanup.
4. `mod-theme.test.ts` (sync throw and async reject recorded under `theme.onChange`, other mod runs) then theme wiring.
5. `mods-host.service.test.ts`: cleared on reload / disable / stop, toast re-armed after reload, late rejection after reload records/toasts nothing, two mods toast once each.
6. `ModsStatusList.test.ts` then the Svelte line.
7. Docs.

## Prior-art tests
- Host reload: `emit` / `writeMod` helpers in `describe('reload on file change')` (`mods-host.service.test.ts:1075-1117`).
- Toast/debug/error assertions: action failure test (`:1582-1595`).
- Status list: `row()` and the load-time test (`ModsStatusList.test.ts:107-125`).

## Risks
- The store write in `recordCallbackError` runs inside an effect (watch, theme): it must happen inside `untrack` so the effect does not subscribe to the map. The helper is called inside the existing `untrack` calls.
- The async reject path settles on a microtask, so tests flush with `await Promise.resolve()` / `vi.waitFor`.

## Defaults taken
- Time shown with `toLocaleTimeString()`, `datetime` from `new Date(at).toISOString()`.
- The line is `Last callback error (<callback>, <time>): <message>` inside a `<p data-mod-callback-error>`.
- Stack `<details>` reuses the existing classes of the load-error block.

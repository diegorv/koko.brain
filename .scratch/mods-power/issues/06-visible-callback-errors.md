# 06: Mod callback errors show in the Labs row and in one toast

**What to build:** when a mod's `ctx.onNoteSaved`, `ctx.watch` (`onChange`) or `ctx.theme.onChange` callback throws or rejects, the host records the last error and its time for that mod, shows it in the mod's Labs row, and toasts it once per loaded instance of the mod. Today these errors go only to the debug log, and async rejections from `watch` and `theme.onChange` are not caught at all. Host only: one helper in `createModContext` runs all three callbacks, and `modsStore` gains a second map. No contract change.

Labs row, under the **Loaded** state:

```
Last callback error (onNoteSaved, 14:32:07): Cannot read properties of undefined (reading 'title')
  > Stack trace
```

**Blocked by:** none

**Requires first (other repo):** nothing. The contract types all three callbacks as returning `void` (`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/packages/mod-core/src/contract/mod-api.v1.ts:309-313,351-362`); an `async` callback already satisfies that, so catching its rejection is host behavior. No `ctx` member is added. The JSDoc "goes to the debug log" (`mod-api.v1.ts:311-312,352,358`) stays true, only incomplete: do not make a contract commit or a mod-core SHA adoption for this Issue.

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

### Behavior

1. **Store.** `src/lib/plugins/mods/mods.store.svelte.ts` gets a second `$state.raw<Record<string, ModCallbackError>>`, keyed by folder, next to `entries` (`:23`). `ModCallbackError` is `{ callback: 'onNoteSaved' | 'watch' | 'theme.onChange'; message: string; stack?: string; at: number }` (`at` is `Date.now()`). New methods, each with JSDoc:
   - `callbackErrorFor(folder)`: the record, or `null`;
   - `recordCallbackError(folder, err)`: replaces that folder's record (new object, spread of the map);
   - `clearCallbackError(folder)`: drops that folder's record, keeps the others.
   - `reset()` (`:52-54`) also empties the map, so `stopModsHost` needs no extra call.

   Not a field on `ModStatusEntry`: no entry exists while the first `onload` runs (`upsertEntry` happens only after it settles, `mods-host.service.ts:733-740`), and `upsertEntry` replaces the whole object (`mods.store.svelte.ts:42-44`). A loaded mod's folder equals its manifest id (`mods.logic.ts:194`), so the host keys by `manifest.id`.
2. **Helper.** In `createModContext` (`src/lib/plugins/mods/mods-host.service.ts`), next to `invalid`/`isText` (`:127-129`), a closure-local `let toasted = false` and `callModCallback(name, call)`:
   - runs `call()` inside `try`, and routes a sync throw and a rejection of `Promise.resolve(call())` to one `report(err)`;
   - `report` always logs `debug(tag, \`${name} callback failed:\`, errorText(err))`, the same text as today;
   - then returns when `runtime.unloaded || vaultStore.path !== vaultPath` (a late rejection from an old instance must not land on the new one's row or toast);
   - else calls `modsStore.recordCallbackError(manifest.id, { callback: name, message: messageOf(err), stack: err instanceof Error ? err.stack : undefined, at: Date.now() })`;
   - and, when `toasted` is false, sets it and calls `toast.error(\`${manifest.name}: ${name} callback failed: ${messageOf(err)}\`)` (same shape as the action failure toast at `:423`).
   - Never `error()` and never Sentry (PRD P9, as `reportUnloadError` at `:609-613`).

   Each load builds a new ctx (`:722`), so "once per load" needs no clearing code: a reload, a switch off and on, or reopening the vault arms the toast again.
3. **`onNoteSaved`** (`:566-591`): drop the local `report` (`:570`) and replace the `try`/`catch` at `:578-582` with `callModCallback('onNoteSaved', () => callback(relative))`. The timer, `pending` set and liveness checks stay.
4. **`theme.onChange`** (`:311-323`): `watchModTheme(() => callModCallback('theme.onChange', () => callback(readModTheme())))`. `readModTheme()` stays inside the guarded call, as today (`:317`), so a host throw there is still contained and never escapes into the `$effect` (`mod-theme.svelte.ts:54-61`).
5. **`watch`** (`:560-565`): `watchModValue(tag, read, (value) => callModCallback('watch', () => onChange(value)))`. In `src/lib/plugins/mods/mod-watch.svelte.ts`, the callback `try`/`catch` at `:34-38` becomes dead (its only caller is `:564`): replace it with `untrack(() => onChange(next))` and update the JSDoc (`:7-11`) to say the caller handles callback errors. The `read` catches (`:18-19`, `:26-28`) are unchanged: a throwing `read` is a documented, tolerated pattern and is not recorded.
6. **Clear on unload.** `unloadMod` (`:621-643`) calls `modsStore.clearCallbackError(live.manifest.id)` right after `live.unloaded = true` (`:623`). It is the single path for reload, disable, stop and a failed `onload`, so a fixed mod starts with a clean row.
7. **Reactivity.** The `watch` and `theme` callbacks run inside the existing `untrack` (`mod-watch.svelte.ts:35`, `mod-theme.svelte.ts:60`); the helper must run inside it, so the store write in `recordCallbackError` reads the map without subscribing the effect. `modsStore` is not in `MOD_APP` (`mod-app.service.ts:28-61`), so a mod cannot `ctx.watch` its own error state and loop. Keep no history array and no count: a `theme.onChange` that fails while a color picker drags costs one debug line, one object replace and one boolean check per call.
8. **Labs row.** `src/lib/plugins/mods/ModsStatusList.svelte`, after the `{#if entry.error}` block (`:66-74`): when `entry.state === 'loaded'` and `modsStore.callbackErrorFor(entry.folder)` is set, one line `Last callback error (<callback>, <time datetime={ISO}>{local time}</time>): <message>` with class `text-meta text-destructive break-words`, and the same `<details>` **Stack trace** when `stack` is set. The `<p>` carries `data-mod-callback-error={callback}` so tests assert on attributes, not locale text. Absolute time, because a relative "2 min ago" goes stale without a ticking state. Text interpolation only, never `{@html}`.
9. **Out of scope:** action run failures (already a toast per failure and a run view), unload and cleanup failures (already toasted every time, `reportUnloadError`), `watch` `read` failures, and errors in a mod's own DOM listeners or timers (the host cannot attribute them; the cookbook rule "outside an action, catch and `ctx.notify`", `help/documentation/mods/14-cookbook.md:15`, stays). `runAction` (`:417-424`) is not touched.

### Docs

- `help/documentation/mods/15-errors-and-debugging.md`:
  - table rows `:17-19`: `watch callback`, `theme.onChange` and `onNoteSaved` failures get **Labs row** ("Last callback error") and **Toast** ("Once per load") cells. The `watch read failed` half of `:17` keeps no Labs row and no toast; split the row if that reads clearer.
  - row `:21` (unhandled rejection, "Can be" Sentry): remove it; an async `watch` or `theme.onChange` callback that rejects is now caught like a throw, and never reaches Sentry.
  - `:33`: add that a callback failure toasts once per loaded instance of the mod, and the Labs row always shows the latest one, cleared at the next load.
- `help/documentation/mods/07-events-and-reactivity.md`: `:66-69` (the rejection is now caught; it shows in Labs and in one toast), `:222`, `:379`.
- `help/documentation/mods/13-api-reference.md:105-107`: "go to the debug log" gains "the Labs row and one toast per load"; drop "a rejection is not caught".
- `help/documentation/28-mods.md`: `:54` (Labs row lists the last callback error), `:167`, `:179`, `:656`.
- `help/documentation/mods/14-cookbook.md:2135`: the reason "never reach the user on their own" is now wrong; say the host shows one toast per load, and the recipe still catches to toast every failure.
- `help/documentation/mods/01-anatomy-and-loading.md`, lifecycle table `:237-239`: a loaded mod's row can show its last callback error.
- `help/examples/mods/kokobrain-mod.d.ts` stays: its "debug log" JSDoc copies the contract word for word, and the contract wording stays true (`item-06-validation.md:29`).

### Acceptance

- [ ] Failing test first, in `src/tests/lib/plugins/mods/mod-note-saved.test.ts` (extend the case at `:71`): after a throwing callback and a rejecting one fire on one save, `modsStore.callbackErrorFor('saver')` holds `{ callback: 'onNoteSaved', message }` of the last report with a numeric `at`, `toast.error` is called exactly once with text starting `Saver: onNoteSaved callback failed:`, the existing `debug` assertions still hold and `error` is never called. It fails today, because the host only calls `debug` (`mods-host.service.ts:570`).
- [ ] `mods.store.test.ts`: record, replace, unknown folder is `null`, clearing one folder keeps the others, `reset()` empties the map.
- [ ] `mod-watch.test.ts`: a throwing and an `async` rejecting `onChange` are recorded under `'watch'`, the watch keeps firing on later changes, the watch's `read` is not re-run by the store write, a throwing `read` records nothing. The existing `debug` assertion at `:137` still holds.
- [ ] `mod-theme.test.ts` (near `:212`): a sync throw and an async rejection from `theme.onChange` are recorded under `'theme.onChange'`; another mod's callback still runs.
- [ ] `mods-host.service.test.ts`: the record is cleared on reload (a `main.js` change), on disable and on stop; after a reload the toast fires again on the next failure; a rejection that settles after the reload leaves the new instance's record empty and toasts nothing; two mods each toast once on their own.
- [ ] `ModsStatusList.test.ts`: the `data-mod-callback-error` line with message and `<time datetime>` shows on a loaded row; not on an error or disabled row; it appears when the store is written after mount; the stack trace `<details>` shows only when `stack` is set.
- [ ] Docs above updated.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Notes

- **Research:** `.scratch/mods-power/research/item-06-host.md`, `item-06-contract.md`, and `item-06-validation.md` (which wins where they differ). Code read at `c2bed3463`.
- **Decisions taken from the validation:**
  - "A toast once per session" reads as once per loaded instance of the mod (closure-local flag), so a reload while fixing the mod arms it again and no clearing code is needed. The scouts' `Set` keyed by vault and mod id, a new store file, a `count` field and an `onError` parameter on `watchModValue` are cut.
  - Async rejections from `watch` and `theme.onChange` stop being unhandled rejections and so can no longer reach Sentry. This matches PRD P9 (mod errors stay out of Sentry) and comes for free from one helper for all three callbacks.
- **Deviation from the validation:** it proposed calling `readModTheme()` outside the guard so a host failure there is not blamed on the mod. This Issue keeps it inside (Behavior 4): outside, a throw from `getComputedStyle` would escape into the theme `$effect`, which today's `try` at `mods-host.service.ts:316-320` contains. The cost is that such a host throw, if one ever happens, is shown as the mod's callback error.
- **Ordering:** land before items 2 (`onNoteSaved` with `ignoreOwnWrites`) and 5 (move and rename events): brain 02 and 05 are blocked by this Issue. Item 2 rewrites the same `onNoteSaved` block (`mods-host.service.ts:566-591`) and item 5 adds `'onNoteMoved'` to the `name` union. The contract's "debug log" JSDoc (`mod-api.v1.ts:311-312,352,358`) is not reworded. Independent of items 1, 3 and 4. Full order: `.scratch/mods-power/PRD.md`.
- **Value today:** no shipped mod in `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/mods/` calls `onNoteSaved`, `ctx.watch` or `theme.onChange`; only `examples/note-save-reaction.ts:5` and `examples/theme-aware-ui.ts:12` do (per the validation grep). The benefit arrives with items 2 and 5.
- **Security and data:** nothing is written to disk. The message and stack come from the mod's own thrown value and stay local (Labs row, debug log); a mod can already toast any text through `ctx.notify` (`mods-host.service.ts:461-468`).
- **Not verified:** whether a `$state.raw` write inside `untrack` within an effect raises a Svelte warning under vitest (expected fine; the `mod-watch.test.ts` acceptance item settles it); whether any test under `src/tests/help/` snapshots the doc text changed above (only `mods-types.test.ts` was read).

## Comments

# Item 6 validation: visible mod callback errors

Adversarial check of `item-06-host.md` and `item-06-contract.md`. `B:` = `/Users/diegorv/Dev/pet-projects/koko/brain`, `M:` = `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src` (HEAD `03526cf`). Nothing was run. Every line below was opened and read.

## Verdict

- **Cost: small.** Source: about 40 to 60 lines across 3 files (host service, mods store, Labs row). Tests: 6 existing test files extended, no new test file. Docs: 6 help files reworded. No Rust, no IPC DTO, no `package.json`, so the gate is `pnpm check` + `pnpm vitest run`.
- **Contract change: no.** Confirmed (details in section 2).
- **Design:** one host helper that runs every mod callback, a closure-local "toasted" flag per loaded instance, and a sibling map in `modsStore`. That is less than the scouts proposed: the new store file, the toast `Set` with vault keys, the `count` field, and the `onError` parameter on `watchModValue` are all cut.

## 1. Claims that held

Checked and true:

- Call sites and lines: `theme.onChange` catch `B:src/lib/plugins/mods/mods-host.service.ts:315-321`, `watch` `:560-565`, `onNoteSaved` `:566-591` (`report` at `:570`, `Promise.resolve(callback(relative)).catch(report)` at `:579`), `runAction` catch `:417-424` (toast on every failure), `reportUnloadError` `:610-613`, `recordLoadError` `:646-660`, `toastedErrors` `:111`.
- Async rejections from `watch` and `theme.onChange` callbacks are not caught. `mod-watch.svelte.ts:35` and `mods-host.service.ts:317` ignore the return value. Documented at `B:help/documentation/mods/15-errors-and-debugging.md:21` ("Unhandled rejection", Sentry "Can be").
- No entry exists while the first `onload` runs. `upsertEntry` happens only after `onload` settles (`mods-host.service.ts:733-740`), and it replaces the whole object (`mods.store.svelte.ts:42-44`). So a field on `ModStatusEntry` is the wrong place.
- A loaded mod's id is its folder name (`B:src/lib/plugins/mods/mods.logic.ts:194`).
- `unloadMod` (`mods-host.service.ts:621-643`) is the single choke point for reload (`:815`), disable (`:927`), stop (`:955`) and failed `onload` (`:723`).
- The contract conformance test compares key sets only (`B:src/tests/lib/plugins/mods/mod-api-contract.test.ts:231`). It does not see this change unless something leaks into `ctx`.
- Tests that assert the debug text exist, and none asserts that a toast is absent: `mod-note-saved.test.ts:80-82`, `mod-watch.test.ts:137`, `mod-theme.test.ts:212`. Adding a toast breaks none of them.
- The `modsStore` the error map would live in is not in `MOD_APP` (`B:src/lib/plugins/mods/mod-app.service.ts:28-61`). A mod therefore cannot `ctx.watch` the error state, which closes off the obvious feedback loop (watch fires, throws, gets recorded, watch fires again).

## 2. Contract: no change (confirmed)

- The contract types every callback as returning `void`: `theme.onChange` `M:packages/mod-core/src/contract/mod-api.v1.ts:309-313`, `watch` `:351-356`, `onNoteSaved` `:357-362`. An async function still satisfies `void`, so catching rejections is host behavior with no type change.
- The error never flows back to mod code, and no new `ctx` member is needed. `ctx.labs` (`M:packages/mod-core/src/unstable/context.ts:20-23`) only has `place`.
- `fakeCtx` leaves all three callbacks `notModelled` (`M:packages/mod-core/src/testing/fake-ctx.ts:236,237,300`), so the fake has nothing to update.
- Only JSDoc text goes stale: "goes to the debug log" at `mod-api.v1.ts:311-312,352,358`. It is still true, just incomplete. Leave it, or reword it inside the contract commit of item 2 or 5. Never make a contract commit or SHA adoption for item 6 alone.
- The contract scout missed one copy of that text: `B:help/examples/mods/kokobrain-mod.d.ts:327,368,374`. `B:src/tests/help/mods-types.test.ts:55-60` compares exported type names only, not comments, so updating it is optional too. It is still a host file, though, and the host scout wrongly listed it as "no change needed".

## 3. Claims refuted or cut

1. **New store file (`mod-callback-errors.store.svelte.ts`): cut.** A second `$state.raw<Record<string, ModCallbackError>>` inside `modsStore` (`mods.store.svelte.ts`) does the same job with no new file and no new test file. It holds `{ callback, message, stack?, at }`, keyed by folder, with `callbackErrorFor(folder)`, `recordCallbackError(folder, e)` and `clearCallbackError(folder)`. The existing `reset()` (`:52-54`) empties it too, so `stopModsHost` (`mods-host.service.ts:958`) needs no extra call. The Labs row already reads this store (`ModsStatusList.svelte:10`). The new-file option is not wrong; it is just more code.
2. **Toast `Set` keyed by `${vaultPath}\n${modId}`, with clearing rules: cut.** Use a `let toasted = false` inside `createModContext` instead. Each load creates a new ctx (`mods-host.service.ts:722`), so "once per loaded instance" comes with zero clearing code. A reload, a switch off and on, or reopening the vault arms it again (that is the scout's recommended reading of decision 1). A mod that fails on every save toasts once per load. The Labs row keeps the latest error.
3. **`count` field: cut.** The owner asked for "last callback error and time". Add a count later if the owner asks for it.
4. **`onError` 4th parameter on `watchModValue` (scout option A): cut.** Use option B instead, wrapping `onChange` in the host. The scout rejected B for two reasons, and both fail:
   - "Misses `read` failures." Leaving `read` out is right; see item 5 of this list.
   - "Changes which debug line prints." The host helper logs the same `watch callback failed:` text.

   `watchModValue` has exactly one caller (`mods-host.service.ts:564`). Once the host wraps `onChange`, the callback catch at `mod-watch.svelte.ts:34-38` can never fire. This change creates that dead code, so remove that try/catch, keep the `untrack`, and update the function's JSDoc (`:7-11`).
5. **Counting `watch` `read` failures (scout decision 4): exclude them.** Throwing in `read` is a documented, tolerated pattern. The last good value is kept (`mod-watch.svelte.ts:9-10`), and the host's own test uses `if (!path) throw new Error('no tab')` as a normal read (`mod-watch.test.ts:102-118`). Recording reads would toast for a mod that works as documented. Reads also run tracked inside the effect (`mod-watch.svelte.ts:25`), which is where a store write is riskiest.
6. **"No change needed" for `help/examples/mods/kokobrain-mod.d.ts`: wrong** (see section 2).
7. **Only the examples use these callbacks.** True for the examples, and the scouts missed what it implies. No shipped mod in `M:mods/` calls `onNoteSaved`, `ctx.watch` or `theme.onChange`. A grep over `mods examples packages/mod-core/src` finds only `examples/note-save-reaction.ts:5` and `examples/theme-aware-ui.ts:12`. So item 6 helps no shipped mod today. Its value comes with items 2 and 5, which push mods toward these callbacks. That drives the ordering in section 6.
8. **Limit to state, not to solve.** Real mods use their own DOM listeners and timers, for example `M:mods/hotkeys/src/index.ts` and `M:mods/focus-timer/src/status-chip.ts`. The host cannot attribute errors there, and item 6 does not cover them. The cookbook rule "outside an action, catch and `ctx.notify`" (`B:help/documentation/mods/14-cookbook.md:15`) stays correct for them.

## 4. Minimal design

In `createModContext` (`mods-host.service.ts`), next to `invalid`/`isText` (`:127-129`):

```ts
let toasted = false;
/** Runs a mod callback; a sync throw or a rejection goes to debug(), the Labs row and, once per load, a toast. Never Sentry (PRD P9). */
const callModCallback = (name: 'onNoteSaved' | 'watch' | 'theme.onChange', call: () => unknown) => {
	const report = (err: unknown) => {
		debug(tag, `${name} callback failed:`, errorText(err));
		if (runtime.unloaded || vaultStore.path !== vaultPath) return;
		modsStore.recordCallbackError(manifest.id, { callback: name, message: messageOf(err), stack: err instanceof Error ? err.stack : undefined, at: Date.now() });
		if (toasted) return;
		toasted = true;
		toast.error(`${manifest.name}: ${name} callback failed: ${messageOf(err)}`);
	};
	try {
		void Promise.resolve(call()).catch(report);
	} catch (err) {
		report(err);
	}
};
```

- `onNoteSaved`: replace `:570` and `:578-582` with `callModCallback('onNoteSaved', () => callback(relative))`.
- `theme.onChange`: `watchModTheme(() => { const next = readModTheme(); callModCallback('theme.onChange', () => callback(next)); })`. Reading the theme outside the guard means a host failure in `getComputedStyle` is no longer blamed on the mod. Today it is, because `readModTheme()` runs inside the try at `:317`.
- `watch`: `watchModValue(tag, read, (value) => callModCallback('watch', () => onChange(value)))`, and drop the dead catch in `mod-watch.svelte.ts:34-38`.
- `unloadMod` (`:621-643`): `modsStore.clearCallbackError(live.manifest.id)` right after `live.unloaded = true`.
- `ModsStatusList.svelte`: under the `{#if entry.error}` block (`:66-74`), show a `{#if entry.state === 'loaded' && modsStore.callbackErrorFor(entry.folder)}` line, `Last callback error (<name>, <time datetime=ISO>local time</time>): <message>`, with the same `<details>` stack trace. Use absolute time, because a relative "2 min ago" goes stale without a ticking state. Use a `data-mod-callback-error=<name>` attribute so tests assert on attributes rather than locale text. Render as text only, never `{@html}`.
- Out of scope: action-run failures (already a toast and a run view, and `15-errors-and-debugging.md:38` documents "never deduped"), unload and cleanup failures (already toast every time), `read` failures, raw `ctx.app`/DOM/timer errors.

## 5. Risks the design must handle

- **Stale instance (race).** An async callback can reject after its mod reloaded. The `runtime.unloaded` check in `report` drops it from the store and the toast, while the debug line still prints. Without the check, the old code's error would show on the new code's row. Needs a test: reject after a `main.js` change and reload, and expect the new row clean and no toast.
- **Reactive loop.** The `watch` and `theme` callbacks run inside `$effect` (`mod-watch.svelte.ts:22-39`, `mod-theme.svelte.ts:54-61`). The guard runs inside the existing `untrack` (`mod-watch.svelte.ts:35`, `mod-theme.svelte.ts:60`), so the spread in `recordCallbackError` reads the map without subscribing to it. Async reports run in a microtask, outside any effect. Do not move the guard outside those `untrack` calls. Needs a test: a throwing `watch` callback does not re-run the watch's `read`. The store is not in `MOD_APP`, so mods cannot close a loop through it.
- **Flood.** `theme.onChange` fires many times per second while a color picker is dragged (`07-events-and-reactivity.md:372-375`). `onNoteSaved` has no debounce. Each failure costs one debug line (as today), one object replace, and one boolean check. Keep no history array.
- **Vault switch.** `report` checks `vaultStore.path !== vaultPath`, and `stopModsHost` -> `modsStore.reset()` empties the map. A new instance in the next vault has its own `toasted`.
- **Behavior change to state in the docs.** Async rejections from `watch` and `theme.onChange` stop being unhandled rejections and can no longer reach Sentry. That matches PRD P9, and it is the cheapest form: one helper for all three callbacks, no special case.
- **Data loss and security.** None new. Nothing is written to disk. The message and stack come from the mod's own thrown value, and the mod can already toast any text through `ctx.notify` (`mods-host.service.ts:461-468`). Both stay local: Labs row, debug log, never Sentry.

## 6. Ordering against the other items

- **Before items 2 and 5.** Item 2 rewrites the same `onNoteSaved` block (`mods-host.service.ts:566-591`). Item 5 adds new callback events (created, moved, renamed). If `callModCallback` lands first, both items call it and inherit Labs, toast and rejection handling for free. Otherwise each grows its own `report`, and item 6 has to retrofit them. That is still small, but it touches more code twice. Extend the `name` union when they land.
- **Independent of 1, 3 and 4.** Item 1's `updateFrontmatter` rejects into the mod's own code. Item 3 touches `runAction`, which item 6 leaves alone. Item 4 is read-only queries with no callbacks.
- **Item 7.** If declarative settings ever add a change callback, run it through the same helper.
- **Contract JSDoc.** Reword the "debug log" sentences in the contract commit of item 2 or 5, not alone.

## 7. Files and tests

Source:

- `B:src/lib/plugins/mods/mods-host.service.ts`: helper, 3 call sites, the clear in `unloadMod`.
- `B:src/lib/plugins/mods/mods.store.svelte.ts`: map, 3 methods, `reset()`.
- `B:src/lib/plugins/mods/mod-watch.svelte.ts`: drop the dead catch, update JSDoc.
- `B:src/lib/plugins/mods/ModsStatusList.svelte`: the error line.

Tests (written first, real stores, mocks only the toast, the Tauri fs and `debug`):

- `mods.store.test.ts`: record, replace, unknown is null, clear one keeps others, reset empties.
- `mod-note-saved.test.ts:71`: extend the case. A throw, then a rejection: the store holds the last one, `toast.error` is called once, `error` is never called.
- `mod-watch.test.ts`: a throwing and an async `onChange` are recorded, the watch survives, `read` is not re-run, a `read` failure records nothing.
- `mod-theme.test.ts:212`: sync and async recorded, the other mod's callback still runs.
- `mods-host.service.test.ts`: cleared on reload, disable and stop; the toast re-arms after a reload; a late rejection from the old instance is ignored; a second mod toasts on its own.
- `ModsStatusList.test.ts`: the line shows on a loaded row, not on error or disabled rows, and updates after mount.

Docs:

- `B:help/documentation/mods/15-errors-and-debugging.md:17-21,38`
- `mods/07-events-and-reactivity.md:67-68,222,379`
- `mods/13-api-reference.md:105-107`
- `28-mods.md:54,167,179,462,656`
- `mods/14-cookbook.md:2135` (the "never reach the user on their own" reason)
- `mods/01-anatomy-and-loading.md:441` area (Labs row)
- `help/examples/mods/kokobrain-mod.d.ts:327,368,374` (optional)

## 8. Not verified

- Whether a `$state.raw` write inside `untrack` within an effect causes any Svelte warning under vitest. It is expected to be fine; the watch test above settles it.
- Whether any doc test snapshots the doc text that changes. Only `src/tests/help/` was listed; its files were not opened beyond `mods-types.test.ts`.

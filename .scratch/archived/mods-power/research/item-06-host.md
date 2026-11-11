# Item 6, host side: visible mod callback errors

Scout report. Paths are relative to /Users/diegorv/Dev/pet-projects/koko/brain unless noted. Nothing was run; every claim below was read in code or docs.

## 1. Verdict

Host only, no contract change, small to medium. The mod contract already promises that a thrown callback is contained (`help/documentation/mods/07-events-and-reactivity.md:222`), and the containment points already exist in the host. The work is: a per-mod "last callback error" record, one `report` helper used by the three callback sites, a line in the Labs row, a once-per-session toast, and doc/test updates. No Rust, no IPC DTO, no generated bindings, no `package.json`, so no `pnpm build`. `ModContextV1` and `CONTEXT_PUBLIC` do not change (`src/tests/lib/plugins/mods/mod-api-contract.test.ts:46,231`), so the contract conformance test is only a guard that nothing leaked into `ctx`.

Gate per CLAUDE.md rule 6: frontend only, `pnpm check` + `pnpm vitest run`.

## 2. What exists today (the callback sites)

All in `src/lib/plugins/mods/mods-host.service.ts` unless noted. "Visible" means toast or Labs row.

| Site | Lines | Today |
|------|-------|-------|
| `ctx.onNoteSaved` callback: sync throw and rejection | 566-591 (`report` at 570, sync catch 580, async `.catch(report)` 579) | `debug(tag, 'onNoteSaved callback failed:', errorText(err))` only. Not visible. |
| `ctx.theme.onChange` callback: sync throw | 311-323 (catch 318-320) | `debug` only. A rejected promise from an async callback is NOT caught (docs `07-events-and-reactivity.md:379`; `13-api-reference.md` row for theme.onChange). |
| `ctx.watch` `onChange`/`read` | 560-565 delegates to `watchModValue` in `src/lib/plugins/mods/mod-watch.svelte.ts` (read catches at 18 and 26, callback catch at 36-37) | `debug` only. Async rejection not caught (`07-events-and-reactivity.md:67`, `15-errors-and-debugging.md:17`). |
| Action `run` (any origin: rail, palette, menu, rule) | `runAction` catch 417-424 | Run view Failed + `toast.error` every time (never deduped), `debug`. Already visible. A rule run has no run view (lazy, quiet), only the toast. |
| `onunload`, cleanups | `reportUnloadError` 610-613, calls 631/633/640 | Toast every time, `debug`. Not in the Labs row. |
| Load errors | `recordLoadError` 646-660 | Labs row `state: 'error'` + toast deduped by `toastedErrors` (111, 656-659). |

Existing pieces to reuse:

- `errorText(err)` (`src/lib/plugins/mods/mods.logic.ts:123`) and `messageOf` (host:113) for message and stack.
- `toast.error` from `svelte-sonner`, already imported in the host (line 2).
- The dedupe idiom `toastedErrors` (host:111, 656-659, cleared at 732 and 818). A second Set for callback toasts follows the same shape.
- `modsStore` (`src/lib/plugins/mods/mods.store.svelte.ts`) and `ModsStatusList.svelte` (Labs row, error rendering at the `{#if entry.error}` block with a `<details>` Stack trace, `data-mod-folder`/`data-mod-state` attributes). `LabsSection.svelte` only mounts `ModsStatusList`; no change needed there.
- `modsRunsStore` (`mods-runs.store.svelte.ts`) is the pattern for a small `$state.raw` store with getters and `reset()`.

## 3. Design recommendation

### 3.1 Where the record lives: a new store, not a field on `ModStatusEntry`

Do not add `lastCallbackError` to `ModStatusEntry` (mods.store.svelte.ts:2-20). Reasons, all traced:

- `loadMod` calls `modsStore.upsertEntry` only after `onload` settles (host:733-740). A callback can fire while an async `onload` is still running (a subscription made early in `onload`), when no entry exists yet. The error would have nowhere to go.
- `upsertEntry` replaces the whole entry (store:42-44), and the `loaded` upsert is a fresh object. A field would be wiped or would have to be copied forward by every writer (host:733, 762, 930, `recordLoadError` 648). Easy to regress.

Recommended: new `src/lib/plugins/mods/mod-callback-errors.store.svelte.ts` (kebab-case `.store.svelte.ts` per CLAUDE.md naming), `$state.raw<Record<string, ModCallbackError>>`:

```
interface ModCallbackError { callback: 'onNoteSaved' | 'watch' | 'theme.onChange'; message: string; stack?: string; at: number; count: number }
```

Getters `errorFor(modId)`, mutator `record(modId, ...)` (increments `count` and replaces message/stack/at), `clear(modId)`, `reset()`. JSDoc on every export. A mod id equals its folder name (`mods.logic.ts:194`, "id does not match the folder name"), so the Labs row can key by `entry.id`/`entry.folder`.

`count` is optional but cheap and it tells the owner "3 failures", not just "1"; keep it only if the owner wants it (CLAUDE.md simplicity). `at` is required by the item ("last callback error and time").

### 3.2 One helper in `createModContext`

Add next to `invalid`/`isText` (host:127-129):

```
const reportCallbackError = (callback, err) => { debug(tag, `${callback} callback failed:`, errorText(err)); if (runtime.unloaded || vaultStore.path !== vaultPath) return; store.record(...); toastOncePerSession(...) }
```

Rules traced to code:

- Keep the existing debug line text byte for byte (`onNoteSaved callback failed:`, `theme.onChange callback failed:`, `watch callback failed:`). Docs (`15-errors-and-debugging.md:17-19`) and existing tests assert on them (`mod-note-saved.test.ts` lines on `'onNoteSaved callback failed:'`).
- Never `error()` (it reports to Sentry): PRD P9, ADR 0036 line 41; existing tests assert `expect(error).not.toHaveBeenCalled()`.
- Skip the store and the toast when the instance is unloaded or the vault changed: a late async rejection from an old instance must not stamp the new instance's row (see risks, section 5).
- Call sites: `onNoteSaved` `report` (570) becomes the helper; `theme.onChange` catch (318-320); `watch` needs a hook, see 3.3.

### 3.3 `ctx.watch`: hook through `watchModValue`

`watchModValue(tag, read, onChange)` owns its catches (`mod-watch.svelte.ts:18,26,36`) and logs with `debug`. Two options:

- A. Add an optional 4th parameter `onError?: (phase: 'read' | 'callback', err: unknown) => void`, called from the three catches; the host passes the helper. Smallest diff to `mod-watch.svelte.ts` (one call per catch), `debug` lines unchanged.
- B. Wrap `onChange` in the host with try/catch. Misses `read` failures, and the inner catch would change which `debug` line prints. Not recommended.

Recommend A, and report only the callback phase (`watch callback failed`). A throwing `read` re-runs on every reactive change (watch effect at `mod-watch.svelte.ts:22-30`), so it can fire many times per second and is the likeliest source of flood; decide whether `read` failures count (see open decisions). Counting them into the same record is still safe because the store only keeps the last error and the toast is once per session.

### 3.4 Async rejections of `watch` and `theme.onChange` callbacks

Today they are uncaught: "Unhandled rejection ... Sentry: Can be" (`15-errors-and-debugging.md:21`). Item 6 says "callback errors" so the helper should also catch them: `const out = callback(x); if (out instanceof Promise) out.catch(report)`, exactly the shape `reportUnloadError` already uses for `onunload` (host:631). `onNoteSaved` already does this (`Promise.resolve(callback(relative)).catch(report)`, 579). This is a behavior change in the docs table (async rejections stop reaching Sentry/devtools as unhandled and instead appear in Labs). It is consistent with P9. Make it a conscious decision (open decision 3).

### 3.5 Toast once per session

Reuse the idiom, with a separate `Set<string>` module-level in the host, key `${vaultPath}\n${modId}` (mirror `toastedErrors` keys). Message: `${manifest.name}: ${callback} callback failed: ${messageOf(err)}`. Do NOT reuse `toastedErrors` (host:111): it stores the last load message per folder and `loadMod` deletes the key on success (732), which would re-arm or collide with load-error dedupe.

"Once per session" is ambiguous for reloads (open decision 1). Options:
- Per app session per mod (never cleared except by process restart): quietest; a reload that fixes then re-breaks the mod does not toast again, the Labs row still updates.
- Cleared when the mod's code reloads (clear in the same places the record is cleared, section 3.6): a new code version that fails toasts again. Recommended: new code deserves a new toast, and a reload is rare compared with saves.

### 3.6 When to clear the record

Clear in `unloadMod` (host:621-643), which is the single choke point for stop (955), disable (927), reload (815) and failed onload (723); also covered by `modsStore.reset()` at stop (958) only for entries, so call the new store's `reset()` there too (cheap), and `removeEntry` path at 817 is already behind `unloadMod`. Result: a reload, a switch off/on, a host stop, or a deleted mod starts clean. A mod in `state: 'error'` or `'disabled'` row renders no callback line.

### 3.7 Labs row UI (`ModsStatusList.svelte`)

- Under the existing `{#if entry.error}` block, add a sibling `{#if callbackError}` using `modCallbackErrorsStore.errorFor(entry.id)`; show only when `entry.state === 'loaded'`.
- Text: `Last callback error (onNoteSaved, 2 min ago, 3 times): <message>` in `text-meta text-destructive break-words`, plus the same `<details>` Stack trace pattern. Add `data-mod-callback-error="<callback>"` for tests, like `data-mod-load-ms`.
- Time: no relative-time helper fits (`src/lib/utils/date.ts` has formatters only; `formatSnapshotTime` in `src/lib/features/file-history/file-history.logic.ts:9` is a feature file, and `plugins/` importing `features/` is a layer violation pattern to avoid). Prefer an absolute local time, `new Date(at).toLocaleTimeString()`, which needs no timer and no new reactive tick. A relative "2 min ago" would go stale on screen without a ticking `$state`; avoid it. If relative is wanted, put a pure `formatAgo(now, at)` in `mods.logic.ts` and pass `now` from a derived on render; accept it is only fresh when Labs re-renders.
- No dismiss button in v1 (clear on reload is enough). Mention as optional.

## 4. Files an implementation touches

| # | File | Change |
|---|------|--------|
| 1 | `src/lib/plugins/mods/mod-callback-errors.store.svelte.ts` (new) | Store from 3.1. |
| 2 | `src/lib/plugins/mods/mods-host.service.ts` | Helper + toast Set; `onNoteSaved` (566-591), `theme.onChange` (311-323), `watch` (560-565); `unloadMod` (621-643) and `stopModsHost` (946-959) clear. Update the comment on `runAction` only if action failures are also recorded (open decision 2). |
| 3 | `src/lib/plugins/mods/mod-watch.svelte.ts` | Optional `onError` parameter, called from the catches at 18, 26, 36. |
| 4 | `src/lib/plugins/mods/ModsStatusList.svelte` | Callback error block in the row. |
| 5 | Docs | `help/documentation/mods/15-errors-and-debugging.md` table rows 17-19 (`watch`, `theme.onChange`, `onNoteSaved`: add Labs row = last error, Toast = once per session; the async-rejection row 21 shrinks), "Load errors are toasted once" section gets a sibling note; `help/documentation/mods/07-events-and-reactivity.md:67-68` (watch Errors: "None of these go to a toast"), `:222` (onNoteSaved "No toast"), `:379` (theme.onChange); `help/documentation/mods/13-api-reference.md:105-106` (watch and onNoteSaved error text); `help/documentation/28-mods.md:179` ("goes to the mod's debug log"), `:462` (theme.onChange row), the "Where the error happens" table at ~655-660 (add a row), `:54` (Labs row description); `help/documentation/mods/14-cookbook.md:15` and `:2135` ("Errors in a save callback never reach the user on their own") need rewording because a save-callback error now does reach Labs and one toast. Language: English, no emojis, no em-dashes. |

No change needed: `contract/mod-api.v1.ts` (type re-export only), `mod-app.service.ts`, `mod-vault.service.ts`, `mods.logic.ts` (unless a pure formatter is added), `LabsSection.svelte`, Auto Organize / `rule-actions` (rule runs already go through `runAction`), `docs/MOD-CORE.md` (no mod-core SHA bump), `help/examples/mods/kokobrain-mod.d.ts` and `src/tests/help/mods-types.test.ts` (contract unchanged).

Mods workspace side is outside this scout, but note: nothing in `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/packages/mod-core/src/contract/mod-api.v1.ts` needs to change, since callback error handling is host behavior.

## 5. Hidden costs and risks

- **Layer rules** (`src/tests/lib/architecture/layer-rules.test.ts`, ADR-0003): the new store and UI live in `plugins/mods/` and import only the same folder and `utils/`. No new `features/` or `core/` import beyond what the host has. Keep any formatter pure (`pure-logic.test.ts`) if added to `mods.logic.ts`.
- **Editor-save path and indexing rules** (`docs/agents/indexing-watcher-rules.md`): untouched. The change adds no save, no path change, no index write. The `onNoteSaved` timer path (host:571-585) only gets a different catch body. `notifyAfterSave` (`src/lib/core/editor/editor.hooks.ts`) runs observers synchronously with its own try/catch; the mod observer returns before mod code runs (setTimeout 0), so it never throws there.
- **Flood and performance.** An `onNoteSaved` callback runs once per save with no debounce (`07-events-and-reactivity.md` "No debounce"), a `watch` callback once per change, `theme.onChange` many times per second while dragging a color picker (`07...:372-376`). A permanently broken callback therefore calls the helper at that rate. The helper must be O(1): one object replace in a `$state.raw` store (re-renders only the open Labs list) and a Set lookup for the toast. Do not append to an array or keep a history. `debug()` was already per failure.
- **Reactive loop hazard.** `watchModValue` runs `onChange` inside `untrack` (`mod-watch.svelte.ts:35`) but the `read` runs tracked. If the error store were read inside a mod's `read`... mods cannot reach it. But the host's `onError` runs inside the `$effect` for `read` failures (line 26); writing `$state.raw` inside an effect is allowed but wrap the call in `untrack` (as the existing `debug` calls are) so a store write never becomes a dependency of the watch effect. Test: a throwing `read` must not re-run the effect because of the record.
- **Stale instance attribution.** An async callback started before unload can reject after a reload. Guarded by `runtime.unloaded` (3.2). Without the guard the new instance's row shows the old instance's error. Test it.
- **Toast spam from rule actions (pre-existing).** A rule action that fails toasts on every matching save (host:423, never deduped, documented at `15...:36`). If the owner counts rule-run failures as "callback errors", the right fix is the same once-per-session toast for `origin === 'rule'` only; changing action toasts for rail/palette runs would break the existing test `mods-host.service.test.ts:1547` ("an action that throws ... shows an error toast") and the doc statement "action-failure toasts are never deduped". Keep out of scope unless the owner asks.
- **Security under ADR 0036** (`docs/adr/0036-vault-mods-trust-loader-storage.md:41`): mods already run with full trust; the message and stack come from the mod's own thrown value and are rendered as text (Svelte escapes; do not use `{@html}`). No new trust boundary. Stack/message can contain note paths or text; they stay local in the Labs row and the local debug log, same as load errors today. Telemetry: never Sentry, so no privacy issue (memory: telemetry note names OK, and these do not reach Sentry anyway).
- **Re-render churn.** `record` replaces the Record each time (new object); only components reading `errorFor` re-render, i.e. an open Labs list. Closed Settings = no subscribers.
- **Vault change.** `stopModsHost` runs on vault switch via the lifecycle; call the store `reset()` there (3.6) so another vault's Labs does not show a stale line. Key the toast Set by vault path (3.5), so the same mod id in vault B toasts again.
- **Contract conformance.** Not affected, but `Object.keys(makeContext())` equality (`mod-api-contract.test.ts:231`) means any helper accidentally added to `ctx` fails the test. Keep the helper a local closure, not a ctx member.

## 6. Open decisions for the planner or owner

1. Toast once per session: per mod for the whole app session, or re-armed when the mod reloads (recommended, 3.5).
2. Scope of "callback": only `onNoteSaved`, `watch`, `theme.onChange` (recommended), or also failed action runs (rule runs especially) and unload/cleanup failures in the Labs row. Actions already have a run view and a toast; `onunload`/cleanup already toast every time. Adding them to the Labs row is one `record` call each (host:423, 612) but widens docs and tests.
3. Catch async rejections of `watch` and `theme.onChange` callbacks (recommended, 3.4), which changes documented behavior from "unhandled rejection" to "contained and shown".
4. Count `watch` `read` failures (3.3): include them, or callback phase only.
5. Show a call count and an absolute or relative time (3.7); recommended absolute time and a count.

## 7. Test plan (docs/TESTING.md: real stores and `.logic.ts`, mock only Tauri APIs, side-effect services; each suite covers happy path, empty input, error; every computed getter tested)

Write failing tests first, then code. Existing mocks to copy: `svelte-sonner`, `@tauri-apps/plugin-fs`, `#lib/utils/debug.js` (`debug` and `error` mocked so Sentry absence is assertable), as in `src/tests/lib/plugins/mods/mod-note-saved.test.ts` (fake timers, real editor store/hooks, `saveFileByPath`, `ctx.vault.write`) and `mod-watch.test.ts`.

1. `src/tests/lib/plugins/mods/mod-callback-errors.store.test.ts` (new, pattern of `mods.store.test.ts`): empty by default; `record` stores callback, message, stack, `at`; second record replaces and increments `count`; `errorFor` unknown id is null; `clear` one id keeps others; `reset` empties.
2. `src/tests/lib/plugins/mods/mod-note-saved.test.ts`: extend the "contains throws and async rejections" case (it currently asserts only `debug` and `error`): after a throwing and a rejecting callback, the store has the last error with `callback: 'onNoteSaved'`, `toast.error` called exactly once for N failures, message prefixed with the mod name; a second mod's failure toasts separately; `error` still not called. Add: a callback error after `disableMod` (unloaded) records nothing and does not toast.
3. `src/tests/lib/plugins/mods/mod-watch.test.ts`: a throwing `onChange` records `callback: 'watch'` and the watch stays active (existing test at 120 covers survival); an async `onChange` rejection is now recorded (decision 3); `read` failure behavior per decision 4; `onError` optional (calling `watchModValue` without it still logs).
4. `src/tests/lib/plugins/mods/mod-theme.test.ts` (callbacks at lines 146-200): a throwing `theme.onChange` records `theme.onChange`, the other mod's callback still runs, one toast; async rejection recorded.
5. `src/tests/lib/plugins/mods/mods-host.service.test.ts`: record cleared on reload (change `main.js`, `fileListeners`), on `disableMod`, on `stopModsHost`; toast re-armed after reload or not, per decision 1; a late rejection from the old instance after reload does not touch the new instance's record; errors never reach `error()` (the file already mocks it at the top).
6. `src/tests/lib/plugins/mods/ModsStatusList.test.ts` (jsdom, real stores, mocks only `svelte-sonner` and the host service): a loaded row with a recorded error shows the callback name, message, count and time, and a Stack trace `<details>`; no line without a record; no line on `error` or `disabled` rows; updates when `record` is called after mount (pattern at "updates when the store changes"). Time: set `at` to a fixed epoch and assert the formatted string with a fixed timezone-safe check (or use the pure formatter in `mods.logic.test.ts`).
7. `src/tests/lib/plugins/mods/mod-api-contract.test.ts`: no change; run as the guard that nothing leaked into `ctx`.
8. `src/tests/lib/app/LabsSection.test.ts`: no change expected (it mocks the host service and mounts `ModsStatusList`); run it.
9. Architecture suite (`layer-rules`, `pure-logic`) runs inside `pnpm vitest run`.
10. E2E: none required (Settings component covered by jsdom tests). `scripts/e2e.sh` only if the owner wants a Labs flow.

Commit as one `feat:` (behavior change, tests included) per CLAUDE.md rule 11; full detailed message per docs/COMMITS.md. If split: store + tests, host wiring + tests, Labs row + tests, docs.

## 8. Not verified

- Whether `$state.raw` writes inside the watch effect's catch (`mod-watch.svelte.ts:26`) trigger Svelte's `state_unsafe_mutation` or an effect re-run without `untrack`; assumed safe with `untrack`, confirm when running tests.
- The exact text of `help/documentation/mods/14-cookbook.md:15` and `:2135` beyond the quoted lines, and whether other cookbook recipes say "save callback errors are only logged" (grep only matched those two).
- `help/documentation/28-mods.md` Labs description at line 54 and the "Where the error happens" table at ~655 were read; the exact edit wording is not drafted.
- The layout of `ModsStatusList.svelte` was read as source only; no UI was run.
- Whether `toLocaleTimeString` output is stable enough under the project's jsdom/vitest locale for an equality assertion (use a regex or the pure formatter instead).

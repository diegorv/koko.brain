# 02: Discover and load mods from `_system/mods/`

**What to build:** with the Labs toggle on (Issue 01), the app loads every mod in `<vault>/_system/mods/` when the vault opens, calls its `onload(ctx)`, and lists each mod with its state in Settings > Labs. No rail button yet (Issue 03).

**Format (PRD):**

```
_system/mods/<mod-id>/manifest.json
_system/mods/<mod-id>/main.js
```

- **Manifest.** Required: `id` (`^[a-z0-9]+(-[a-z0-9]+)*$`, at most 64 chars, equal to the folder name), `name` (non-empty), `version` (non-empty string). Optional: `description`, `author`, `minAppVersion` (shape-checked, not enforced). Unknown keys are ignored. No permissions and no entry points in the manifest. Each error names the folder and the field, for example `_system/mods/foo: manifest.json id "bar" does not match the folder name`.
- **Loader (PRD P3, confirmed).** The host reads `main.js` with plugin-fs `readTextFile` inside try/catch and hands the text to a pure `evaluateModSource(source, id)` in `mods.logic.ts` (Issue 07's example test reuses it):
  - Require exactly one match of `/^export\s+default\s+/m` and replace it with an assignment to a holder object. Zero or several matches is a load error.
  - Evaluate `"use strict";` plus the code plus `//# sourceURL=kokobrain-mods/<id>/main.js` with `new Function`. Any other `import` or `export` surfaces as the engine's `SyntaxError`; when its message mentions `import` or `export`, reword it as `main.js: use exactly one "export default" and no "import"; a mod is one file`. Other syntax errors keep the engine's message.
  - The default export must be an object with an `onload` function; `onunload` is optional. A class author writes `export default new MyMod()`. `export default function foo() {}` and `export default class Foo {}` become expressions after the rewrite, so code that refers to `foo` or `Foo` by name fails; Issue 07 documents it.
  - Do not reuse QueryJS's `includes('await')` wrapping (`plugins/queryjs/kb-api.ts:409-411`): it changes semantics when a comment contains "await".
- **`ctx` v1, this slice:** `apiVersion` (`1`), `mod` (`{ id, name, version, dir }`, `dir` vault-relative), `signal` (aborted at unload), `register(fn)` (extra cleanup, run at unload), `notify(message, { kind? })` (svelte-sonner toast prefixed with the mod name; `kind` is `'info' | 'success' | 'warning' | 'error'`, default `'info'`), `log(...args)` (`debug('MOD:<id>', ...)`). Write the hand-written contract `src/lib/plugins/mods/contract/mod-api.v1.ts`, following the rules at the top of `src/lib/plugins/queryjs/contract/kb-api.v1.ts:1-27`, with a freeze test like `kb-api-contract.test.ts`.
- **Lifecycle.** A host in `src/lib/plugins/mods/mods-host.service.ts`. Start it after the vault is open, inside the deferred post-open block of `initializeVault` (`src/lib/app/lifecycle/app-lifecycle.service.ts:520`), so mods never delay the open. Keep its async stop in a dedicated slot released both at `initializeVault` entry (next to `:160-161`) and in `teardownVault` (next to `:571-572`). Stop is a no-op when nothing is loaded: teardown also runs at boot with no vault. **Stop during a start:** the host keeps a start generation. Stop bumps it and unloads everything, in-flight loads included; a load that finishes after its generation changed unloads itself at once, so nothing leaks into the next vault. Discovery: a missing `_system/mods/` means zero mods. Each mod loads on its own (`Promise.allSettled`), so one broken mod never blocks another.
- **Unload one mod:** abort `ctx.signal`, call `onunload()` in try/catch, then run every disposer `ctx` collected, in reverse, even if `onunload` threw. If `onload` throws, run the disposers it already collected and record the error.
- **Vault-switch guard.** `ctx` captures the vault path at load. A host call after unload or after the open vault changed throws `Mod "<id>" is unloaded`. QueryJS captures the path and never checks it (`kb-api.ts:103`); do not copy that.
- **Status.** `src/lib/plugins/mods/mods.store.svelte.ts`: a `$state.raw` list of `{ id, folder, name, version, state: 'loaded' | 'error', error? }`. A `ModsStatusList.svelte` block shown in Labs under the toggle; an error row shows the message with the stack in a `<details>` (precedent: `plugins/queryjs/queryjs-block-widget.ts:288-328`). A load error raises a toast naming the folder, **only when that mod's error message changes** (a mod edited in Kokobrain reloads on every 2 s autosave once Issue 04 lands, `src/lib/core/editor/editor.service.ts:227`, and half-typed code must not spam toasts).
- **Toggle.** Starting or stopping the host when the toggle flips is allowed and probably cheap, because `LabsSection` is in `app/`. If it is not, Labs shows "Reopen the app to apply" next to the toggle (owner decision). Say which in the commit.
- **Errors (PRD P9).** Mod errors the host catches go to the toast and `debug()`, never `error()` (which reports to Sentry, `utils/debug.ts`). Host failures (cannot read the folder) use `error()`. Uncaught mod errors are Issue 12.
- **Placement:** `src/lib/plugins/mods/` (ADR-0003: optional, the app works without it). It must not import `plugins/queryjs`. Wiring only in `app/`.
- **TESTING.md:** add a row for `plugins/mods/` to the "run only this" table (`docs/TESTING.md:150-159`) pointing at `e2e/specs/vault-mods.spec.ts`.

**Blocked by:** 01

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`.

- [x] Failing tests first:
  - `mods.logic.test.ts` (node): valid manifest; each invalid field; id and folder mismatch; unknown keys ignored; `evaluateModSource` with zero, one and two `export default`, a stray `import` line (reworded error), another syntax error (engine message kept), a class instance default, a default without `onload`.
  - `mods.store.test.ts`: every getter; set and replace entries; an error entry keeps its message.
  - `mods-host.service.test.ts` (jsdom): mock only `@tauri-apps/plugin-fs` and `svelte-sonner`; real stores. Toggle off: nothing is read. On: two mods load and the store lists both. One mod's `onload` throws: it is `error`, its `register` cleanup ran, the other is `loaded`. No mods folder: empty list, no error. Stop: `onunload` and disposers ran in reverse, `ctx.signal.aborted` is true, a later `ctx.notify` throws. Stop while a start is still loading leaves the status list empty and the late load's `onunload` ran. The same load error twice raises one toast; a different message raises another.
  - `ModsStatusList` component test: a loaded row and an error row with the message and the stack in `<details>`.
  - `app-lifecycle.service.test.ts`: with mods on, the host starts after open; `teardownVault` and a re-init stop it (ADR-0003 requires a lifecycle test per registration). That file mocks `fs.watcher.js` and `editor.hooks.js`, so mock `mods-host.service.js` there and assert start and stop on the mock; the host's own behavior is covered by its suite.
  - Contract freeze test for `mod-api.v1.ts`.
  - E2E `e2e/specs/vault-mods.spec.ts`: seed a `hello` mod through `vaultFiles` whose `onload` calls `ctx.notify('Hello')` and assert the toast text and the Labs row. A reload wipes the virtual FS (it lives in page memory, `e2e/fixtures/test-vault.ts:138-145`), so turn mods on either by flipping the Labs toggle with live apply, or through a new fixture option, like `clockTime`, that runs `page.addInitScript` to write the flag before the first `goto`. Off by default: same files, no toast. A broken mod shows its folder-named error and a good mod still loads.
- [x] `layer-rules.test.ts` reports no new violation.

## Notes

- E2E runs without the CSP, so it cannot prove the loader works under `script-src 'self' 'unsafe-eval'`. `new Function` is chosen because QueryJS already ships it. The owner runs the hello mod once in the real app after delivery (PRD "Owner checks after delivery").
- A synchronous infinite loop in `onload` freezes the app (PRD P4). Accepted; documented in Issue 07.
- **Size:** M.

## Comments

- 2026-11-06, branch issue/02-load-mods: mods host discovers `_system/mods/<id>/` folders and loads each mod's main.js behind the Labs toggle; per-mod errors are toasted once and reported with the original error. Review fixes: read failures pass the error to `fail()`, dedupe test isolated in its own folder, hello-mod marker asserted on and off. Tests: pnpm check 0 errors; mods vitest pass; e2e vault-mods.spec.ts 4 passed; full suite at 527c12453 556 files / 13092 tests passed, build done. Reviews: round 1 APPROVED, round 2 APPROVED (one optional nit on asserting error.stack, not taken).

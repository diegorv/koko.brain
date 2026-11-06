# 02: Discover and load mods from `_system/mods/`

**What to build:** with the Labs toggle on (Issue 01), the app loads every mod in `<vault>/_system/mods/` when the vault opens, calls its `onload(ctx)`, and lists each mod with its state in Settings > Labs. No rail button yet (Issue 03).

**Format (PRD):**

```
_system/mods/<mod-id>/manifest.json
_system/mods/<mod-id>/main.js
```

- **Manifest.** Required: `id` (`^[a-z0-9]+(-[a-z0-9]+)*$`, at most 64 chars, equal to the folder name), `name` (non-empty), `version` (non-empty string). Optional: `description`, `author`, `minAppVersion` (shape-checked, not enforced). Unknown keys are ignored. No permissions and no entry points in the manifest. Each error names the folder and the field, for example `_system/mods/foo: manifest.json id "bar" does not match the folder name`.
- **Loader (PRD P3).** Read `main.js` with plugin-fs `readTextFile` inside try/catch. Require exactly one match of `/^export\s+default\s+/m`; replace it with an assignment to a holder, then evaluate `"use strict";` plus the code plus `//# sourceURL=kokobrain-mods/<id>/main.js` with `new Function`. Zero or several `export default`, or any other `import`/`export`, is a load error worded for the author: `main.js: use exactly one "export default" and no "import"; a mod is one file`. The default export must be an object with an `onload` function; `onunload` is optional. A class author writes `export default new MyMod()`. Do not reuse QueryJS's `includes('await')` wrapping (`plugins/queryjs/kb-api.ts:409-411`): it changes semantics when a comment contains "await".
- **`ctx` v1, this slice:** `apiVersion` (`1`), `mod` (`{ id, name, version, dir }`, `dir` vault-relative), `signal` (aborted at unload), `register(fn)` (extra cleanup, run at unload), `notify(message, { kind? })` (svelte-sonner toast prefixed with the mod name), `log(...args)` (`debug('MOD:<id>', ...)`). Write the hand-written contract `src/lib/plugins/mods/contract/mod-api.v1.ts`, following the rules at the top of `src/lib/plugins/queryjs/contract/kb-api.v1.ts:1-27`, with a freeze test like `kb-api-contract.test.ts`.
- **Lifecycle.** A host in `src/lib/plugins/mods/mods-host.service.ts`. Start it after the vault is open, inside the deferred post-open block of `initializeVault` (`src/lib/app/lifecycle/app-lifecycle.service.ts:520`), so mods never delay the open. Keep its async stop in a dedicated slot released both at `initializeVault` entry (next to `:160-161`) and in `teardownVault` (next to `:571-572`). Stop is a no-op when nothing is loaded: teardown also runs at boot with no vault. **Stop during a start:** the host keeps a start generation. Stop bumps it and unloads everything, in-flight loads included; a load that finishes after its generation changed unloads itself at once, so no rail button leaks into the next vault. Discovery: a missing `_system/mods/` means zero mods. Each mod loads on its own (`Promise.allSettled`), so one broken mod never blocks another.
- **Unload one mod:** abort `ctx.signal`, call `onunload()` in try/catch, then run every disposer `ctx` collected, in reverse, even if `onunload` threw. If `onload` throws, run the disposers it already collected and record the error.
- **Vault-switch guard.** `ctx` captures the vault path at load. A host call after unload or after the open vault changed throws `Mod "<id>" is unloaded`. QueryJS captures the path and never checks it (`kb-api.ts:103`); do not copy that.
- **Status.** `src/lib/plugins/mods/mods.store.svelte.ts`: a `$state.raw` list of `{ id, folder, name, version, state: 'loaded' | 'error', error? }`. A `ModsStatusList.svelte` block shown in Labs under the toggle; an error row shows the message with the stack in a `<details>` (precedent: `plugins/queryjs/queryjs-block-widget.ts:288-328`). A load error also raises one toast naming the folder.
- **Toggle.** Starting or stopping the host when the toggle flips is allowed and probably cheap, because `LabsSection` is in `app/`. If it is not, Labs shows "Reopen the app to apply" next to the toggle (owner decision). Say which in the commit.
- **Errors (PRD P9).** Mod errors the host catches go to the toast and `debug()`, never `error()` (which reports to Sentry, `utils/debug.ts`). Host failures (cannot read the folder) use `error()`. Errors the host cannot catch (a mod's timer, DOM listener or floating promise) reach Sentry's `GlobalHandlers` (`src/lib/core/settings/sentry.service.ts:63-70`) when Sentry is on: in its `beforeSend`, drop events whose stack frames come from a `kokobrain-mods/` sourceURL, with a test.
- **Placement:** `src/lib/plugins/mods/` (ADR-0003: optional, the app works without it). It must not import `plugins/queryjs`. Wiring only in `app/`.

**Blocked by:** 01

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `mods.logic.test.ts` (node): valid manifest; each invalid field; id and folder mismatch; unknown keys ignored; the rewrite with zero, one and two `export default`; a stray `import` line; a class instance default; a default without `onload`.
  - `mods-host.service.test.ts` (jsdom): mock only `@tauri-apps/plugin-fs` and `svelte-sonner`; real stores. Toggle off: nothing is read. On: two mods load and the store lists both. One mod's `onload` throws: it is `error`, its `register` cleanup ran, the other is `loaded`. No mods folder: empty list, no error. Stop: `onunload` and disposers ran in reverse, `ctx.signal.aborted` is true, a later `ctx.notify` throws.
  - `app-lifecycle.service.test.ts`: with mods on, the host starts after open; `teardownVault` and a re-init stop it (ADR-0003 requires a lifecycle test per registration).
  - Contract freeze test for `mod-api.v1.ts`.
  - Stop while a start is still loading leaves the registry and the status list empty, and the late load's `onunload` ran.
  - E2E `e2e/specs/vault-mods.spec.ts` (`bash scripts/e2e.sh`): seed a `hello` mod through `vaultFiles` whose `onload` calls `ctx.notify('Hello')` and assert the toast text and the Labs row. A reload wipes the virtual FS (it lives in page memory, `e2e/fixtures/test-vault.ts:138-145`), so turn mods on either by flipping the Labs toggle with live apply, or through a new fixture option, like `clockTime`, that runs `page.addInitScript` to write the flag before the first `goto`. Off by default: same files, no toast. A broken mod shows its folder-named error and a good mod still loads.
- [ ] `layer-rules.test.ts` reports no new violation.

## Notes

- E2E runs without the CSP, so it cannot prove the loader works under `script-src 'self' 'unsafe-eval'`. `new Function` is chosen because QueryJS already ships it. Before closing, run the hello mod once in `pnpm tauri dev` and say so in the commit.
- A synchronous infinite loop in `onload` freezes the app (PRD P4). Accepted; documented in Issue 07.
- **Size:** M.

## Comments

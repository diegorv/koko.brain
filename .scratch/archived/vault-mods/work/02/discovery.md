# Issue 02 discovery: discover and load mods from `_system/mods/`

Builds on `work/01` (flag store `plugins/mods/mods-enabled.store.svelte.ts`, `app/LabsSection.svelte`).

## Files that change

- New `src/lib/plugins/mods/mods.logic.ts`: `MODS_DIR`, `parseModManifest(text, folder)` (result union, errors prefixed `_system/mods/<folder>: manifest.json ...`), `evaluateModSource(source, id)` (throws).
- New `src/lib/plugins/mods/contract/mod-api.v1.ts`: `ModContextV1`, `ModInfoV1`, `ModNotifyOptionsV1`, `ModV1`. Same rules as `queryjs/contract/kb-api.v1.ts:1-27` (function-typed props, no imports, `.ts`).
- New `src/lib/plugins/mods/mods.store.svelte.ts`: `$state.raw` entries, getter `entries`, `setEntries`, `upsertEntry` (replace by folder, sorted by folder), `reset`.
- New `src/lib/plugins/mods/mods-host.service.ts`: `startModsHost(vaultPath)`, `stopModsHost()`, `createModContext(...)` (exported for the freeze test).
- New `src/lib/plugins/mods/ModsStatusList.svelte`; `src/lib/app/LabsSection.svelte:10-18,24-33` renders it under the toggle and starts/stops the host when the toggle flips (live apply).
- `src/lib/app/lifecycle/app-lifecycle.service.ts`: `stopModsHost()` at entry next to `:160-161` and in `teardownVault` next to `:571-572`; `startModsHost(vaultPath)` in the Step 9 timer (`:520-528`) behind its version guard.
- `docs/TESTING.md:150-159` row for `plugins/mods/`.
- New `e2e/specs/vault-mods.spec.ts`.

## Plan

1. Logic + tests (node). 2. Contract + store + tests. 3. Host + jsdom tests (mock `@tauri-apps/plugin-fs` with an in-memory map and `svelte-sonner`). 4. Status list + Labs live apply + tests. 5. Lifecycle wiring + tests (mock `mods-host.service.js`). 6. E2E + TESTING.md.

## Prior art

- Contract freeze: `src/tests/lib/plugins/queryjs/kb-api-contract.test.ts` (`satisfies Record<keyof X, true>` plus runtime key list).
- Component: `src/tests/lib/app/LabsSection.test.ts`. Lifecycle: Step 9 tests at `app-lifecycle.service.test.ts:391-435`.
- Folder listing: `plugins/one-on-one/one-on-one.service.ts:30-34` (`exists` then `readDir`).
- E2E toasts: `e2e/specs/bookmark-migration.spec.ts:41-67` (`[data-sonner-toast]`); settings nav: `e2e/specs/settings.spec.ts`.

## Defaults taken

- Toggle: live apply (LabsSection is in `app/`), so no "Reopen the app" copy; E2E flips the toggle.
- The host gates on the flag (`vaultStore.path === vaultPath && modsEnabledStore.enabled`); lifecycle calls start unconditionally.
- `stopModsHost()` is synchronous and idempotent; `startModsHost` calls it first, so a second start (toggle, re-init) never doubles mods. Lifecycle calls stop unconditionally (no-op with nothing loaded).
- Stop unloads every mod it knows about, including one whose `onload` is still pending (its signal aborts and ctx calls throw at once); a load still reading files sees the generation change and never evaluates.
- `onload` is awaited; `onunload` is called in try/catch, a returned promise's rejection is caught and logged.
- Store error entries carry `{ message, stack? }`; every message starts with `_system/mods/<folder>: `, which is also the toast text. Toast dedupe is keyed by vault path + folder, kept across stop/start, cleared when that mod loads.
- `startModsHost` propagates a host failure (folder unreadable); callers log it with `error()`.
- Status updates per mod as each settles, so a slow `onload` does not hide the others.

## Risks

- `new Function` under the real CSP is not covered by E2E (Issue Notes). ASI hazards after the `export default` rewrite are the author's.

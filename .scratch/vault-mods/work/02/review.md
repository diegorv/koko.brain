VERDICT: APPROVED

Reviewed `git diff feature/vault-mods...HEAD` (7 commits, 6933ecff8..693d100cc) against `.scratch/vault-mods/issues/02-load-mods.md` and the PRD decisions it cites (P1, P2, P3, P9).

## Acceptance criteria

- [met] Failing tests first: — every listed suite exists and passes when I ran it: `mods.logic.test.ts` (valid manifest, each invalid field incl. description/author/minAppVersion, id vs folder mismatch, unknown keys, zero/one/two `export default`, stray `import` reworded, `export const` reworded, other syntax error keeps the engine message, class instance default, default without `onload`, strict mode, `await` in a comment); `mods.store.test.ts` (getter `entries`, `setEntries`, `upsertEntry` replace/add, error entry keeps message and stack, `reset`); `mods-host.service.test.ts` (jsdom, mocks only `@tauri-apps/plugin-fs` and `svelte-sonner`, real `vaultStore`/`modsEnabledStore`/`modsStore`; toggle off reads nothing, two mods listed, throwing `onload` is `error` with its `register` cleanup run and the other `loaded`, no folder gives an empty list and no toast, stop runs `onunload` then disposers in reverse with `signal.aborted` and later `notify`/`register`/`log` throwing, stop during a pending `onload` leaves the list empty and runs that mod's `onunload`, stop during file reads loads nothing, same error twice toasts once and a new message toasts again, vault change makes ctx throw); `ModsStatusList.test.ts` (loaded row, error row with message and stack in `<details>`); `app-lifecycle.service.test.ts` "vault mods host" block (start in the Step 9 timer, not during the open; not for a superseded init; `teardownVault` and re-init stop it before `loadSettings`; host mocked as the Issue says); `mod-api-contract.test.ts` (`satisfies Record<keyof X, true>` plus runtime key lists); `e2e/specs/vault-mods.spec.ts` (hello toast `Hello mod: Hello` and Labs row via the live toggle, off by default shows no toast and no row, broken mod's `_system/mods/broken: ...` error with the good mod still `Loaded`, plus a reopen with the flag kept). The red-first order is the build's claim; it admits `mods.store.test.ts` and `ModsStatusList.test.ts` were not seen failing (finding 4).
- [met] `layer-rules.test.ts` reports no new violation. — `src/tests/lib/architecture` passes in my run; the diff does not touch `layer-baseline.json` or `BASELINE_SIZE`; `plugins/mods/` imports only `core/vault`, `utils/debug` and its own files (no `plugins/queryjs`, grep exit 1), and the wiring is in `app/` only.

## Checks I ran (worktree root, each read from its own exit status)

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/plugins/mods src/tests/lib/app/LabsSection.test.ts src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts src/tests/lib/architecture`: exit 0, 18 files, 242 tests.
- `taskpolicy -c background pnpm vitest run src/tests/lib/app/SettingsPanel.test.ts src/tests/lib/app/boot.test.ts src/tests/lib/core/vault/vault-switch-failed-save.test.ts` (other importers of LabsSection / the lifecycle): exit 0, 3 files, 36 tests.
- `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`: exit 0, 4 passed.
- The test verdict rests on those files. The full suite (`pnpm vitest run` + `pnpm build`) is deliver's to run; I did not run it.

## Spec conformance (checked, no finding)

- Manifest: regex, 64-char cap, id equals folder, non-empty `name`/`version`, optional fields shape-checked, unknown keys dropped, every error prefixed `_system/mods/<folder>: manifest.json` (`mods.logic.ts:33-68`).
- Loader: exactly one `/^export\s+default\s+/m`, rewrite to a holder, `"use strict";` + code + `//# sourceURL=kokobrain-mods/<id>/main.js` via `new Function`, import/export SyntaxError reworded, no `await` sniffing (`mods.logic.ts:90-114`).
- ctx v1 members match the Issue; `notify` uses `toast[kind]` with the mod-name prefix and an `info` fallback; the vault-switch guard checks `vaultStore.path` on every call (`mods-host.service.ts:45-69`).
- Unload order: abort, `onunload` in try/catch (async rejection caught), disposers in reverse even after a throw; a throwing `onload` runs its collected disposers (`mods-host.service.ts:82-101,155-161`).
- Generation counter, `Promise.allSettled`, missing folder means zero mods, folder read failure propagates to callers that use `error()` (`mods-host.service.ts:181-206`, `app-lifecycle.service.ts:532-536`, `LabsSection.svelte:27-29`). Mod errors go to toast + `debug()` only (P9).
- Lifecycle: stop at `initializeVault` entry and in `teardownVault`, start inside the Step 9 timer behind `initVersion !== version`. Toggle applies live and commit 3d069db5e says so. TESTING.md row added at `docs/TESTING.md:159`.
- fs capability: `fs:allow-exists`, `fs:allow-read-dir`, `fs:allow-read-text-file` already cover vault paths (`src-tauri/capabilities/default.json`), the same calls `one-on-one.service.ts` makes.

## Findings

1. nit, `src/lib/plugins/mods/mods-host.service.ts:132,142`: when `manifest.json` or `main.js` cannot be read, `fail()` gets no error object, so `debug('MOD:<id>', message, '')` drops the original error (its text survives only inside the message). Fix: pass `err` as the second argument in both read-failure branches, as the evaluate and `onload` branches do.
2. nit, `src/tests/lib/plugins/mods/mods-host.service.test.ts:72-88`: the host's module-level `toastedErrors` map is never cleared between tests, and two tests reuse folder `broken` in the same vault. They pass only because their messages differ; reordering or a shared message would make the dedupe test or the `onload`-throws toast assertion fail for the wrong reason. Fix: give the dedupe test its own folder or vault path.
3. nit, `e2e/specs/vault-mods.spec.ts:53-59`: the off-by-default case asserts `toHaveCount(0)` on the toast and the rows, which passes at once. It holds today because Labs opens well after the 0 ms Step 9 timer, but the assertion does not wait for anything that proves the start already ran. Fix: have the hello mod also set a marker (e.g. `globalThis.__helloRan = true`) and assert it stays unset after a known later point.
4. nit, process: the build report says `mods.store.test.ts` and `ModsStatusList.test.ts` were written after their code and never seen failing, against the "Failing tests first" wording. Both suites assert real store state and rendered content, so I see no test that could pass with the code broken; no change asked.
5. nit, `src/lib/plugins/mods/ModsStatusList.svelte:6-7`: while a start is still loading (stop resets the list, rows appear as each mod settles) the list reads "No mods in _system/mods/", and a mod whose `onload` never settles never gets a row. The Issue does not require a pending state; worth keeping in mind for Issue 04's reload on save.

## Resolution

1. Fixed: both read-failure branches in `mods-host.service.ts` pass `err` to `fail()`, so the debug line keeps the original error.
2. Fixed: the dedupe test uses its own folder `dedupe`, so it no longer shares the module-level `toastedErrors` key with the `onload`-throws test.
3. Fixed: the hello mod sets `globalThis.__helloRan`; the off-by-default test asserts it stays unset once Labs is open, and the toggle-on test asserts it is set, so the marker is proven to work.
4. No change, as the review asks.
5. No change in this Issue: a pending state is out of scope; left for Issue 04 as the review suggests.

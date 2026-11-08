VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | nit, `src/routes/(app)/+layout.svelte:86` comment still said `invoke('get_backlinks_v2')` | resolved | c7f28258 changes the line to `call('get_backlinks_v2')`; `grep -n invoke` on the file finds no remaining mention. Comment-only change, nothing to test. |
| 2 | nit, `src/tests/lib/architecture/raw-invoke.test.ts:63` filter skipped `.js` files | resolved | Filter now matches `ts`, `js` and `svelte` extensions (line 62). Probe: I added `src/lib/utils/zz-probe.js` with `import { invoke } from '@tauri-apps/api/core'`; the guard failed (exit 1) and listed `src/lib/utils/zz-probe.js` as the offender. I deleted the probe; the worktree is clean. Without the probe the test passes (4/4, exit 0), so the existing `.js` files under src/lib (`utils/build-info.js`, `utils/node-shims/{path,fs}.js`) raise no false positive. |

## Acceptance criteria re-checked

- [met] No `invoke(` import from `@tauri-apps/api/core` remains in src/lib or src/routes, outside contracts/ipc.ts and the updater exception — `grep -rn "@tauri-apps/api/core" src/lib src/routes` leaves `contracts/ipc.ts:1`, `UpdateSection.svelte:5` and the `widgets.ts` dynamic imports that destructure only `convertFileSrc`; the fixes touch no import.
- [met] The existing vitest invoke mocks pass unchanged — the fixes change no mock and no test other than the guard's file filter; the guard passes (exit 0). The full suite is deliver's to run.
- [met] A test fails if a new raw `invoke(` import is added outside the allowed files — the guard now also covers `.js` files; the planted `.js` probe made it fail with the probe listed as offender.

## Findings

None open or new. The fix commit touches only the two lines named above (plus review.md's Resolution); no test was weakened, no scope creep, no change to `layer-baseline.json`, `BASELINE_SIZE` or composition roots, nothing under src-tauri.

## Other checks

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `./node_modules/.bin/vitest run src/tests/lib/architecture/raw-invoke.test.ts`: exit 0, 4 tests passed.

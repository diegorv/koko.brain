VERDICT: APPROVED

## Acceptance criteria

- [met] No `invoke(` import from `@tauri-apps/api/core` remains in src/lib or src/routes, outside contracts/ipc.ts and the updater exception — `grep -rn "@tauri-apps/api/core" src` (excluding src/tests) leaves `src/lib/contracts/ipc.ts:1`, `src/lib/core/settings/sections/UpdateSection.svelte:5` (`invoke, Channel`, used only for `plugin:updater|download_and_install` at :171) and two `widgets.ts` dynamic imports that destructure only `convertFileSrc` (:165, :529). `grep -rnE "\binvoke\s*[<(]"` over src/lib and src/routes finds no call outside those files, only a prose comment (finding 1).
- [met] The existing vitest invoke mocks pass unchanged — `git diff main...HEAD --stat` touches one file under src/tests: the guard rename `core-ipc.test.ts` -> `raw-invoke.test.ts`. No test mocks `#lib/contracts/ipc.js`, so the existing `vi.mock('@tauri-apps/api/core')` mocks still intercept `call()`'s inner `invoke`. I ran the test folders of every touched file (list below): 136 files, 3589 tests, exit 0.
- [met] A test fails if a new raw `invoke(` import is added outside the allowed files — `src/tests/lib/architecture/raw-invoke.test.ts` now scans `src/lib` and `src/routes` with an allowlist of `contracts/ipc.ts` and `UpdateSection.svelte`. Probe: I appended `import { invoke as raw } from '@tauri-apps/api/core'` to `graph-view.service.ts` and `import { invoke } ...` to `routes/composer/+page.svelte`. The test failed (exit 1) and listed both files as offenders. I reverted both and the worktree is clean.

## Findings

1. nit, `src/routes/(app)/+layout.svelte:86`: this comment still says linked mentions come "via `invoke('get_backlinks_v2')`". The branch updated three JSDoc lines like it (backlinks, collection, tags) but left this one, so the prose is inconsistent. Fix: change it to `call('get_backlinks_v2')`.
2. nit, `src/tests/lib/architecture/raw-invoke.test.ts:63`: the file filter `/\.(ts|svelte)$/` skips `.js` files. src/lib has three today (`utils/build-info.js`, `utils/node-shims/{path,fs}.js`), and none imports invoke, so a raw import in a new `.js` file would pass the guard. Fix (optional): use `/\.(ts|js|svelte)$/`.

## Other checks

- `pnpm check`: exit 0, 0 errors and 0 warnings. `call()` infers every result type from `CommandMap`. Dropping the hand-written `<T>` generics caused no type mismatch, and the type imports this removed were used only by those generics.
- My test verdict rests on these runs, executed myself with `./node_modules/.bin/vitest run`: `src/tests/lib/features/{backlinks,collection,event-calendar,file-history,file-icons,outgoing-links,properties,rail-shell,search,tags,tasks,type-definitions}`, `src/tests/lib/plugins/{graph-view,templates}`, `src/tests/lib/architecture` (raw-invoke, layer-rules), `src/tests/lib/contracts` and `src/tests/lib/utils/debug.test.ts`. All passed. The full suite and `pnpm build` belong to deliver.
- No component test covers `routes/composer/+page.svelte`. The typecheck and the guard are the only checks on that file, and the change is two mechanical `invoke` -> `call` swaps on commands in `CommandMap`.
- Scope: `utils/debug.ts` is outside the Issue's folder list, but criterion 1 covers all of src/lib, and utils -> contracts is an allowed edge (layer-rules passes). The diff does not touch `layer-baseline.json` or `BASELINE_SIZE` and adds no composition root. Nothing changed under src-tauri, so cargo does not apply.

## Resolution

1. Fixed: the `+layout.svelte` comment now says `call('get_backlinks_v2')`.
2. Fixed: the guard's file filter is now `/\.(ts|js|svelte)$/`, so a raw `invoke` import in a `.js` file under src/lib or src/routes fails it.

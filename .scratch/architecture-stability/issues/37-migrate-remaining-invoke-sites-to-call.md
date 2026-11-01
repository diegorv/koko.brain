# 37: Migrate the remaining invoke sites to call()

**What to build:** After issue 10 has migrated `src/lib/core/`, move the remaining literal `invoke(` sites in `src/lib/features/`, `src/lib/plugins/` and `src/routes/` to `call()` from `src/lib/contracts/ipc.ts`. `plugin:updater|download_and_install` stays a raw invoke, as the documented exception.

**Blocked by:** 10


**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/contracts/ipc.ts (issue 10), the invoke sites found by `grep -rn "invoke(" src/lib/features src/lib/plugins src/routes`

- [x] No `invoke(` import from `@tauri-apps/api/core` remains in src/lib or src/routes, outside contracts/ipc.ts and the updater exception
- [x] The existing vitest invoke mocks pass unchanged
- [x] A test fails if a new raw `invoke(` import is added outside the allowed files

## Notes

- **Commits:** one per folder (features, plugins, routes) keeps review small.
- **Size:** M.

## Comments

- 2026-11-01, branch issue/37-migrate-remaining-invoke-sites-to-call: migrated the remaining raw `invoke` sites in src/lib and src/routes to `call()`; the guard `raw-invoke.test.ts` scans src/lib and src/routes (`.ts`, `.js`, `.svelte`) with an allowlist of `contracts/ipc.ts` and `UpdateSection.svelte`. Round 1 fixes: `+layout.svelte` comment now says `call('get_backlinks_v2')`; guard filter includes `.js`. Tests: `pnpm check` 0 errors; full suite at c7f28258 passed (407 files, 9632 tests, 1 skipped, 1 todo, build OK). Reviews: round 1 APPROVED (2 nits, fixed), round 2 APPROVED (no findings).

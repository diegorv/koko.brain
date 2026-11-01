# 37: Migrate the remaining invoke sites to call()

**What to build:** After issue 10 has migrated `src/lib/core/`, move the remaining literal `invoke(` sites in `src/lib/features/`, `src/lib/plugins/` and `src/routes/` to `call()` from `src/lib/contracts/ipc.ts`. `plugin:updater|download_and_install` stays a raw invoke, as the documented exception.

**Blocked by:** 10


**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/contracts/ipc.ts (issue 10), the invoke sites found by `grep -rn "invoke(" src/lib/features src/lib/plugins src/routes`

- [ ] No `invoke(` import from `@tauri-apps/api/core` remains in src/lib or src/routes, outside contracts/ipc.ts and the updater exception
- [ ] The existing vitest invoke mocks pass unchanged
- [ ] A test fails if a new raw `invoke(` import is added outside the allowed files

## Notes

- **Commits:** one per folder (features, plugins, routes) keeps review small.
- **Size:** M.

# 05: Add #lib subpath import beside $lib

**What to build:** `#lib/...` resolves in the app build, type-check and vitest, while every existing `$lib` import keeps working. This is the expand step of the `$lib` -> `#lib` wide refactor.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] A module imported via `#lib` resolves in build, check and vitest
- [ ] `$lib` still resolves everywhere
- [ ] pnpm check + pnpm vitest run + pnpm build green

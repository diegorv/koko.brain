# 11: Migrate test imports and mocks to #lib

**What to build:** every `$lib` specifier in the test suite, including `vi.mock`, `vi.importActual` and `vi.doMock` strings, uses `#lib`, so each mock still intercepts the module the source imports (a mismatched mock silently loads the real module).

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] No `$lib` specifier left in the test suite
- [ ] Mock specifiers match the specifiers the mocked modules are imported with
- [ ] pnpm check + pnpm vitest run + pnpm build green

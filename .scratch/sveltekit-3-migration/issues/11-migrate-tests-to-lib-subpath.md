# 11: Migrate test imports and mocks to #lib

**What to build:** every `$lib` specifier in the test suite, including `vi.mock`, `vi.importActual` and `vi.doMock` strings, uses `#lib`, so each mock still intercepts the module the source imports (a mismatched mock silently loads the real module).

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] No `$lib` specifier left in the test suite
- [ ] Mock specifiers match the specifiers the mocked modules are imported with
- [ ] pnpm check + pnpm vitest run + pnpm build green

**Pre-flight (01):** spell specifiers as `sv migrate sveltekit-3` does (`.js` for `.ts`, `.svelte.js` for `.svelte.ts`, `/index.js` for barrels). The `sv migrate` `lib-alias` task is whole-repo (incl. `.md`), so it cannot be run per layer; use it only scoped to this layer's files or rewrite by hand.

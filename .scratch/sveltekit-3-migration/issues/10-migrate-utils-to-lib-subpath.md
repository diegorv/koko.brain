# 10: Migrate utils imports to #lib

**What to build:** every `$lib` import in the utils layer (static, dynamic `import()`, and inline type imports) uses `#lib`, with explicit extensions where subpath imports require them. Scope extended to every other non-test file still carrying a `$lib` specifier (no other ticket covers them): `src/routes/(app)/+layout.svelte`, `src/routes/(app)/+page.svelte`. `src/lib/utils.ts`, other `src/lib` root files, `src/lib/types` and `src/app.d.ts` carried none. `src/tests` stays with ticket 11.

**Blocked by:** 05

**Status:** ready-for-agent

- [x] No `$lib` specifier left in the utils layer
- [x] pnpm check + pnpm vitest run + pnpm build green

**Pre-flight (01):** spell specifiers as `sv migrate sveltekit-3` does (`.js` for `.ts`, `.svelte.js` for `.svelte.ts`, `/index.js` for barrels). The `sv migrate` `lib-alias` task is whole-repo (incl. `.md`), so it cannot be run per layer; use it only scoped to this layer's files or rewrite by hand.

# 07: Migrate core imports to #lib

**What to build:** every `$lib` import in the core layer (static, dynamic `import()`, and inline type imports) uses `#lib`, with explicit extensions where subpath imports require them.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] No `$lib` specifier left in the core layer
- [ ] pnpm check + pnpm vitest run + pnpm build green

**Pre-flight (01):** spell specifiers as `sv migrate sveltekit-3` does (`.js` for `.ts`, `.svelte.js` for `.svelte.ts`, `/index.js` for barrels). The `sv migrate` `lib-alias` task is whole-repo (incl. `.md`), so it cannot be run per layer; use it only scoped to this layer's files or rewrite by hand.

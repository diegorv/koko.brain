# 10: Migrate utils imports to #lib

**What to build:** every `$lib` import in the utils layer (static, dynamic `import()`, and inline type imports) uses `#lib`, with explicit extensions where subpath imports require them.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] No `$lib` specifier left in the utils layer
- [ ] pnpm check + pnpm vitest run + pnpm build green

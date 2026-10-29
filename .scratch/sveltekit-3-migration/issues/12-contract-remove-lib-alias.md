# 12: Remove the $lib alias and update docs

**What to build:** `$lib` no longer exists anywhere: the deprecated kit alias and the vitest alias are removed, the build emits no `$lib` deprecation warning, and project docs describe `#lib` and the Vite-only config. Close out by deleting the migration plan.

**Blocked by:** 06, 07, 08, 09, 10, 11

**Status:** ready-for-agent

- [ ] No `$lib` specifier or alias left in the repo
- [ ] No `$lib` deprecation warning in build output
- [ ] Docs updated (import conventions, patterns, testing)
- [ ] pnpm check + pnpm vitest run + pnpm build green

## Comments

- 2026-10-29: the #lib guard test (ticket 05) lands before the codemod with a `count > 0` scanner check; raise it to `> 100` here. tsconfig `paths` repeats the generated `$lib`, `$lib/*` and `$app/types` entries; drop the `$lib` ones here and keep `"#lib/*"`.

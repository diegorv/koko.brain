# 12: Remove the $lib alias and update docs

**What to build:** `$lib` no longer exists anywhere: the deprecated kit alias and the vitest alias are removed, the build emits no `$lib` deprecation warning, and project docs describe `#lib` and the Vite-only config. Close out by deleting the migration plan.

**Blocked by:** 06, 07, 08, 09, 10, 11

**Status:** ready-for-agent

- [x] No `$lib` specifier or alias left in the repo
- [x] No `$lib` deprecation warning in build output
- [x] Docs updated (import conventions, patterns, testing)
- [x] components.json shadcn aliases (currently $lib, lines 9-13) point to #lib so CLI-generated components don't reintroduce $lib
- [x] Code comments naming `$lib` paths updated (left by 08: src/lib/features/search/search.logic.ts:28 `$lib/utils/sanitize`)
- [x] When removing `$lib`/`$lib/*` from tsconfig.json `paths`, keep `"#lib/*": ["./src/lib/*"]` (without it `#lib` component props are untyped; see plan Notes)
- [x] Rework or delete `src/tests/lib/lib-subpath-import.test.ts` (lines 7-8 import via `$lib` as the ticket-05 equivalence proof)
- [x] pnpm check + pnpm vitest run + pnpm build green

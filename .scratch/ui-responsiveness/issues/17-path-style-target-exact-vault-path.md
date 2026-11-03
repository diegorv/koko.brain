# 17: A path-style wikilink target resolves to its exact vault-relative path first

**Status:** needs-triage

Priority: P3 (correctness, rare: needs two files with the same name under folders whose trailing segments match)

**What to build:** Issue 16 added an exact-file step for targets that carry an extension. For a path-style target (`[[b/foo.png]]`) that step matches a path suffix (`isExactFile`, `src/lib/core/filesystem/wikilink-resolution.logic.ts`, `endsWith('/' + exact)`), not the vault-relative path. So `[[b/foo.png]]` resolves to `/vault/x/b/foo.png` when that file comes before `/vault/b/foo.png` in tree order, and when the vault folder itself is named `b`, a root-level `foo.png` also matches. The suffix rule is pinned by the test `matches a path-style target by path suffix, first in tree order` in `src/tests/lib/core/filesystem/wikilink-resolution.logic.test.ts`. Fix: pass the vault root into the resolvers (editor-host can read `vaultStore.path`) and try the exact vault-relative path before the suffix match.

**Blocked by:** 16

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** review finding 1 of Issue 16 (`.scratch/ui-responsiveness/work/16/review.md`, kept in git history after delivery)

- [ ] Owner decision recorded in Notes: is the suffix rule acceptable, or does the vault-relative path win first?
- [ ] Failing first: with `/vault/x/b/foo.png` before `/vault/b/foo.png`, `[[b/foo.png]]` resolves to `/vault/b/foo.png`
- [ ] The cached and linear resolvers stay in parity

## Notes

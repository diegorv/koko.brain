# 17: A path-style wikilink target resolves to its exact vault-relative path first

**Status:** resolved

Priority: P3 (correctness, rare: needs two files with the same name under folders whose trailing segments match)

**What to build:** Issue 16 added an exact-file step for targets that carry an extension. For a path-style target (`[[b/foo.png]]`) that step matches a path suffix (`isExactFile`, `src/lib/core/filesystem/wikilink-resolution.logic.ts`, `endsWith('/' + exact)`), not the vault-relative path. So `[[b/foo.png]]` resolves to `/vault/x/b/foo.png` when that file comes before `/vault/b/foo.png` in tree order, and when the vault folder itself is named `b`, a root-level `foo.png` also matches. The suffix rule is pinned by the test `matches a path-style target by path suffix, first in tree order` in `src/tests/lib/core/filesystem/wikilink-resolution.logic.test.ts`. Fix: pass the vault root into the resolvers (editor-host can read `vaultStore.path`) and try the exact vault-relative path before the suffix match.

**Blocked by:** 16

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** review finding 1 of Issue 16 (`.scratch/ui-responsiveness/work/16/review.md`, kept in git history after delivery)

- [x] Owner decision recorded in Notes: is the suffix rule acceptable, or does the vault-relative path win first?
- [x] Failing first: with `/vault/x/b/foo.png` before `/vault/b/foo.png`, `[[b/foo.png]]` resolves to `/vault/b/foo.png`
- [x] The cached and linear resolvers stay in parity

## Notes

- Owner decision (2026-11-03): the exact vault-relative path wins first; the path-suffix match stays as the fallback, so links that resolve today keep resolving. Update the pinned suffix test to cover the fallback only (vault-relative miss), not first-in-tree precedence.

## Comments

- 2026-11-03, branch `issue/17-path-style-target-exact-vault-path`: `findExactFile` now tries `<vaultRoot>/<target>` before the path-suffix fallback, in both the cached and linear resolvers; `appEditorHost.resolveLink` passes `vaultStore.path`. Review round 1 APPROVED (follow-up Issue 20 filed for the other callers, test renamed, trailing-slash nit rejected); round 2 APPROVED with no findings. Full suite at 1b8f13db: 451 files, 10358 passed, 1 skipped, 1 todo; build succeeded; `pnpm check` 0 errors.

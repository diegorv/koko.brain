# Issue 27: Consolidate stem() and relativePath() into utils/path.ts

Status: ready-for-agent
Phase: P3 Track C step 2
Source: PONY #51 + #59 + #27 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track C — Filesystem/paths)
Blocked by: none

## What

Two path helpers are copied around the codebase: a filename-stem derivation (5 copies) and a
vault-relative-path derivation (4 copies). Consolidate both into the **existing**
`src/lib/utils/path.ts` as ONE change. The copies are not identical, so the behavioral deltas get
reconciled before anything is flipped.

## How

- **#51 + #59 + #27 as ONE change**, into the **EXISTING** `src/lib/utils/path.ts` — do not create a
  new module.
- Consolidate `stem()` (5 copies) and `relativePath()` (4 copies).
- **Reconcile the behavioral deltas FIRST**, before flipping any call site: the sibling-prefix
  handling and the `filePath === vaultPath` case differ between copies. Pick the correct behavior,
  pin it with a test, then flip.
- **Flip exactly 4 call sites**: `search.logic.ts:171`, `SearchResult.svelte:64`,
  `QuickSwitcher.svelte:82`, `RelationshipSearch.svelte:79`.
- **file-history's 3 sites stay UNFLIPPED** — those strings are SQLite snapshot keys (persisted
  identifiers), per ADR-0021. Changing them would invalidate existing snapshots.
- **Keep a named `extractVaultName` wrapper** — do not inline it away at its call sites.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Test collateral lands in the same commit as the source change, including the tests pinning the
  reconciled sibling-prefix and `filePath === vaultPath` behavior.
- Stage only the files related to this step (`git add <specific files>`), verify with
  `git diff --cached --stat`.
- One commit, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with
  line ranges).

## Comments

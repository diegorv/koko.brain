# Issue 17 discovery

Owner decision (Issue Notes, 2026-11-03): the exact vault-relative path wins first; the
path-suffix match stays as the fallback. Pattern follows `work/16`; only the differences are here.

## Files that change

- `src/lib/core/filesystem/wikilink-resolution.logic.ts:20-39`, `:92-101`
  - `resolveWikilink(target, paths, vaultRoot?)` and `resolveWikilinkCached(target, cache, vaultRoot?)`
    take an optional vault root at resolve time (not at cache build, so the editor-host tree memo
    does not need to know the vault path).
  - In the exact step, a path-style target (`b/foo.png`) first looks for the path equal,
    case-insensitively, to `${vaultRoot}/${target}`; on a miss (or with no root) the existing
    `endsWith('/' + target)` suffix match runs, first in tree order. Bare `foo.png` is unchanged.
  - Cached: the candidate list is `byFileName.get('foo.png')`, so the vault-relative hit is in it
    whenever it exists; same first-match order as the linear scan (parity).
- `src/lib/app/editor-host.ts:86-88`: `resolveLink` passes `vaultStore.path` (already imported).

## Plan

1. Failing tests in `src/tests/lib/core/filesystem/wikilink-resolution.logic.test.ts`, run for
   both resolvers: `[/vault/x/b/foo.png, /vault/b/foo.png]` + root `/vault` -> `/vault/b/foo.png`;
   vault folder named `b` (`/b/foo.png` root file vs `/b/b/foo.png`) -> `/b/b/foo.png`;
   case-insensitive. Replace the pinned suffix test with the fallback-only case (vault-relative
   miss -> first suffix match).
2. Implement in the logic file.
3. `src/tests/lib/app/editor-host.test.ts`: set `vaultStore.open('/vault')`, assert
   `resolveLink('b/foo.png')` picks `/vault/b/foo.png` over an earlier `/vault/x/b/foo.png`; the
   parity test passes the root to `resolveWikilink` too.

## Risks / defaults

- Other callers (`NoteRow`, `PropertiesView`, kanban, graph-view, lens, queryjs) do not pass a
  root and keep the suffix rule; the Issue names editor-host only. Mentioned in the report.
- A root with a trailing `/` would miss the exact step and fall back to the suffix rule (same
  result as today); `vaultStore.path` comes from the folder picker without one.
- Rust `VaultIndex` is Issue 18's scope.

# Issue 16 discovery

Owner decision (Issue Notes, 2026-11-03): exact match first, today's rule as the fallback.

## Files that change

- `src/lib/core/filesystem/wikilink-resolution.logic.ts:11-67`
  - `buildResolutionCache` adds `byFileName`: lowercase full file name (`foo.png`) to every
    path with that name, in tree order. `WikilinkResolutionCache` becomes
    `Map<string, string> & { byFileName }`, so the name map, its tests and every caller that only
    passes the cache through stay as they are.
  - New exact step, run only when the target's last segment has an extension
    (`getNoteName(target) !== basename`): no `/` takes the first file with that name; with `/`
    takes the first path ending in `/` + target (tree paths are absolute, CLAUDE.md Indexing 9, so
    "vault-relative path" is a `/`-anchored suffix match). Miss: today's two passes.
  - `resolveWikilink` (linear, used by `NoteRow` / `PropertiesView`) gets the same order, so the
    editor-host memo test that compares the two stays an equality.
- `src/lib/app/editor-host.ts`: no change. Issue 03's WeakMap memo builds one cache per tree
  identity and both maps live in it (criterion 4).

## Plan

1. Failing tests in `src/tests/lib/core/filesystem/wikilink-resolution.logic.test.ts`: paths
   `[/vault/a/foo.md, /vault/b/foo.png]`, `foo.png` resolves to `/vault/b/foo.png` (linear and
   cached); `foo` still `/vault/a/foo.md`; `foo.png` with no `foo.png` file still `foo.md`
   (fallback); `b/foo.png` path target exact; `v1.2` still resolves `v1.2.md`.
2. Implement in the logic file.
3. `src/tests/lib/app/editor-host.test.ts`: on one tree, `resolveLink('foo.png')` and
   `resolveLink('foo')` both answer, and the bounded-reads test covers exact targets too.

## Risks / defaults

- Only targets whose last segment carries an extension take the exact step, so `[[foo]]` never
  meets an extensionless file `foo` ahead of `foo.md` (unchanged).
- `[[v1.2]]`: the exact step looks for a file literally named `v1.2`, misses, falls back. Same.
- `[[a/foo.md]]` now picks `/vault/a/foo.md` over an earlier `foo.md` elsewhere: that is the rule.
- Rust `VaultIndex` resolves backlinks separately; it is out of scope (TS only), so backlinks may
  still point at `foo.md` for `![[foo.png]]`.

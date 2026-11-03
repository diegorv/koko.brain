VERDICT: APPROVED

## Acceptance criteria

- [met] Owner decision recorded in Notes — Issue Notes carry the 2026-11-03 rule (exact match first, today's rule as the fallback); the code follows it: `exactTarget` / `isExactFile` run first and on a miss the two existing passes run unchanged (`src/lib/core/filesystem/wikilink-resolution.logic.ts:34-39`, `:92-97`).
- [met] Failing first: with `foo.md` before `foo.png` in the tree, `![[foo.png]]` resolves to `foo.png` — new block `a target with an extension` in `src/tests/lib/core/filesystem/wikilink-resolution.logic.test.ts:118-153` uses paths `['/vault/a/foo.md', '/vault/b/foo.png', …]` and expects `/vault/b/foo.png` from both resolvers. Probe: I swapped `main`'s logic file in temporarily and ran the new tests: 5 failed (4 in the logic test, 1 in the editor-host test, `foo.png` resolved to `foo.md`), then I restored the file (`git diff --quiet` clean). With the branch code all of them pass. The live-preview image embed reaches this code through `resolveImageEmbedAssetUrl` -> `host.resolveLink` -> `resolveWikilinkCached` (`widgets.ts:544-548`, `editor-host.ts:86-88`).
- [met] `[[foo]]` still resolves to `foo.md`; the existing wikilink-resolution tests stay green — `keeps resolving a bare name to the note` (test :138-140) and `resolveLink('foo')` in the editor-host test; the diff adds to the existing test file and changes nothing in it (`git diff main...HEAD` on that file is `+` only), and the full file passes (see Tests).
- [met] Issue 03's memoized cache serves both maps from one tree identity — `editor-host.ts` is unchanged: `treeLinkIndex()` keeps one `buildResolutionCache` result per tree root in `linkIndexByTree` (WeakMap), and `byFileName` is built inside that same object (`wikilink-resolution.logic.ts:71-86`). New test `serves exact-file and note-name targets from one build per tree` (`editor-host.test.ts:162-178`) resolves `foo.png`, `b/foo.png` and `foo` 20 times each and limits node path reads to fewer than `2 * files.length`.

## Checks

- `pnpm check`: exit 0, 0 errors and 0 warnings.
- Tests I ran (all exit 0, 8 files, 613 tests): `src/tests/lib/core/filesystem/wikilink-resolution.logic.test.ts`, `src/tests/lib/app/editor-host.test.ts`, and the caller tests `src/tests/lib/plugins/queryjs/queryjs.logic.test.ts`, `src/tests/lib/plugins/queryjs/kb-api.test.ts`, `src/tests/lib/plugins/graph-view/graph-view.logic.test.ts`, `src/tests/lib/plugins/kanban/kanban.service.test.ts`, `src/tests/lib/features/rail-shell/lens.logic.test.ts`, `src/tests/lib/core/frontmatter/properties.logic.test.ts`. My test verdict rests on these files. Deliver runs the full suite and `pnpm build`.
- Resolver parity: for every target, the linear and cached exact steps return the same first match in input order, because any path that ends in `/b/foo.png` is named `foo.png`, so it is in `byFileName.get('foo.png')`.
- `flattenFileTree` lists files only (`file-entries.logic.ts:13-22`), so a folder named `v1.2` cannot win the exact step for `[[v1.2]]`.
- Scope: only the logic file, its test, the editor-host test and the workflow's `.scratch` records. No layer-baseline or composition-root change. Tabs are used throughout.

## Findings

1. minor — `src/lib/core/filesystem/wikilink-resolution.logic.ts:22` — For a path-style target, the exact step matches a path suffix (`endsWith('/' + exact)`). It does not match the "exact vault-relative path" the Issue names. `[[b/foo.png]]` resolves to `/vault/x/b/foo.png` when that file comes before `/vault/b/foo.png` in the tree. If the vault folder itself is named `b`, a root-level `/…/b/foo.png` also matches. Fix: pass the vault root into the cached resolver (editor-host can read `vaultStore.path`) and try the exact vault-relative path before the suffix match. Or keep the suffix rule, add a test that pins the precedence, and file a follow-up.
2. minor — `src-tauri/src/vault/index.rs:111` (out of this Issue's TS scope) — Rust `resolve_with_cache` keeps the stem-first rule. A path-style `[[a/foo.md]]` among notes with the same name now opens `/vault/a/foo.md` in the editor, but backlinks and outgoing links (Rust) can still credit the first `foo.md`. Fix: a follow-up `.scratch` Issue that applies the exact-first rule to `VaultIndex`. The e2e mock `e2e/mocks/vault-index.ts`, which reuses the TS cache, would then match Rust again.
3. nit — `src/lib/core/filesystem/wikilink-resolution.logic.ts:64` — The JSDoc on `WikilinkResolutionCache` still says "lowercase note name → file path" only. Fix: mention that the type also carries the `byFileName` exact-name map.
4. nit — `src/tests/lib/core/filesystem/wikilink-resolution.logic.test.ts:118` — No test pins the user-visible precedence change for a dotted note name that has an exact sibling file. Example: `[[config.json]]` with `config.json.md` and `config.json` both present resolved to the note before and now resolves to the `.json` file. That follows the owner rule, but no test covers it. Fix: add one case.
5. nit — `src/tests/lib/app/editor-host.test.ts:163-167` — The `counted` node helper is copied from the test above it (`:147-151`). Fix: hoist it to the `describe` scope.

## Resolution

1. Fixed by the review's second option: kept the suffix rule (passing the vault root would widen the Issue into editor-host and the vault store), pinned it with the test `matches a path-style target by path suffix, first in tree order` in `wikilink-resolution.logic.test.ts`, and filed follow-up Issue 17 (`17-path-style-target-exact-vault-path.md`).
2. Out of this Issue's TS scope, as the review says: filed follow-up Issue 18 (`18-vault-index-exact-first-resolution.md`) for exact-first resolution in Rust `VaultIndex`.
3. Fixed: the `WikilinkResolutionCache` JSDoc now names both the note-name map and `byFileName`.
4. Fixed: added `prefers an exact sibling file over a dotted note name` (`config.json` with `config.json.md` and `config.json` resolves to the `.json` file; with only `config.json.md` it resolves to the note), run for both resolvers.
5. Fixed: hoisted the `counted` node helper to the `resolveLink memo` describe scope in `editor-host.test.ts`; it takes a `{ reads }` counter so each test keeps its own count.

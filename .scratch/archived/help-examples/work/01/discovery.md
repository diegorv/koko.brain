# 01 discovery: folder-scoping pattern and guard

## Files that change
- `help/examples/SCOPING.md` (new): one snippet per surface.
- `src/tests/help-examples-scoping.test.ts` (new): guard + allowlist.

## What each surface can express today (read only)
- QueryJS: `kb.pages(source)` (`kb-api.ts:63`) -> `parseSource` (`queryjs.logic.ts:173`): `"folder"` source keeps pages whose `file.folder` (ABSOLUTE, `src-tauri/src/commands/vault.rs:740`) contains the text, case-insensitive. `kb.current().file.folder` (`kb-api.ts:82`) is the host note's absolute folder, also inside `kb.view()` scripts. Pattern: ``kb.pages(`"${kb.current().file.folder}"`)``; parent levels via `split('/').slice(0, -n)`. `kb.ui.*` take data, never read the vault (`kb-ui.ts` ctor has no index).
- Collection blocks, `.collection`, `.view`: filters run in `expression/evaluator.ts`; `EvalContext` (`:10`) has no host-note reference -> cannot say "this note's folder". `file.inFolder(x)` (`:508`) does `startsWith` on the absolute folder, so a relative name never matches. Closest: `file.folder.contains("/<example-folder>")` (string `contains`, `methods.logic.ts:191`), or `views[].limit`.
- Auto-move: rule `expression` uses the same engine (scope by `file.folder.contains`); `destination` supports `{folder}` / `{parent}` (`auto-move.logic.ts:101`) -> relative to the note.
- Type definitions (`_types/*.md`): no filter field (`type-definitions.logic.ts:92`); type names are vault-global. Gap.
- Kanban: board is the file itself, no vault query. Canvas: no query. Search: `path:` operator (help/documentation/06-search-and-navigation.md:132); search-types/ holds corpus notes only.

## Plan
1. SCOPING.md with the patterns and gaps above.
2. Guard test: walk `help/examples/`; sites = top-level ```` ```queryjs ````/```` ```dataviewjs ```` fences and `.js` files that call `kb|dv.pages|pagePaths(`; ```` ```collection ```` fences, `.collection`, `.view` (parsed with the real `parseCollectionYaml`, unparsable = not a site), each auto-move rule. Scoped = folder source `pages(\`"` / `file.folder|path` predicate / `.limit(` (queryjs, per site); every view has a path filter (global or view) or `limit` (collection); expression has a path predicate (auto-move). Allowlist: file -> issue 02-07. Tests: classifier unit cases (scoped, limited, unscoped), real scan has no offenders outside the allowlist, no stale allowlist entries, every entry names 02-07.
3. See it fail on a temporary unscoped fixture, then remove it.

## Prior art
- `src/tests/lib/lib-specifier-convention.test.ts` (walk + readFileSync guard, sanity count).

## Risks / defaults taken
- Regex heuristics, site-level for queryjs (one scoped call clears the block). Documented in the test; folder issues tighten nothing here.
- Stale-entry check makes 02-07 remove their entries (their acceptance criterion).
- Folder filter `includes` also matches a sibling folder sharing the prefix (`/x/foo` vs `/x/foo-bar`); noted in SCOPING.md, no API change.

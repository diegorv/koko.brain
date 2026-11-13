# 37 discovery: migrate the remaining invoke sites to call()

No spec.md for this feature; the Issue is the spec. Repeats the core migration from work/10 (`call()` in `src/lib/contracts/ipc.ts`, `CommandMap` in `commands.ts`); only the folders differ. Every command these sites invoke is already in `CommandMap`.

## Files that change
- features: `type-definitions/type-definitions.service.ts:2,23,118,224`, `tasks/tasks.service.ts:1,60,61,102`, `collection/collection.service.ts:1,61`, `event-calendar/event-calendar.service.ts:13,119`, `file-icons/file-icons.service.ts:2,178`, `outgoing-links/outgoing-links.service.ts:1,74,75`, `tags/tags.service.ts:1,27`, `search/search.service.ts:1,35-396`, `properties/lifecycle-filter.service.ts:1,8`, `file-history/file-history.service.ts:1,31-117`, `rail-shell/new-note.service.ts:1,27`, `backlinks/backlinks.service.ts:1,95-214`.
- plugins: `graph-view/graph-view.service.ts:1,15`, `templates/templates.service.ts:2,105`.
- routes: `composer/+page.svelte:2,22,41`.
- utils: `utils/debug.ts:1,108,145`. Not in the Issue's folder list, but criterion 1 covers all of `src/lib`; utils -> contracts is an allowed edge (layer-rules.test.ts:143).
- Test: `src/tests/lib/architecture/core-ipc.test.ts` widens from `src/lib/core` to `src/lib` + `src/routes`, renamed to `raw-invoke.test.ts`. Allowlist: `contracts/ipc.ts` (the wrapper) and `core/settings/sections/UpdateSection.svelte` (updater plugin).

## Plan (commits)
1. Discovery.
2. Widen the guard test (red: lists the 17 offenders).
3. features migration. 4. plugins + utils migration. 5. routes migration (guard green).
Drop the `<T>` generics at each site: `call()` infers the result type. Fix any result-type mismatch at the call site without casts.

## Prior art
- work/10 core migration; `core-ipc.test.ts` regexes (named, namespace, dynamic imports).
- Tests mock `@tauri-apps/api/core`; `call()` calls that `invoke`, and zero-arg commands reach `invoke(cmd)` with one argument, so `toHaveBeenCalledWith` assertions stay unchanged.

## Risks
- Local result types (e.g. search's `FtsSearchResult`, `SemanticSearchResult`) may differ from generated ones: `pnpm check` surfaces them; fix at the site.
- Comments that mention `invoke('...')` (tags/collection/backlinks JSDoc, +layout.svelte:86) are prose, not imports; left as is.

## Defaults
- Include `utils/debug.ts` (criterion 1 says src/lib). Rename the test file since it no longer covers only core.

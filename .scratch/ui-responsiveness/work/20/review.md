VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: for each caller above, a test with `/vault/x/b/foo.png` before `/vault/b/foo.png` where `[[b/foo.png]]` resolves to `/vault/b/foo.png` — each listed caller has a test: queryjs `buildKBPage` (queryjs.logic.test.ts:237) plus the `KBAPI.ensureCache` wiring (kb-api.test.ts:96), graph-view `buildGraphData` (graph-view.logic.test.ts:165) plus the `buildGraph` service wiring (graph-view.service.test.ts:49), kanban `loadLinkedFileContent` (kanban.service.test.ts:149), rail-shell lens outgoing and backlinks call sites (lens.logic.test.ts:858, both groups asserted), NoteRow pill click (NoteRowMenu.test.ts:199), properties `resolveRelationshipLinks` with the real `resolveWikilink` (properties.logic.test.ts:1384). Failing first verified by me: with `git diff main...HEAD -- src/lib | git apply -R` applied, all 8 new tests failed on the path (`expected '/vault/x/b/foo.png' to be '/vault/b/foo.png'` and the equivalent for the `.md` fixtures), 594 others passed; the tree was restored with `git checkout -- src/lib` (clean `git status`). With the fix they pass. Three tests use `foo.md` instead of `foo.png` (see finding 3); same resolver branch.
- [met] No `.logic.ts` file gains a store import — the only added imports in `git diff main...HEAD -- src/lib` are `vaultStore` in `NoteRow.svelte`, `PropertiesView.svelte`, `graph-view.service.ts` and `kanban.service.ts`. `queryjs.logic.ts`, `graph-view.logic.ts`, `lens.logic.ts` and `properties.logic.ts` take the root as a parameter (or `ctx.vaultPath`, already on `LensContext`) and gain no import. `src/tests/lib/architecture` passes.

## Findings

1. minor — `src/lib/features/properties/PropertiesView.svelte:62`: the production wiring of `resolveRelationshipLinks` (passing `vaultStore.path`) has no test; only the logic-level forwarding is covered (properties.logic.test.ts:1384). Removing `vaultStore.path` from this call would leave every test green while the relationship pills in the Properties panel regress to the suffix match. Fix: add a component test that mounts `PropertiesView` with an open `/vault`, a relationship property `[[b/foo.png]]` and a file tree with `/vault/x/b/foo.png` before `/vault/b/foo.png`, and asserts the resolved pill/click target, or record the gap as accepted. The change itself is in scope: without it the `properties.logic.ts` fix would be inert in the app.
2. nit — `src/lib/plugins/queryjs/queryjs.logic.ts:98-106`: the `buildKBPage` JSDoc does not mention the new `vaultRoot` parameter, while `buildGraphData` and `resolveRelationshipLinks` document theirs. Fix: add one sentence (`vaultRoot` lets a path-style outlink resolve to its vault-relative file first).
3. nit — `src/tests/lib/plugins/queryjs/kb-api.test.ts:96`, `src/tests/lib/plugins/kanban/kanban.service.test.ts:149`, `src/tests/lib/plugins/graph-view/graph-view.service.test.ts:49`: these use `foo.md` rather than the criterion's literal `foo.png`. They exercise the same exact-file branch (`exactTarget` keys on any extension) and the snapshots they feed hold notes only, so the criterion is met in substance. No change needed.

## Not findings (checked)

- Caller coverage: `grep -rnE "resolveWikilink(Cached)?\("` over `src/lib` lists only `editor-host.ts` plus the callers this branch changes; every one now passes a root.
- `vaultPath` sources: `KBAPI` gets `vaultPath` from its constructor (`queryjs-block-widget.ts:220`); `LensContext.vaultPath` is fed `vaultStore.path` by `RailNoteList.svelte` and `TypesNavigator.svelte`.
- queryjs `inlinks` (`buildReverseIndex`, basename-keyed) do not go through the resolver and are unchanged; the Issue scopes queryjs to `outlinks`.
- Layer baseline and `BASELINE_SIZE` untouched; no composition root added.

## Checks run (by me, in the worktree)

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- Targeted vitest (`./node_modules/.bin/vitest run`): exit 0, 66 files, 2045 passed, 1 todo. Files: `src/tests/lib/core/frontmatter/properties.logic.test.ts`, `src/tests/lib/core/filesystem/wikilink-resolution.logic.test.ts`, `src/tests/lib/features/note-list/` (all), `src/tests/lib/features/rail-shell/` (all), `src/tests/lib/features/properties/` (all), `src/tests/lib/plugins/graph-view/` (all), `src/tests/lib/plugins/kanban/` (all), `src/tests/lib/plugins/queryjs/` (all, incl. `kbapi-firewall.test.ts`), `src/tests/help/queryjs-contract.test.ts`, `src/tests/help/queryjs-features-scoping.test.ts`, `src/tests/lib/plugins/calendar/day-lens.logic.test.ts`, `src/tests/lib/plugins/calendar/calendar-rail.service.test.ts`, `src/tests/lib/architecture/` (all).
- Revert probe described under criterion 1 (8 failed on the path, restored clean).
- Not run: full suite and `pnpm build` (deliver's).

## Resolution

1. Fixed: `src/tests/lib/features/properties/PropertiesView.test.ts` mounts `PropertiesView` with `/vault` open, a `_belongs_to: "[[b/foo.png]]"` note and `/vault/x/b/foo.png` listed before `/vault/b/foo.png`, clicks the pill and asserts `openFileInEditor('/vault/b/foo.png')`. With `vaultStore.path` dropped from the call the test fails (called with the suffix match); restored, it passes.
2. Fixed: the `buildKBPage` JSDoc documents `vaultRoot`.
3. No change, as the review says: same exact-file branch.

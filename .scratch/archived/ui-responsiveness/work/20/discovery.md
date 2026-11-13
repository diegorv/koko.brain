# Issue 20 discovery

No `spec.md` in the feature folder. Resolver: `src/lib/core/filesystem/wikilink-resolution.logic.ts`
(`resolveWikilink` / `resolveWikilinkCached`, optional `vaultRoot`, from Issue 17). Only
`src/lib/app/editor-host.ts:87` passes it today.

## Files that change

- `src/lib/plugins/queryjs/queryjs.logic.ts:107` `buildKBPage`: new optional `vaultRoot` (6th param), passed
  to `resolveWikilinkCached` at :134. `kb-api.ts:393` passes `this.vaultPath` (constructor field, no store).
- `src/lib/plugins/graph-view/graph-view.logic.ts:19` `buildGraphData(entries, vaultRoot?)`;
  `graph-view.service.ts:15` passes `vaultStore.path`.
- `src/lib/plugins/kanban/kanban.service.ts:73` passes `vaultStore.path` (a service may read stores).
- `src/lib/features/rail-shell/lens.logic.ts:310,319` pass `ctx.vaultPath` (already on `LensContext`).
- `src/lib/features/note-list/NoteRow.svelte:95` passes `vaultStore.path` (component imports the store).
- `src/lib/core/frontmatter/properties.logic.ts:733` `resolveRelationshipLinks`: new optional `vaultRoot`
  (4th param), forwarded to the injected resolver (its type gains the 3rd arg);
  `PropertiesView.svelte:61` passes `vaultStore.path`.

## Plan

One test per caller with `/vault/x/b/foo.png` listed before `/vault/b/foo.png`, `[[b/foo.png]]`
expected to resolve to `/vault/b/foo.png`; run each red, then thread the root through.

## Tests (prior art)

- queryjs: `src/tests/lib/plugins/queryjs/queryjs.logic.test.ts` (buildKBPage with cache) and
  `kb-api.test.ts` (KBAPI with `vaultPath`).
- graph: `graph-view.logic.test.ts`; kanban: `kanban.service.test.ts` `loadLinkedFileContent` (real fsStore + vaultStore).
- lens: `lens.logic.test.ts` (neighbourhood lens, outgoing + backlinks).
- NoteRow: `src/tests/lib/features/note-list/NoteRowMenu.test.ts` via `NoteRowMenuHarness` (pill click -> `openFileInEditor`).
- properties: `properties.logic.test.ts` `resolveRelationshipLinks` with the real `resolveWikilink`.

## Risks / defaults

- `vaultRoot` stays optional on the logic APIs (matches the resolver; avoids touching every test call).
  Risk: a future caller can still omit it; acceptable for P3.
- `buildKBPage`'s no-cache fallback (`resolveWikiLinkTarget`) is test-only and not a `resolveWikilink`
  caller; left unchanged.
- PropertiesView is not in the Issue's list but is the production caller of `resolveRelationshipLinks`, so it
  passes the root too. No `.logic.ts` file gains a store import.

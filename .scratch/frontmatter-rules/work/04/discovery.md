# Issue 04 discovery: `file.inFolder` takes a vault-relative folder

No `spec.md` in `.scratch/frontmatter-rules/`; the Issue is the spec.

## Files that change

- `src/lib/features/collection/expression/evaluator.ts:11-16` `EvalContext` gets `vaultPath?: string`; `:572-575` `inFolder` rewritten.
- `src/lib/features/collection/collection.logic.ts:128-133` `executeQuery(definition, view, index, vaultPath: string | null, rowSet?)`; `:162`, `:183` put it in the ctx.
- `src/lib/features/auto-move/auto-move.logic.ts:17-25` `findMatchingRule(rules, record, vaultPath: string, onError?)`.
- Callers: `auto-move.service.ts:159` (has `vaultPath` arg), `CollectionView.svelte:268` and `collection-block-widget.ts:123` (read `vaultStore.path`), `rail-shell/lens.logic.ts:809` `queryViewLens` passes `ctx.vaultPath`: its `ViewRowContext` (`lens.logic.ts:703`) already carries `vaultPath`, so `queryViewLens`'s callers (`RailNoteList.svelte:279`, `view-lens.service.ts:36`) need no change.
- Tests: every `executeQuery` / `findMatchingRule` call in `src/tests/` gets the new argument (type checker lists them): the file's `VAULT` constant where it has one, else `null`.
- Docs: `help/documentation/12-collection.md:326`, `:409-418`; `help/documentation/22-auto-move.md` folder examples; also `docs/agents/view-files.md:122`, `:352` and `help/examples/SCOPING.md:54`, which state the old behavior and would go wrong.

## Plan

1. Failing evaluator tests (`src/tests/lib/features/collection/expression/evaluator.test.ts`, next to the existing `file.inFolder()` case at `:493`): relative match with `vaultPath: '/v'`, sibling `/v/workshop` excluded, trailing slash and case, relative with no `vaultPath` is false and does not throw.
2. `inFolder`: absolute = arg starts with `/`; trim trailing `/`; relative resolves to `${vaultPath}/${arg}` (empty arg -> `vaultPath`), no `vaultPath` -> false; match `folder === target || folder.startsWith(target + '/')`, lowercased.
3. Thread `vaultPath` through `executeQuery` and `findMatchingRule`, fix callers. Collection query test in `collection-logic.test.ts` filters by a relative folder; one `findMatchingRule` test for a relative rule.
4. Docs.

## Prior-art tests

- `evaluator.test.ts:493` (`makeCtx({}, {}, { folder })`), `collection-logic.test.ts` (`baseDef({ filters })`, `makeIndex`), `auto-move.logic.test.ts`.

## Risks

- Absolute arguments no longer match sibling folders (intended, per Notes).
- `vaultPath` with a trailing `/` is not normalized: `vaultStore.path` has none.
- Widget cache (`collection-block-widget.ts`, Live Preview rule 2) is keyed by YAML + index version; a vault switch rebuilds the index, so no key change.

## Defaults taken

- `executeQuery` takes `string | null` (matches `vaultStore.path` and `LensContext.vaultPath`), placed before the optional `rowSet`. `findMatchingRule` takes `string` (its only caller always has one).
- Empty relative argument `inFolder("")` means the vault root (every vault note); before, it matched every note via `startsWith("")`.

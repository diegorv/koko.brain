VERDICT: APPROVED

Review of `git diff main...HEAD` (5168b3b05..5b70be2ac) against `.scratch/frontmatter-rules/issues/04-infolder-takes-vault-relative-folder.md`. There is no `.scratch/frontmatter-rules/spec.md`, so the Issue is the spec.

## Acceptance criteria

- [met] Failing test first, in the evaluator test file under `src/tests/lib/features/collection/expression/`: with `vaultPath: '/v'`, a note at `/v/work/topics/AWS/n.md` matches `file.inFolder("work/topics/AWS")` and `file.inFolder("work")`. It fails today. — `src/tests/lib/features/collection/expression/evaluator.test.ts:500-511` ("resolves a vault-relative folder against the vault path, subfolders included"). Probe: with `evaluator.ts` restored to `main`, this test fails along with the sibling and case tests (3 evaluator failures), then passes on HEAD. Commit order puts the tests in 43b2978f9 with the fix; the build report says they were run red first.
- [met] `file.inFolder("/v/work")` does not match `/v/workshop/n.md`, and does match `/v/work/n.md`. — `evaluator.test.ts:513-517`; `evaluator.ts:582-584` compares `folder === wanted || folder.startsWith(wanted + '/')`. Fails on main's `startsWith` (probe).
- [met] A trailing slash and different letter case still match. — `evaluator.test.ts:519-524` covers relative and absolute (`"work/topics/"`, `"WORK"`, `"/V/work/"`); `evaluator.ts:576` trims trailing `/`, `:582-583` lowercases both sides.
- [met] A relative argument with no `vaultPath` matches nothing and does not throw. — `evaluator.test.ts:526-531` (`not.toThrow()`, `false`, absolute still `true`); `evaluator.ts:580` returns `false` when `ctx.vaultPath === undefined`. Also at query level: `collection-logic.test.ts` "matches nothing for a relative folder when no vault is open" (`records` empty, no `filterError`) and `lens.logic.test.ts` (`vaultPath: null` gives `[]`).
- [met] A Collection query test passes a vault path through and filters by a relative folder. — `src/tests/lib/features/collection/collection-logic.test.ts` describe "file.inFolder with a vault-relative folder": global filter, view filter and formula through `executeQuery(..., '/vault')`, excluding `/vault/workshop`. Also end to end through the callers: `CollectionView.test.ts` and `collection-block-widget.test.ts` (reading `vaultStore.path`), `lens.logic.test.ts` (`ctx.vaultPath`), `auto-move.logic.test.ts` (`findMatchingRule` with `'/vault'`, sibling and other vault). The probe made the collection-logic and auto-move tests fail on main's evaluator too.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` run by this review: 0 errors, 0 warnings (228 files). The targeted vitest files listed below pass (exit 0, 104 files, 3433 passed, 53 skipped). The full suite is deliver's to run.

## Other checks

- Behavior item 1: `EvalContext.vaultPath?: string` (`evaluator.ts:16-17`). `executeQuery` takes a required `vaultPath: string | null` before the optional `rowSet` (`collection.logic.ts:132-138`) and puts it into both ctx sites (`:168`, `:189`). `findMatchingRule` takes a required `vaultPath: string` (`auto-move.logic.ts:20-24`). Logic files stay pure: the path comes from `vaultStore.path` in `CollectionView.svelte:273` and `collection-block-widget.ts:124`, from `ctx.vaultPath` in `queryViewLens` (`lens.logic.ts:809`, whose `LensContext` is filled from `vaultStore.path` in `RailNoteList.svelte:131,585` and `TypesNavigator.svelte:100`, so `countViewNotes` is covered), and from the service's own argument in `auto-move.service.ts:159`.
- Every caller is covered: `grep` of `src/lib` finds no other `EvalContext` construction and no other `executeQuery`/`findMatchingRule`/`evaluateFilter` entry point. `FilterRow.svelte` imports only `validateExpression`.
- Behavior item 3 (same engine): Collection views, view filters, formulas, inline blocks, rail lenses and Auto Move all go through the two changed entry points.
- Docs: `12-collection.md:326` row and `:409-433` section rewritten as asked, `22-auto-move.md:53-56` adds a `file.inFolder("Inbox")` example, and its anchor `#fileinfolder-takes-a-vault-relative-folder` matches the new heading. The `docs/agents/view-files.md:122,352` and `help/examples/SCOPING.md:53-56` edits are not scope creep: those lines stated the old behavior and would now be wrong.
- Layer rules: features importing `core/vault` is allowed. `layer-baseline.json` and `BASELINE_SIZE` are unchanged, and `src/tests/lib/architecture` passes.
- Live Preview rule 2: the widget still caches query data keyed by block + `collectionStore.version` and rebuilds the DOM per `toDOM()`. The vault path is not in the key, but `collectionCache.clear()` (`collection-block-widget.ts:69`) and the index rebuild on a vault switch cover that.
- Worktree clean after the mutation probe (`git status --short` empty).

Test files this verdict rests on (run by this review): `src/tests/lib/features/collection/` (incl. `expression/evaluator.test.ts`, `collection-logic.test.ts`, `CollectionView.test.ts`, `collection-block-widget.test.ts`, `collection.service.test.ts`, `portent-filters.test.ts`, `toolbar/filter-logic.test.ts`, `view-relationship-filters.test.ts`), `src/tests/lib/features/auto-move/`, `src/tests/lib/features/rail-shell/` (incl. `lens.logic.test.ts`), `src/tests/lib/features/type-definitions/`, `src/tests/help/`, `src/tests/lib/app/boot.test.ts`, `src/tests/lib/architecture/`.

## Findings

1. nit, `src/lib/features/collection/expression/evaluator.ts:581`: `vaultPath` is not normalized, so a vault path with a trailing `/` would make the target `/vault//work`, and a relative `inFolder` would match nothing. Today `vaultStore.open` gets paths without one (the discovery's Risks section notes it), while `lens.logic.ts:274` trims defensively. Fix if wanted: `ctx.vaultPath.replace(/\/+$/, '')` before joining. No change needed for this Issue.
2. nit, `src/tests/lib/features/collection/expression/evaluator.test.ts:526-531`: the "no vault path" test also passes on main's code (`'/v/work'.startsWith('work')` is false), so it guards the new no-throw branch but does not show a behavior change. That is expected for this criterion, and nothing needs fixing.

## Resolution

1. Not changed. The finding itself says no change is needed for this Issue: `vaultStore.open` (`src/lib/core/vault/vault.store.svelte.ts:81`) never receives a vault path with a trailing `/`, so the `//` case is unreachable today. Normalizing in the evaluator would guard a theoretical input only.
2. Not changed. The finding says nothing needs fixing: the test guards the no-throw branch, which is what the criterion asks.

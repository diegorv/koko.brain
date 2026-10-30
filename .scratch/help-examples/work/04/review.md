VERDICT: CHANGES_REQUESTED

# Review: Issue 04, scope collection-features examples

Reviewed `git diff main...HEAD` (11328217, 100d33c9, d1468223) in
`.claude/worktrees/help-examples-04-collection-features`.

## What I ran

- `vitest run src/tests/help/` (`src/tests/help/examples-scoping.test.ts`): 15/15 pass.
- `pnpm check`: 0 errors, 0 warnings.
- A throwaway probe (deleted, not committed) that ran every collection definition in the
  folder through both paths against an index of the folder's notes plus three outsider
  notes in `/vault/personal/` that carry every tag and property the examples filter on:
  - the raw definition (`executeQuery(definition, view, index)`), which is what the guard
    and the build step checked;
  - the path the app actually renders, `CollectionView.svelte:165-175`: the global and
    view filters are first round-tripped through
    `filterGroupsToFilter(parseFilterToGroups(...))`
    (`src/lib/features/collection/toolbar/filter.logic.ts`).
- A second throwaway probe (deleted) for the fix shape proposed in finding 1.

The test verdict rests on `src/tests/help/examples-scoping.test.ts` plus the two probes.

## Acceptance criteria

- [x] **No collection block or `.collection`/`.view` file in the folder reads notes outside
  it, or it is allowlisted with a reason.** Met for scoping. All 35 parsing views across 9
  `.collection` files and 8 notes return 0 outsider rows on both the raw path and the
  rendered path. The 4 blocks in `collection-edge-cases.md` (#3 to #6) fail to parse, so
  they render an error, not notes. The folder has no `.view` files and no `queryjs`
  blocks. The folder is its own vault case also works: `file.folder` is absolute on both
  the TS side (`collection.logic.ts:31-32`) and the Rust side
  (`src-tauri/src/commands/vault.rs:740-743`). `endsWith` is case-insensitive
  (`expression/evaluator.ts:331-335`).
- [x] **Allowlist entries for this folder removed.** Met. All 16 `collection-features/`
  entries are gone from `src/tests/help/examples-scoping.test.ts`. The stale-entry test
  and the "every site outside the allowlist" test both pass.
- [ ] **Keep each example's intent (Issue context: "keeping each example's intent").**
  Not met for 3 definitions. They now render zero rows in the app (finding 1).
- [x] **"Where an example only makes sense as its own vault, say so at the top of the
  note."** N/A. Every data note the examples need is in the folder.
- [x] **Replace help-vault-only data only when the example breaks without it.** Met. No
  data changed.

## Findings

1. **HIGH: wrapping `or:` / `not:` in `and:` makes three examples render empty in the
   app, and the toolbar can then write the broken filter back to disk.**
   - Where:
     - `help/examples/collection-features/sprint-board.collection:1-6`
     - `help/examples/collection-features/collection-filtros-avancados.md:47-53`
       (block 3, "Bugs & Tasks")
     - `help/examples/collection-features/collection-filtros-avancados.md:69-74`
       (block 4, "Work Items Only")
   - Cause:
     - `CollectionView.svelte:103` seeds the toolbar state with
       `parseFilterToGroups(definition.filters)`. It then runs the query with
       `filterGroupsToFilter(...)` of that state (`:165-175`), not with the YAML filter.
     - For a nested object inside `and:`, `filter.logic.ts:274-279` (`itemToRow`) produces
       a raw row whose text is `JSON.stringify(item)`. For example:
       `{"or":["file.hasTag('bug')","file.hasTag('task')"]}`.
     - That string is then parsed as an expression and never evaluates true
       (`evaluateFilterCached` / `evaluateFilter` catch, then false). So the whole `and:`
       is false for every note.
   - Probe results (raw path vs rendered path):

     | View | Raw rows | Rendered rows |
     |---|---|---|
     | Bugs & Tasks | 3 | 0 |
     | Work Items Only | 27 | 0 |
     | sprint-board "Active Sprint" | 2 | 0 |

   - Also, `persistState` (`CollectionView.svelte:179-189`) writes the same round-tripped
     filter back to the YAML on any toolbar change (sort, filter, columns). The
     JSON-string expression then becomes permanent in the file.
   - Regression: on `main`, the top-level `or:` and `not:` round-trip intact and these
     views worked. The build report's claim that it was "checked through the parser and
     evaluator" covers only the raw path. The commit's "inside the help vault the results
     are the same as before" is false for these three.
   - Fix: put the scope and the original operator side by side as sibling keys. Do not
     nest. `evaluateFilter` ANDs the keys (`collection.logic.ts`, `and` then `or` then
     `not`), and the toolbar maps each key to its own group:
     ```yaml
     filters:
       and:
         - 'file.folder.endsWith("/collection-features")'
       or:
         - "file.hasTag('bug')"
         - "file.hasTag('task')"
     ```
     The `not:` block works the same way (`and: [scope]` plus `not: [...]`).
   - Verified with the second probe: the rendered rows equal the raw rows, with no
     outsider notes. The guard's `hasPathFilter` accepts the form through its `and:`
     branch.
2. **MEDIUM: the guard cannot see finding 1.**
   - Where: `src/tests/help/examples-scoping.test.ts:191-213`
     (`hasPathFilter` / `unscopedCollectionViews`)
   - Problem: the guard classifies the raw parsed definition only. A nested filter object
     that the app cannot evaluate still passes as "scoped".
   - Fix:
     - Write a failing test first. In `findOffenders`, or as a separate `it`, flag any
       collection definition under `help/examples/` whose global or view filter has a
       filter object nested in a list. The test can detect this through `itemToRow`'s
       fallback: a row with `raw` starting with `{` after `parseFilterToGroups`.
     - Add a classifier case for it in the `findOffenders (classifier)` describe block.
     - This keeps the next folder issues (03, 06) from repeating the pattern.
3. **LOW: the nested-filter fallback is an app bug, outside this Issue's Touches.**
   - Where: `src/lib/features/collection/toolbar/filter.logic.ts:274-279`
   - Problem: any user collection with a nested `and`/`or`/`not` object silently renders
     zero rows in `CollectionView`. The same filter can also be rewritten into the YAML as
     a JSON-string expression.
   - Fix: do not fix it here. Record it as a gap in the closing commit and open a
     follow-up `.scratch` issue. The fix could be to evaluate nested objects or to keep
     them as structured raw items.
4. **LOW: inaccurate counts and claims in the record.**
   - Where: commit 100d33c9 body, and the discovery/implement comments in
     `.scratch/help-examples/issues/04-collection-features.md`
   - Problem: they say 15 allowlist entries were removed. `main` had 16 (`git show
     main:src/tests/help/examples-scoping.test.ts | grep -c "'collection-features/"`). The
     Behavior section also claims unchanged results in the help vault, which finding 1
     disproves.
   - Fix: state the correct count and behavior in the fix commit. Do not amend.

## Not findings (checked)

- Choosing `endsWith` over SCOPING.md's `contains` is sound for a folder without
  subfolders, and it avoids matching a sibling like `collection-features-old`. Leaving
  SCOPING.md unchanged is correct, since it is outside Touches.
- Scoping the views that only had a `limit:` (`calendar-recent-edits`,
  `recent-activity`, Top 3, Latest Bugs) is in scope. The limit capped rows but still
  ranked the whole vault.
- The English prose in `collection-todos-os-itens.md` follows CLAUDE.md's
  English-for-UI-text rule. The heading change matches the new behavior.
- The diff has no scope creep. It changes only files under
  `help/examples/collection-features/**` and the test allowlist that the Issue requires
  to shrink.

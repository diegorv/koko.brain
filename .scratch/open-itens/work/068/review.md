VERDICT: APPROVED

Review of `git diff main...HEAD` on `issue/068-desc-sort-nulls-last` (b24dfe9f6, 9e7e396b4, fae1e0d09, 484cf54aa).

## Acceptance criteria

- [met] Failing tests first, in `src/tests/lib/features/collection/collection-logic.test.ts` § `executeQuery edge cases`: — The three tests sit inside `describe('executeQuery edge cases')` (`collection-logic.test.ts:683`). The pinned test is renamed "sorts null values last in DESC order", asserts `['c.md', 'b.md', 'a.md']` over priorities `null`, `1`, `3`, and its "Known behavior" comment is gone. "keeps the highest values when a DESC sort is limited" uses `limit: 2`, `priority DESC` over `1`, `null`, `3`, `{}` (no key), `2` and asserts exactly `['c.md', 'e.md']`. "puts notes without the second sort key last within each first-level group" sorts `status ASC` then `priority DESC` and asserts `['c.md', 'e.md', 'd.md', 'b.md', 'a.md']`, so the no-priority note is last in both groups. Red probe run by me: with `collection.logic.ts` from `main` swapped in, the file gives 3 failed / 126 passed, all three new or rewritten tests failing, and "sorts null values last in ASC order" (`:684`, not touched by the diff) passing. With the branch code back in place (worktree clean again), 129/129 pass.
- [met] `help/documentation/12-collection.md` § Sort Panel gets the bullet "Notes that do not have the sorted property come last, in ascending and in descending order." § Result Limit (`:161`) gets the clause "notes without the sorted property come last, so a descending sort keeps the highest values". — Bullet added verbatim at `12-collection.md:82`. The clause is inserted verbatim into the Result Limit paragraph (`:162`), and the following "With no `sort`" sentence is split off correctly. `src/tests/help` passes.
- [met] `docs/agents/view-files.md`: remove the DESC item marked `(changes: open-itens/068)` (`:97`) and gotcha 14 (`:356`), and renumber the list. — The DESC paragraph and pitfall 14 are removed, and 15-20 are renumbered 14-19 in order with the text unchanged. `grep` finds no other `open-itens/068` marker in the file, and nothing in `.scratch/open-itens/issues`, `docs`, `src` or `help` cites pitfalls 14-20 by number.
- [met] If Issue 133 (Sort & limit section) has landed with the info line "With DESC, notes without the value come first", remove it. On 2026-11-12 it has not landed and no such line exists (`grep -rn "come first" src/lib help` finds nothing), so this is a check, not a change. — Re-ran `grep -rn "come first" src/lib help`. Its hits (block-band-click, lens.logic `_group`, rail-items `order`, the 25-types `_group` row, the mods cookbook) are unrelated to DESC sort. No line to remove. A wider grep for DESC near "first/without/null" in `docs/agents`, `help/documentation` and `src/lib` finds no stale statement.

## Findings

None.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/collection/collection-logic.test.ts`: exit 0, 129/129. Red probe with `main`'s `collection.logic.ts`: exit 1, 3 failed / 126 passed (the expected three).
- `pnpm vitest run` on every test file that mentions `executeQuery` or `DESC` (21 files: collection, rail-shell, type-definitions, mods, boot, help) plus `src/tests/help`: exit 0, 31 files, 1349/1349.
- The full suite was not run; deliver runs it.

## Correctness notes

- `compareForSort(a, b, descending)` (`collection.logic.ts:441`) returns 1/-1 for a single null before the direction is applied, and 0 for two nulls, so the loop falls through to the next sort level. Non-null values go through `compareValues` exactly as before, with the same order and negation. The comparator stays consistent (antisymmetric, and nulls form one equivalence class at the end), so `Array.prototype.sort` is well defined. A `-0` from negating 0 still satisfies `cmp !== 0 === false`, so ties still fall through.
- `executeQuery` is the only caller (`collection.logic.ts:204`). The other `compareValues` functions (`evaluator.ts:718`, `list-sort-compare.logic.ts:67`) are module-private, so they do not clash with the new one.
- `""` and `[]` are still non-null values, as the Issue scopes it. No parser or index change.
- Scope: the diff touches only the comparator, its test file, the two docs the Issue names, and the workflow's `discovery.md`. No layer-baseline or composition-root change.

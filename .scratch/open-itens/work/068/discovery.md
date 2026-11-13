# 068 discovery: DESC sort lists notes without a value last

## Files that change

- `src/lib/features/collection/collection.logic.ts:199-210` (`// 4. Sort` loop): pass `sortDef.direction === 'DESC'` into `compareForSort` and return `cmp` as is.
- `src/lib/features/collection/collection.logic.ts:438-457` (`compareForSort`): new `descending` parameter. The null block stays first and is not flipped; the typed comparison (Date, boolean, number, string, fallback) is negated when `descending`. Fix the JSDoc ("null/undefined always sort last" now true in both directions).
- `src/tests/lib/features/collection/collection-logic.test.ts:704-722` (§ `executeQuery edge cases`): rewrite the DESC test, add the `limit` and two-level tests.
- `help/documentation/12-collection.md:77-82` (§ Sort Panel bullet) and `:161` (§ Result Limit clause).
- `docs/agents/view-files.md:97` (DESC item) and `:356` (pitfall 14); renumber pitfalls 15-20 to 14-19.

## Plan

1. Test-first: rewrite "sorts null values first in DESC order (negation flips null placement)" to "sorts null values last in DESC order" (priority `null`, `1`, `3` -> `['c.md', 'b.md', 'a.md']`), add `limit: 2` + `priority DESC` over `1`, `null`, `3`, no key, `2` -> exactly the `3` and `2` records, add `status ASC` then `priority DESC` where the no-priority note comes last within its status. Run the file, see the rewritten and limit tests fail. Commit.
2. Change `compareForSort` and the loop. Run the file green. Commit.
3. Docs: help bullets, `view-files.md` item and pitfall removal with renumbering. Commit.
4. Issue 133 check: `grep -rn "come first" src/lib help` finds no DESC info line (verified at discovery), so no change.

## Prior-art tests

- `sorts null values last in ASC order` (`collection-logic.test.ts:684`) for record shape; `applies limit` (`:278`) for the `limit` view; `makeRecord`/`makeIndex` helpers (`:13`, `:37`).

## Risks

- `executeQuery` is the only caller of `compareForSort` (grep), so the signature change is local.
- Two nulls still return 0, so the next sort level breaks the tie; `""` and `[]` are non-null and keep today's order (the typed/String fallback, negated for DESC as before).
- Existing `.view` files sorted DESC reorder; intended per the Issue.
- Open Issues cite view-files pitfalls 9 and 11 only (grep for 15-20 finds nothing), so renumbering 15-20 breaks no Issue reference.

## Defaults taken

- Help wording uses the Issue's exact sentences.

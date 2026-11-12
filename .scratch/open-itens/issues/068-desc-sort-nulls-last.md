# 068: DESC sort lists notes without a value last

**Origin:** `view-engine-fixes` Issue 04, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-engine-fixes/`. Issue numbers in the text below are this folder's numbers; `priority-2026-11-08.md` in this folder maps them to the origin numbers.

**What to build:** `compareForSort` puts null last (`src/lib/features/collection/collection.logic.ts:438-457`), but the sort loop (`// 4. Sort`, `:199-210`) negates the result for DESC (`:206`), so DESC puts notes with no value first. The comment "null/undefined always sort last" (`:438`) is wrong for DESC. "Sort by priority DESC" opens with every note that has no priority, and the help's "Top 10 by priority" example with `limit` (`help/documentation/12-collection.md:161`) can return 10 notes with no priority, because the limit slices after the sort. The rail Sort menu writes the same `sort:` on a `.view` (`list-view-sort.logic.ts:28-46`), so "priority, descending" there hits it. The rail's own comparator for non-`.view` lists already puts missing values last in both directions (`list-sort-compare.logic.ts:29-38`).

- Handle nulls before the direction is applied, so they are last in both directions. Smallest change: `compareForSort(a, b, descending)` keeps its null block and applies the direction only to the typed comparison; the loop returns `cmp` as is. Two nulls still return 0, so the next sort level breaks the tie. No null-first option. Fix the comment.
- "Without a value" means `null` or `undefined`, as `compareForSort` already defines it: a missing key, a bare `key:` as Rust indexes it, a `file.*` column that does not exist and a formula that failed. `""` and `[]` are values and keep today's order. The TS edit path briefly holds a bare `key:` as `""` until the Rust record replaces it (`src-tauri/tests/fixtures/note-record-projection.json:2`); that is out of scope, so do not change the parsers or the index.
- Existing `.view` files sorted DESC on a property will reorder (notes without the value move from the top to the bottom). This is the intended change.

**Blocked by:** none

**Status:** ready-for-agent

**Answered:** owner, 2026-11-06: notes without the value sort last in both directions, and changing the pinned test is approved. Owner, 2026-11-12: 068 no longer waits for 067 and runs first in the views chain. Nothing open.

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first, in `src/tests/lib/features/collection/collection-logic.test.ts` § `executeQuery edge cases`:
  - Rewrite the test "sorts null values first in DESC order (negation flips null placement)" (owner-approved on 2026-11-06) into "sorts null values last in DESC order": records with priority `null`, `1`, `3` sorted `priority DESC` give `['c.md', 'b.md', 'a.md']`. Delete its "Known behavior" comment.
  - A `limit: 2`, `priority DESC` query over records with priorities `1`, `null`, `3`, no `priority` key, `2` returns exactly the records with `3` and `2`.
  - Two levels, `status ASC` then `priority DESC`: within one status, the note without `priority` comes after the ones with it.
  - Run the file and see the rewritten and `limit` tests fail with the null rows first before changing the code. The ASC test "sorts null values last in ASC order" stays green without edits.
- [ ] `help/documentation/12-collection.md` § Sort Panel gets the bullet "Notes that do not have the sorted property come last, in ascending and in descending order." § Result Limit (`:161`) gets the clause "notes without the sorted property come last, so a descending sort keeps the highest values".
- [ ] `docs/agents/view-files.md`: remove the DESC item marked `(changes: open-itens/068)` (`:97`) and gotcha 14 (`:356`), and renumber the list.
- [ ] If Issue 133 (Sort & limit section) has landed with the info line "With DESC, notes without the value come first", remove it. On 2026-11-12 it has not landed and no such line exists (`grep -rn "come first" src/lib help` finds nothing), so this is a check, not a change.

## Notes

- **Series:** the old blocker on 067 was only file overlap. 067 edits `getPropertyValue` in the same file and adds tests to the same test file; there is no logic dependency. After 067, `getPropertyValue` may return `undefined` for a missing key, and `compareForSort` already treats `undefined` as null (`collection.logic.ts:440-441`), so the two fixes compose. Views chain: `068 -> 009 -> 070 -> 010 -> 067 -> 012 -> 047` (047 is blocked by this Issue). Never run beside 010, 067 or 047, which edit `collection.logic.ts` or its test file.
- **Run before:** Issue 133, so 133 needs no DESC info line (133 drops it by itself once 068 has landed, `133-sort-and-limit-section.md:14`). relay-lite does not enforce this.
- **Blast radius:** `executeQuery` is the only caller of `compareForSort`. Its callers are the rail `.view` list (`lens.logic.ts:809`), the `.view` tab (`CollectionView.svelte:269`), inline blocks (`collection-block-widget.ts:124`) and mods (`mod-query.service.ts:45`, `:53`; `notes()` re-sorts by path, so mods see no change). Both row sets keep the query order for a view with a `sort:`. No other test expects nulls first in DESC: the other DESC tests and the e2e specs sort columns with no nulls.
- **Size:** S.

## Comments

- 2026-11-06, owner decision: notes without the value sort last in both directions; changing the pinned test "sorts null values first in DESC order (negation flips null placement)" in `collection-logic.test.ts` (at `:704-722` on 2026-11-12) is approved.
- 2026-11-12: deep dive (`research/deep-dive-2026-11-12/`, refute-068, critique H1). Dropped `Blocked by: 067` (file overlap only) and put 068 first in the views chain. Fixed the line numbers (the old `:640-659` pointed at `getPropertyValue` tests, not the sort test), named the comparator change, added the null-only scope note, a two-level sort case, concrete help wording and the `view-files.md` markers. Renamed "view-editor 05" to Issue 133.

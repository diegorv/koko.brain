# Refute: Issue 068, DESC sort lists notes without a value last

Checked at HEAD 318b6e9b5 (2026-11-12). `git diff 61558f7f6 HEAD` over `src/lib/features/collection`, `src/lib/features/rail-shell`, `src/tests/lib/features/collection` and `help/documentation/12-collection.md` is empty, so the dossier's HEAD and this one read the same code. Read-only; this file is the only write.

## Verdict

The bug is real and still present. The fix is small, pure and low risk. The Issue text has stale line numbers, one of which points at the wrong test, and it uses old feature numbering ("view-editor 05"). It also leaves out how blank and empty-string values behave, so the help sentence it asks for could be wrong. Run it after the edits below, as already queued (067 -> 068).

- Still present: yes.
- Impact for this owner: medium-low. It affects order only, with no data loss, and a filter works around it. When the view has a `limit`, the wrong notes are kept.
- Complexity: S. Risk: low.
- Recommendation: run-after-edits.

### Facts verified in code

- The sort loop negates the whole comparison for DESC, null placement included: `src/lib/features/collection/collection.logic.ts:199-210`, negation at `:206` (`return sortDef.direction === 'DESC' ? -cmp : cmp;`).
- `compareForSort` returns 1 for a null/undefined `a` and -1 for a null/undefined `b` (`collection.logic.ts:439-444`). So null comes last in ASC and first in DESC. Its doc comment at `:438` says "null/undefined always sort last", which is false for DESC.
- `limit` slices after the sort (`collection.logic.ts:215-218`). Both row sets keep the query order when the view has a `sort:` and apply `limit` themselves. `viewRowSet` does this through `resolveViewListSort`, which returns null for a view with a sort (`src/lib/features/type-definitions/type-note-list.logic.ts:105-107`), and `getNotesForViewPaths(..., null)`, which keeps the input order (`src/lib/features/type-definitions/type-sidebar.logic.ts:134-141`). The limit itself is applied at `src/lib/features/rail-shell/lens.logic.ts:717-734`. `blockRowSet` is at `lens.logic.ts:749+`. So "Top N by X DESC" keeps null rows in the rail `.view` list, the `.view` editor and inline blocks.
- `executeQuery` is the only caller of `compareForSort` (`collection.logic.ts:204`). The callers of `executeQuery` are `lens.logic.ts:809`, `CollectionView.svelte:269`, `collection-block-widget.ts:124` and `plugins/mods/mod-query.service.ts:45,53`. `mod-query` `notes()` re-sorts by path afterwards (`mod-query.service.ts:57`), so mods are unaffected. No other collection sort exists (`grep "\.sort(" src/lib/features/collection`).
- Reachable from the daily UI: the rail Sort menu offers `status` and every property as options (`src/lib/features/rail-shell/RailSortMenu.svelte:46`), and on a `.view` it writes `sort:` (`list-view-sort.logic.ts:28-46`). Picking "status, descending" or "priority, descending" on a `.view` puts the notes without that key at the top.
- The rail's own comparator for non-`.view` lists already puts missing values last in both directions: `src/lib/features/rail-shell/list-sort-compare.logic.ts:29-38` ("A missing value sorts last whichever way the list runs"). Its `isMissing` also counts `''` and `[]` as missing. The fix brings the `.view` engine in line with that rule for null/undefined.
- The test that pins today's behavior is `src/tests/lib/features/collection/collection-logic.test.ts:704-722`, "sorts null values first in DESC order (negation flips null placement)". Its ASC twin is at `:684-702`. The Issue's `:640-659` are `getPropertyValue` tests (`returns file.mtime as Date`, `returns null for unknown file.* property`, ...), not the sort test.
- No other test depends on nulls coming first in DESC. Every other DESC test sorts columns with no nulls: `collection-logic.test.ts:239, 262-276, 284-296, 395`, `lens.logic.test.ts:1372` (rank 1/3/2), `type-note-list.logic.test.ts:484` (rank 1/3/2), `RailNoteList.view.test.ts:368` (filter `status == 'open'`, so status is never null), `collection-block-row-rule.test.ts:111`, and both e2e specs (`file.basename`, never null).
- No ADR, `docs/` file or help page describes where nulls sort. The help has no sentence to correct, only text to add: `help/documentation/12-collection.md:77-83` (Sort Panel) and `:161` (Result Limit, "Top 10 by priority"). The examples at `:460` and `:466` ("priority descending", "rating descending") currently list notes without the value first.
- Criterion 3 is moot today. No "come first" info line exists in `src/lib` or `help/`. The line is only planned, in `.scratch/open-itens/issues/133-sort-and-limit-section.md:14`. That Issue is `todo` (`ledger.md:149`), belongs to the deferred chain 131-144, and words its condition so it drops the line once 068 has landed.
- Neither live-preview nor indexing rules apply. The change is a pure function in `collection.logic.ts`, and the index, watcher and CodeMirror widgets are untouched.

### Facts that the Issue and dossier both miss: blank and empty values

- On a full rebuild and on Rust deltas, a bare `priority:` is JSON `null`. On the TS edit fast path it is `""`. `convertToProperty` maps null to `''` (`src/lib/core/frontmatter/properties.logic.ts:194-196`), and `updateNoteInIndex` writes that record while the user types and on save (`src/lib/features/collection/collection.service.ts:152-161`). The golden fixture states the divergence outright: "the two parsers start from different values (null vs \"\")" (`src-tauri/tests/fixtures/note-record-projection.json:2`). `fromV2` keeps Rust's null as null (`collection.service.ts:44-47`).
- So a fix that handles only null/undefined puts a bare key last in steady state, after the Rust record replaces the TS one. That last step is inference from the comments at `collection.service.ts:141-150`. During an edit, the same note briefly holds `""`. Against a number, `compareForSort("", 3)` falls through to `String(a).localeCompare(String(b))` (`collection.logic.ts:456`), which gives -1. That puts `""` first in ASC, then after the values and before the nulls in DESC. Both before and after the fix, the glitch is rare, visible and recoverable. An explicit `priority: ""` (a string on both paths) and an empty list keep the same order.
- This does not block the fix. It does mean the help sentence must not promise more than the code does, and the Issue should say what is out of scope so the agent neither guesses nor widens it.

## Must-fix edits to the Issue text

1. Replace the "What to build" paragraph's code citations, because the line numbers are stale.

   Replace:
   > `compareForSort` puts null last (`src/lib/features/collection/collection.logic.ts:426-434`), but the sort loop negates the result for DESC (`:193-205`)

   With:
   > `compareForSort` puts null last (`src/lib/features/collection/collection.logic.ts:438-457`), but the sort loop negates the result for DESC (`:199-210`, the negation at `:206`)

   Evidence: `collection.logic.ts:438-457` and `:199-210` at HEAD 318b6e9b5. Issue 067 edits the same file first (`getPropertyValue`, `:418-436`), so the agent should find these by name (`compareForSort`, `// 4. Sort`).

2. Replace acceptance criterion 1. Its line range points at `getPropertyValue` tests, and the owner's Comment cites the same wrong lines.

   Replace:
   > - [ ] Failing test first: `collection-logic.test.ts:640-659` asserts nulls last for DESC (owner-approved on 2026-11-06), plus a `limit: 2` DESC case that returns the two highest values.

   With:
   > - [ ] Failing tests first, in `src/tests/lib/features/collection/collection-logic.test.ts` § `executeQuery edge cases`:
   >   - Rewrite the test "sorts null values first in DESC order (negation flips null placement)" (owner-approved on 2026-11-06) into "sorts null values last in DESC order": records with priority `null`, `1`, `3` sorted `priority DESC` give `['c.md', 'b.md', 'a.md']`. Delete its "Known behavior" comment.
   >   - A `limit: 2`, `priority DESC` query over records with priorities `1`, `null`, `3`, no `priority` key, `2` returns exactly the records with `3` and `2`.
   >   - Two levels, `status ASC` then `priority DESC`: within one status, the note without `priority` comes after the ones with it.
   >   - Run the file and see the rewritten and `limit` tests fail with the null rows first before changing the code. The existing ASC test "sorts null values last in ASC order" must stay green without edits.

   Evidence: the pinned test is at `collection-logic.test.ts:704-722`, and `:640-659` holds `getPropertyValue` tests. Today the `limit` case returns the two null records, because the slice at `collection.logic.ts:217` runs after the null-first DESC sort. The multi-column case goes through the same negation at `:206`.

3. Replace the owner Comment's line citation so it no longer points at the wrong test. Keep the decision text.

   Replace:
   > changing the pinned test `collection-logic.test.ts:640-659` is approved.

   With:
   > changing the pinned test "sorts null values first in DESC order (negation flips null placement)" in `collection-logic.test.ts` (at `:704-722` on 2026-11-12) is approved.

4. Replace the old feature numbering in criterion 3 and in Notes.

   Replace criterion 3:
   > - [ ] If view-editor 05 already landed with an info line "With DESC, notes without the value come first", remove it.

   With:
   > - [ ] If Issue 133 (Sort & limit section) has landed with the info line "With DESC, notes without the value come first", remove it. On 2026-11-12 it has not landed and no such line exists (`grep -rn "come first" src/lib help` finds nothing), so this is a check, not a change.

   Replace the Notes bullet:
   > - **Run before (other feature):** view-editor 05, so 05 needs no DESC info line. relay-lite does not enforce this.

   With:
   > - **Run before:** Issue 133, so 133 needs no DESC info line (133 drops it by itself once 068 has landed, `133-sort-and-limit-section.md:14`). relay-lite does not enforce this.

   Evidence: `priority-2026-11-08.md:344` maps view-editor 05 to 133. A fresh agent would have to look that mapping up.

5. Add the scope boundary under "What to build", so the help sentence stays true and the agent does not widen the fix.

   Add after "Handle nulls before the direction is applied, so they are last in both directions. Fix the comment.":
   > - "Without a value" means `null` or `undefined`, as `compareForSort` already defines it. That covers a missing key, a bare `key:` as Rust indexes it, a `file.*` column that does not exist and a formula that failed. `""` and `[]` are values and keep today's order. The TS edit path briefly holds a bare `key:` as `""` until the Rust record replaces it (`src-tauri/tests/fixtures/note-record-projection.json:2`). That is out of scope, so do not change the parsers or the index.
   > - Existing `.view` files sorted DESC on a property will reorder (notes without the value move from the top to the bottom). This is the intended change.

## Should-fix edits

1. Make the help criterion concrete. Replace:
   > - [ ] `help/documentation/12-collection.md` § Sort Panel: notes without the value come last.

   With:
   > - [ ] `help/documentation/12-collection.md` § Sort Panel gets the bullet "Notes that do not have the sorted property come last, in ascending and in descending order." § Result Limit (`:161`) gets the clause "notes without the sorted property come last, so a descending sort keeps the highest values".

   Reason: the agent should not have to invent the wording. "Do not have the property" matches the null-only scope; "empty" would over-promise for `""` (see the facts above).

2. Name the comparator change, so two agents would make the same change. Add to "What to build":
   > - Smallest change: `compareForSort(a, b, descending)` keeps its null block and applies the direction only to the typed comparison; the loop returns `cmp` as is. Two nulls still return 0, so the next sort level breaks the tie. No null-first option.

   Reason: there is a second valid shape (checking nulls inside the loop), and naming one keeps the diff minimal and keeps the tie-break behavior explicit.

3. Keep `Blocked by: 067`, but say why. Add to Notes:
   > - The blocker is only file overlap: 067 edits `getPropertyValue` in the same file and adds tests to the same test file. There is no logic dependency. If 067 stalls on 010, 068 can go first.

   Evidence: 067's scope is `getPropertyValue` resolution (`067-columns-resolve-like-expressions.md:5-8`), and 068 touches `:199-210` and `:438-457`. After 067, `getPropertyValue` reads through the evaluator, which may return `undefined` for a missing key. `compareForSort` already treats `undefined` as null (`collection.logic.ts:440-441`), so the two fixes compose.

4. Gate line: fine as written (frontend only; no `package.json` change, so no `pnpm build`). The `fix:` commit carries test changes, so the commit-msg hook is satisfied.

## Dossier errors

- HEAD: the dossier says 61558f7f6. HEAD is now 318b6e9b5, but none of the relevant files changed in between, so its line numbers still hold.
- It suggests a "DESC on a `Date` column (`file.mtime`-like via frontmatter date)" null test. Frontmatter dates are strings in the record (`properties.logic.ts:198-200` returns `str`), not `Date`. The only `Date` columns, `file.ctime` and `file.mtime`, are never null (`collection.logic.ts:425-426`). That test would not exercise a null `Date`, and the agent can drop it. A string-column DESC case is enough.
- It treats "null" as covering "an empty `priority:`" (§1, bullet 3). That holds only on the Rust path. The TS edit path stores `""` (`properties.logic.ts:194-196`). The dossier never mentions the null-vs-`""` divergence, and its proposed help sentence ("Notes without a value ... come last") is only safe with the scope note above.
- It cites `blockRowSet` at `lens.logic.ts:739-748`. That range is the function's doc comment; the function is at `:749`. It cites `getPropertyValue` at `:433-436`; the function is at `:418-436`. Both are minor.
- It misses that `list-sort-compare.logic.ts:29-38` already applies "missing last in both directions" to the rail's non-`.view` lists. That precedent supports the owner decision and shows the scope gap (`''` and `[]`).
- Its remark about the "small issues merge directly" policy and an optional pre-commit review does not apply. A relay-lite run has its own review and deliver steps.
- Otherwise correct: the bug mechanism, the callers, the fact that the rail keeps the query order, that only one test pins the behavior, that criterion 3 is moot, and the S size.

## Not verified

- How often the owner actually sorts a `.view` DESC on a property that some notes lack. Their vault is outside the repo and was not read.
- No test was run (read-only task). "The rewritten and `limit` tests fail today" is derived from the code path, not observed.

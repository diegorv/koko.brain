# Dossier: Issue 068, DESC sort lists notes without a value last

Checked at HEAD 61558f7f6 (2026-11-12). Read-only research; nothing else was edited.

## 1. Still present?

Verdict: the bug exists exactly as described. Only the line numbers in the Issue moved. No commit fixed it: the last touch of the sort code was `179cca328`, `107bcf35a`, `262a62b6f` (filter work), and `git log -S"-cmp : cmp"` shows the negation dates from the initial commit `b7358e712`.

Facts verified in code:

- `compareForSort(a, b)` returns 1 when `a` is null/undefined and -1 when only `b` is, so null sorts last in ASC. `src/lib/features/collection/collection.logic.ts:438-457` (the Issue says 426-434). Its doc comment, line 438, says "null/undefined always sort last", which is false for DESC.
- The sort loop `collection.logic.ts:199-210` (Issue says 193-205) does `return sortDef.direction === 'DESC' ? -cmp : cmp;` at line 206. The negation flips the null placement, so DESC puts null first.
- `getPropertyValue` returns `record.properties.get(column) ?? null` (`collection.logic.ts:433-436`), so a missing key, an empty `priority:` and an unknown `file.*` column are all null.
- The test that pins the wrong behavior is `src/tests/lib/features/collection/collection-logic.test.ts:704-722` ("sorts null values first in DESC order (negation flips null placement)"). The Issue says 640-659; stale. The ASC twin is at 684-702.
- Help: `help/documentation/12-collection.md:161` still has the "Top 10 by priority" limit example; `§ Sort Panel` (lines 77-83) says nothing about missing values. Sort entries are documented at line 213.
- Acceptance criterion 3 (remove a "notes without the value come first" info line) is moot: no such line exists in `src/lib` or `help/` (grep found none). The line is planned by Issue 133 (`issues/133-sort-and-limit-section.md:14`), which has not landed and is conditioned on 068.

### Who runs this sort (blast radius)

`executeQuery` is the only sort. Callers: `src/lib/features/rail-shell/lens.logic.ts:809` (rail `.view` list), `src/lib/features/collection/CollectionView.svelte:269` (the `.view` editor), `src/lib/features/collection/collection-block-widget.ts:124` (inline ` ```collection ` block), `src/lib/plugins/mods/mod-query.service.ts:45,53` (mods).

The rail does not re-sort a view that has a `sort:`. `resolveViewListSort` returns null for a view with a sort (`src/lib/features/type-definitions/type-note-list.logic.ts:105-107`), and `getNotesForViewPaths(..., null)` keeps the query order (`type-sidebar.logic.ts:128-141`), including the limit slice in `viewRowSet` (`lens.logic.ts:717-734`). So fixing `executeQuery` fixes the rail, the editor, blocks and mods in one place. `blockRowSet` also keeps the query order (`lens.logic.ts:739-748`).

Inference: `file.mtime`, `file.ctime`, `file.name`, `file.basename`, `file.size`, `file.path` are never null, so the common sorts (modified DESC, title DESC) are unaffected. Only frontmatter or formula columns that some notes lack are hit.

## 2. Impact for this owner

- Trigger: a `.view` (rail or editor) or inline block with `sort: <frontmatter key> DESC` where some notes lack the key (priority, due, rating, status, a formula). The rail Sort dropdown writes the same `sort:` (`list-view-sort.logic.ts`), so choosing "priority, descending" on a rail view hits it.
- Frequency: moderate. The owner uses `.view` rail views daily and DESC on a property is the natural "highest priority first" / "latest due first" order. Any type where not every note has the key shows the symptom. Inference, not measured.
- Severity: wrong order, not data loss. The top of the list is filled with noise; with `limit`, the kept rows are wrong ("Top 10 by priority" can show 10 notes with no priority, so the best notes are silently cut). No file is written, and the owner can work around it by adding a filter such as `priority != null`.
- Rank: low-to-medium. The workaround exists, nothing is corrupted, and it is a `.view` bug (bugs-only area for the owner). It earns its slot because the fix is tiny and pure.

## 3. Complexity and risk

- Size: S (about 10 lines of logic, one test rewritten, three or four tests added, one docs paragraph).
- Files: `src/lib/features/collection/collection.logic.ts` (sort loop at 199-210, `compareForSort` at 438), `src/tests/lib/features/collection/collection-logic.test.ts`, `help/documentation/12-collection.md`.
- Centrality: `executeQuery` is the shared view engine (rail, editor, blocks, mods), but the change is a pure function with no store, no Tauri call, no CodeMirror. Not a core write path.
- What could regress: (a) any test that expects null-first DESC. Only the pinned test at 704-722 does; the multi-column test (262-276), the row-set test (284-296, priorities 5/4/1 with no nulls) and the other DESC tests (`file.ctime` line 395, rail tests with `file.basename`) use non-null values. (b) Multi-column sorts: a null in column 1 must still tie-break on column 2 only when both are null (unchanged). (c) User-visible: existing `.view` files with `priority DESC` will reorder (null notes move from top to bottom). That is the owner-approved intent (Issue comment 2026-11-06).
- Out of scope, noted: an empty string `""`, `NaN`, and non-null values of mixed types are not null and keep today's behavior.

## 4. Implementation plan (test-first)

Assumption (one line): "null" means `null`/`undefined` as `compareForSort` already defines it. No new treatment of empty strings.

1. Rewrite the pinned test (owner-approved) to the new contract and see it fail.
   - In `collection-logic.test.ts` describe `executeQuery edge cases` (line 704): rename to "sorts null values last in DESC order", expect `['c.md', 'b.md', 'a.md']` (priority 3, 1, null).
   - Add new tests next to it:
     - `limit: 2` with `priority DESC` over records with priorities 1, null, 3, null, 2: result is exactly the two highest (`3`, `2`), not the nulls. This is the case that proves the limit bug.
     - Two sort levels, `status ASC` then `priority DESC`: within a status, null priority is last; a null `status` is last for the ASC level (unchanged).
     - DESC on a `Date` column (`file.mtime`-like via frontmatter date) and on a string column: nulls last.
     - All-null column: order is unchanged (stable), no throw.
   - Run `pnpm vitest run src/tests/lib/features/collection/collection-logic.test.ts` and confirm the rewritten and `limit` tests fail for the right reason (null first).
2. Fix. Smallest change: give `compareForSort` a `descending` flag and handle null before the direction:
   - `compareForSort(a, b, descending)`: keep the null block as is (null last whatever the direction), then compute the typed comparison into `cmp` and `return descending ? -cmp : cmp`.
   - The loop becomes `const cmp = compareForSort(aVal, bVal, sortDef.direction === 'DESC'); if (cmp !== 0) return cmp;`.
   - Fix the doc comment: "null/undefined sort last in both directions; the direction applies to the other values". Also update the "Known behavior" comment in the test.
   - Do not add a second helper or a null-first option (no requested flexibility).
3. Docs: add one bullet to `help/documentation/12-collection.md` § Sort Panel (line 81 area): "Notes without a value for the column come last, in ascending and descending order." Optionally one clause at line 161 ("set a `sort`...; notes without the sorted value come last, so DESC keeps the highest values").
4. Verify (frontend gate): `pnpm check` and `pnpm vitest run` (CLAUDE.md rule 6; docs and logic only, no Rust). Pre-commit: `git diff --cached --stat`; one `fix:` commit with the full-detail format. A `fix:` commit needs a test file change, satisfied by step 1. Pre-commit adversarial review is optional per the "small issues merge directly" policy; the diff is tiny and pure.

Could the test pass while the bug stays? The `limit` test goes through the real `executeQuery` with real index records (no mocks), so no. A rail-level test (`lens.logic.test.ts` `queryViewLens` with `priority DESC` and a null note, near line 1366) is a cheap optional addition to prove the rail order follows `executeQuery`; skip unless cheap.

### Acceptance criteria review

- Criterion 1 ("`collection-logic.test.ts:640-659` asserts nulls last for DESC"): wrong location (now 704-722) and worded as if the test already exists; it must be rewritten from null-first to null-last. The `limit: 2` clause is good and testable.
- Criterion 2 (docs § Sort Panel): fine and testable by reading.
- Criterion 3 (remove an info line): moot at HEAD, nothing to remove. Re-grep `come first` before merging in case 133 lands first.
- Missing: multi-column case, Date and string DESC, and a note that existing `.view` files will reorder (intended).
- The Issue text cites `:426-434` and `:193-205`; use `:438-457` and `:199-210`.

## 5. Run order

- Blocker per ledger: 067 (`ledger.md:105`; 067 is itself blocked by 010). Inference: there is no logic dependency. 067 changes `getPropertyValue` key resolution (`collection.logic.ts:421-437`); 068 changes the sort loop (199-210) and `compareForSort` (438+), neighbouring hunks in the same file. The blocker only avoids a merge conflict and the shared-hot-code series rule. In the queue `067 -> 068` is already the order, so keep it.
- Series group: "`RailNoteList` / `lens.logic.ts` / `CollectionView.svelte`" (`priority-2026-11-08.md:63`): VE-04 (068) before VD-05 (133). 068 itself edits none of the three hot files (only `collection.logic.ts` plus tests and docs), so it can run beside non-view Issues; it must not run beside another Issue editing `collection.logic.ts` (067, 010 touch it).
- Shares files with queue Issues: `collection.logic.ts` with 067 and 010; `collection-logic.test.ts` with 067 and 010; `help/documentation/12-collection.md` with any docs touch (141, 228 are deferred).
- Unblocks: 133 (drops its DESC info line), and indirectly 141 (`ledger.md:157` lists 068).
- Suggested slot: right after 067 as already queued. If 067 stalls on 010, 068 can safely go first (no code dependency); rebase conflicts will be trivial.

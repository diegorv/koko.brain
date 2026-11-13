# Dossier: Issue 067, Columns and sort keys resolve like expressions

Written 2026-11-12 against HEAD 115d8d576. Read-only research; nothing run. Facts are verified in code unless marked "inference".

## 1. Still present?

Verdict: present exactly as described. No commit has touched the claimed lines since the Issue was written; only line numbers moved (a few lines down in `collection.logic.ts` and `evaluator.ts`).

Verified claims (HEAD line numbers):

| Issue claim | Cited | At HEAD | Holds |
|---|---|---|---|
| `getPropertyValue` resolves only `file.name/basename/path/folder/ext/size/ctime/mtime`, `formula.<name>`, exact key | `collection.logic.ts:406-424` | `src/lib/features/collection/collection.logic.ts:418-436` | yes. `file.*` default returns null (`:429`). The `formula.`/`note.`/`property.` branch (`:432-434`) is a literal-key lookup identical to the fallthrough (`:435`), so `note.status` reads a key literally named `note.status` and gets null |
| `formula.<name>` works | same | works only because `executeQuery` step 3 stores computed values as `formula.<name>` in a cloned `properties` map (`collection.logic.ts:176-193`). `getPropertyValue` itself does no formula work | yes, with that caveat |
| Evaluator resolves `file.tags`, `file.properties`, `note.`/`property.` | `evaluator.ts:193-212` | `evaluator.ts:195-216` (`resolveFileProperty`, `tags` at `:206`, `properties` at `:207-213`), `resolveMember` `note`/`property` case at `:170-172` | yes |
| Only `type` is aliased in filters | `evaluator.ts:93-95` | `evaluator.ts:95-97` (`IDENTIFIER_ALIASES = { type: '_type' }`), `canonicalPropertyName` `:100-102` | yes. Both are module-private (not exported) |
| Why not `canonicalizeKey` | `frontmatter-aliases.ts:9-11` | `src/lib/utils/frontmatter-aliases.ts:9-11` maps `organized`, `archived`, `favorite` to `_` keys, plus `order`, `sort`, `icon`, `color` and more | yes. Record holds `organized/archived/favorite` as always-present projected flags (`collection.logic.ts:63-65`) |
| Help lists `file.tags` | `12-collection.md:316-325` | `help/documentation/12-collection.md:305-325`, table rows `file.tags` and `file.properties` present | yes |
| Inline block loses `file.basename` | `collection-block-widget.ts:492-506` | `collection-block-widget.ts:493-506`: private `getCellValue` has a `file.*` switch with name/path/folder/ext/size/ctime/mtime and no `file.basename`, so it returns null | yes. It is a second copy of `getPropertyValue`, already drifted |

Callers of `getPropertyValue` (all non-test code):
- `collection.logic.ts:202-203`: `executeQuery` sort step (step 4).
- `CollectionTableView.svelte:60`: `.view` tab table cell.
- `calendar.logic.ts:69`: date property of a calendar.
- `linear-calendar.logic.ts:154` and `:273`: color property.

The inline block does not call it; it uses its own `getCellValue` (`collection-block-widget.ts:456`, `:493`). The rail list never renders columns; it consumes only the row order, which for a view with its own `sort:` is the `executeQuery` order (`lens.logic.ts` `viewRowSet` doc: "the view's own sort keeps the query order"). So the sort half of the bug reaches the rail through step 4 too.

Existing test that pins the bug: `src/tests/lib/features/collection/collection-logic.test.ts:~665-675` ("returns note.* prefixed properties") asserts `getPropertyValue(record, 'note.status')` is null and a literal `note.status` map key returns 'done'. It encodes the current wrong behavior and must be rewritten (see section 4).

## 2. Impact for this owner

- Trigger: a collection `table` view (the `.view` tab or an inline ` ```collection ` block) with a column or `sort:` key spelled `file.tags`, `file.properties`, `note.x`, `property.x` or `type`. Also any inline block with a `file.basename` column.
- Frequency (inference): low to moderate. The owner's daily surface is the rail list (which shows no columns, and `.view` rail is "bugs only"), markdown tables, Quick Capture, meta-bind, Kanban, canvas. Table columns appear only in the `.view` table tab and inline collection blocks. `type` sort and `file.tags` column are the natural things to write, and the help doc advertises `file.tags`, so a view that follows the docs hits it. Not on the core edit/save path.
- Severity: wrong display (a Tags column of dashes) and a silently ignored sort key. No data loss, no write path, no crash. Wrong data in the sense of "looks empty", not corrupted.
- Rank: annoyance-to-broken-feature for a rarely-used surface. Cheap fix, so the queue slot (after 070, with 068) is reasonable, but it is not urgent.

## 3. Complexity and risk

Size: S (the Issue says S-M; the fix is about 20 lines of source in 3 files plus tests).

Files and functions:
- `src/lib/features/collection/expression/evaluator.ts`: export `resolveFileProperty` (`:196`) and `canonicalPropertyName` (`:100`). Pure functions, no signature change. Evaluator is central to all filters and formulas, but only `export` keywords change.
- `src/lib/features/collection/collection.logic.ts`: rewrite `getPropertyValue` (`:418-436`). Reads: sort step, table view, two calendar logics. Import list gains the two evaluator exports (`collection.logic.ts` already imports from `./expression/evaluator`, `:10`; no circular risk since evaluator only imports the `PropertyIndexRecord` type from `../collection.types`, `evaluator.ts:3`).
- `src/lib/features/collection/collection-block-widget.ts`: delete private `getCellValue` (`:492-506`) and call `getPropertyValue` (import from `collection.logic.js`, `:4` already imports `executeQuery, formatCellValue`). This is a CodeMirror live-preview widget file, so `docs/agents/live-preview-rules.md` applies (rules 2 and 11: cache query data and rebuild DOM per `toDOM()`, mousedown stopPropagation). The change is inside `buildCollectionTable`'s cell value lookup only, so it does not touch caching, `eq()` or listeners. Low risk.
- No changes to `CollectionTableView.svelte`, `calendar.logic.ts`, `linear-calendar.logic.ts`, `lens.logic.ts`, stores or Rust.

What could regress:
1. `type` alias: `getPropertyValue(r, 'type')` starts reading `_type`. Any calendar color property or column named `type` changes from "whatever literal `type` key exists" to `_type`. The parser already stores `type:` frontmatter under `_type` (inference; frontmatter-aliases canonicalizes on parse), so a literal `type` key should not exist in practice. Verify with a grep for `'type'` fixtures in calendar tests before merging.
2. `file.tags` returns `[]` when the key is absent (evaluator `?? []`), where the table cell then renders an empty string rather than the dash that a null renders (`CollectionTableView.svelte:63`; block uses `cm-lp-collection-null` only for null/undefined). Records always carry `tags` (`collection.logic.ts:69`, Rust projection), so this only appears for hand-built records. Cosmetic, decide in the test.
3. `file.properties` as a column returns an object; `formatCellValue` (`:393-414`) stringifies it as `[object Object]`, and sort uses `String(a)`. The Issue lists `file.properties` as unresolved but its tests do not cover it. Do not promise a useful display; either leave it or out of scope (see section 4).
4. Keep `archived/organized/favorite` un-aliased. Using `canonicalizeKey` here would break them; the plan uses only `canonicalPropertyName`.
5. Rail or `.view` sorts that name a key like `status` or `property:foo` go through `sortDefToListSort`; no change for plain keys.
6. Sort stability for rows where an alias now resolves to values (previously all null, so order unchanged); expected and desired.

Shared-code note: the Issue asks for shared code, not a copy. The widget's `getCellValue` is exactly the kind of copy that drifted; deleting it removes one more source of drift.

## 4. Implementation plan (fresh agent, one context, test-first)

Assumption to state before coding: queue position puts 067 before its listed blocker 010 (see section 5). Only a file overlap, so proceeding is safe if nothing runs in parallel.

1. Read `docs/TESTING.md` section Task Completion Gate and `docs/agents/live-preview-rules.md` (widget file). Check `git status` clean, work in a worktree per user rules.
2. Failing tests first (run them, see red):
   - `src/tests/lib/features/collection/collection-logic.test.ts`, in `describe('getPropertyValue')` (`:611`):
     - `file.tags` returns the record's `tags` array (`makeRecord(..., { tags: ['a','b'] })`).
     - `note.status` and `property.status` read the `status` key.
     - `type` reads `_type`; `note.type` reads `_type` too.
     - `archived` on a record built without `_archived` is `false` (use `buildNoteRecord` so the projection supplies the flag; this proves no `canonicalizeKey` regression).
     - Replace the existing "returns note.* prefixed properties" and "returns property.* prefixed properties" cases (`~:665-683`): they pin the literal-key behavior. Reason to record in the commit: they assert the bug. Keep the `formula.doubled` case as is.
   - `describe('executeQuery')` in the same file: a view with `sort: [{ column: 'type', direction: 'ASC' }]` over records with `_type` 'B', 'A' orders A before B (today it does nothing and keeps input order, so use an input order that is not already sorted).
   - `src/tests/lib/features/collection/collection-block-widget.test.ts` in `describe('buildCollectionTable')` (`:43`): a `file.basename` column renders the text `note` (`record()` helper at `:29` already has `basename: 'note'`). Also add a `file.tags` cell test rendering "a, b" through the real table builder.
3. Source changes:
   - `evaluator.ts`: add `export` to `resolveFileProperty` and `canonicalPropertyName`, with JSDoc lines noting `getPropertyValue` reuses them.
   - `collection.logic.ts` `getPropertyValue`: `file.` prefix returns `resolveFileProperty(column.slice(5), record)`; `formula.` prefix returns `record.properties.get(column) ?? null`; `note.` or `property.` prefix returns `record.properties.get(canonicalPropertyName(column.slice(...))) ?? null`; otherwise `record.properties.get(canonicalPropertyName(column)) ?? null`. Update the JSDoc. Delete the duplicate branch at `:432-434`.
   - `collection-block-widget.ts`: replace `getCellValue(record, col.key)` with `getPropertyValue(record, col.key)`; delete `getCellValue`; add the import.
4. Docs: `help/documentation/12-collection.md` near the column/sort description: say columns and sort keys accept `file.*`, `note.`/`property.` prefixes and `type`. Check whether that section exists before editing; if the doc has no such sentence, add one line only.
5. Gate (frontend only, per CLAUDE.md rule 6): `pnpm check` + `pnpm vitest run` (targeted files first: collection-logic, collection-block-widget, CollectionTableView.svelte.test.ts, calendar-logic, linear-calendar-logic, collection-calendar-colors). One commit, full-format message, include `Test-Exempt` not needed since tests change.

Acceptance criteria review:
- The Issue's test list is correct and sufficient for the four named cases. It misses: `file.properties` (decide: out of scope, state it), the existing tests that must change (`note.`/`property.` literal-key cases), a block-level `file.tags`/alias cell, and a sort-through-`executeQuery` test (the Issue says "a sort by `type` orders rows" but places it under `collection-logic.test.ts`; use `executeQuery`, not `getPropertyValue`, to prove the sort wiring).
- "Resolve column keys through the evaluator's member lookup" is slightly off: `resolveMember` needs an `EvalContext`, and formula resolution would re-evaluate formulas. The right reuse is `resolveFileProperty` + `canonicalPropertyName`, as the plan does. Reword the criterion.
- Not testable as written: "Fix the block's `file.basename` cell" is testable only through `buildCollectionTable`; that is covered by the widget test above.
- Blocked-by 010 is not a real dependency (section 5).

## 5. Run order

- Blockers: listed as 010 (`issues/067-...md`, ledger line 104). Reality: 010 edits `validateExpression` (`evaluator.ts`, ~`:300-332`), `evaluateFilterCached` and the `executeQuery` result shape (`collection.logic.ts:359-371`, ~`:140-215`) and adds failure counting; 067 edits `getPropertyValue` (`:418-436`), two `export` keywords and the widget. The hunks are disjoint; the only link is the same files (010's own notes: "Shares `collection.logic.ts` with 03, 04 and 08"). The proposed queue runs 067 before 010, so either drop the Blocked-by line (recommended, and update the Issue, ledger and priority note) or run 010 first. Run them serially either way, never in parallel.
- Hot-code series group: `RailNoteList` / `lens.logic.ts` / `CollectionView.svelte` (priority note line 63). 067 touches none of those three directly, but it shares `collection.logic.ts` with 010, 068 and 141, so keep it in that series.
- Must precede: 068 (DESC sort lists notes without a value last) edits the same sort loop and `compareForSort` (`collection.logic.ts:199-212`, `:439-458`), and its Blocked-by is 067. Also unblocks 138 (calendar undated count), 143 (inline blocks choose a view; touches `collection-block-widget.ts`) and 228 (help docs), which list 067 as a blocker. Land 067 before 143 so 143 builds on the deleted `getCellValue`.
- Files shared with other queue Issues: `collection.logic.ts` (010, 068, 141), `evaluator.ts` (010), `collection-block-widget.ts` (143, and the live-preview group only if 062/063/007/158 touch it; they are listed under `widgets.ts`, a different file), `collection-logic.test.ts` (010, 068).
- Not in the editor.service or live-preview-widgets.ts series groups. No Rust, no `$effect`, no store changes.

Unverified: I did not run any test, so "currently red" is derived from reading the code. I did not check how the Sort dropdown lists keys, so how often the owner can reach `type` as a sort key from the UI is inference.

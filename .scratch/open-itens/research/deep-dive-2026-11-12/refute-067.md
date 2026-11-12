# Refutation: Issue 067, Columns and sort keys resolve like expressions

Adversarial validation, 2026-11-12, against HEAD `318b6e9b5`. Read-only; no test, check or build was run, so "fails today" below is derived from reading code. `git log 115d8d576..HEAD` shows no commit touching `src/lib/features/collection`, its tests or `help/documentation/12-collection.md`, so the dossier's HEAD and this one agree on every cited line.

## Verdict

- **Still present: yes.** Verified in code, not inferred.
  - `getPropertyValue` (`src/lib/features/collection/collection.logic.ts:417-436`) handles only eight `file.*` keys (`:420-428`, default `null` at `:429`). Its `formula.`/`note.`/`property.` branch (`:432-434`) is the same literal lookup as the fallthrough (`:435`). So `note.status` reads a key literally named `note.status`, `type` reads a key literally named `type`, and `file.tags` / `file.properties` return null.
  - The parser never stores a literal `type` key. `parseFrontmatterProperties` runs `canonicalizeKey` on every key (`src/lib/core/frontmatter/properties.logic.ts:297`, `:454`, `:484`), and `canonicalizeKey` maps `type` to `_type` (`src/lib/utils/frontmatter-aliases.ts:7`). A `type` column or sort is therefore always null.
  - The sort step calls `getPropertyValue` (`collection.logic.ts:198-211`). When every value is null, `compareForSort` returns 0 (`:442`), so a sort by `type` keeps the input order.
  - The inline block keeps its own drifted copy, `getCellValue` (`src/lib/features/collection/collection-block-widget.ts:492-506`). It has no `file.basename` case, so that cell renders the null dash.
- **Impact for this owner: low.** Columns that the UI adds are bare frontmatter keys (help `12-collection.md:89`), and the inferred columns are bare keys, so they work today. The bug appears only in hand-written YAML, or Obsidian-style views, that spell a column or sort key `file.tags`, `note.x`, `property.x` or `type`, plus any inline block with a `file.basename` column. No app code generates those keys: a grep of `src/lib` finds no `file.tags`, `note.` or `property.` column key outside `collection.logic.ts:432` and the evaluator. The rail list shows no columns. It feels only the sort half, through `executeQuery` step 4, when the view's `sort:` names an alias. The effect is wrong display or an ignored sort: no write path, no data loss. Whether the owner's vault holds such a view is unknown, because the vault is outside the repo and was not searched.
- **Complexity: S. Risk: low**, provided the implementer uses the right helpers (see Must-fix 1). Hidden callers of `getPropertyValue` change behavior with it:
  - `CollectionTableView.svelte:60`;
  - `calendar.logic.ts:69` (`dateProperty`);
  - `linear-calendar.logic.ts:154` and `:273` (`colorProperty`).

  Each change is an improvement or a no-op: `colorProperty: type` starts coloring by `_type`. There are no store, Rust or `$effect` changes. The widget edit is inside `buildCollectionTable`'s cell loop (`collection-block-widget.ts:456`). It does not touch the query-data cache, `eq()` or the mousedown guard (live-preview rules 2, 3 and 11), and the file already imports from `collection.logic.js` (`:4`).
- **Ready for a fresh agent: not as written.** An agent would have to guess or would stop on three points:
  1. "The evaluator's member lookup" names a function that cannot be reused.
  2. The Issue does not say that rewriting the tests that pin the bug is approved.
  3. The Blocked-by line contradicts the owner's queue.

  It also omits the `docs/agents/view-files.md` markers that this Issue owns.
- **Recommendation: run-after-edits.** Apply the Must-fix edits, then run 067 before 068, as the queue has it.

## Must-fix edits to the Issue text

### 1. Name the shared helpers; forbid evaluating the key as an expression

Evidence: `resolveMember` (`src/lib/features/collection/expression/evaluator.ts:162-185`) needs an `EvalContext`. Its `formula` case calls `evaluateFormula` (`:220-228`), which returns null when `ctx.formulas[name]` is absent. The table view, block widget and calendars have only records, with formula values precomputed as `formula.<name>` keys (`collection.logic.ts:176-193`). An agent that builds a context, or parses the column with `evaluateExpression`, breaks `formula.*` columns, and it also breaks keys that are not valid identifiers (`due date`, `my-prop`). The function to mirror is `resolvePropertyPath` (`evaluator.ts:614-631`), which the Issue does not mention. `resolveFileProperty` (`:196-216`) and `canonicalPropertyName` (`:100-102`) are module-private today (exports at `:11`, `:40`, `:77`, `:296`, `:308`).

Replace the first bullet of **What to build** with:

> - Export `resolveFileProperty` and `canonicalPropertyName` from `src/lib/features/collection/expression/evaluator.ts` (both are private today, `:100`, `:196`) and make `getPropertyValue` dispatch like `resolvePropertyPath` (`evaluator.ts:614-631`): `file.<x>` returns `resolveFileProperty(x, record)`; `formula.<name>` returns the stored `record.properties.get(column) ?? null` (formulas are precomputed by `executeQuery` step 3, `collection.logic.ts:176-193`; do not evaluate them); `note.<x>` and `property.<x>` return `record.properties.get(canonicalPropertyName(x)) ?? null`; any other key returns `record.properties.get(canonicalPropertyName(column)) ?? null`. Do not parse or evaluate the column as an expression: keys with spaces or hyphens must keep working and there is no `EvalContext` at the table, block or calendar callers. Not `canonicalizeKey`: it maps `archived`, `organized` and `favorite` to their `_` keys (`src/lib/utils/frontmatter-aliases.ts:8-10`), while the record holds those three as always-present projected flags (`collection.logic.ts:63-65`), so an `archived` column would turn empty. Filters alias only `type` (`evaluator.ts:95-97`).

Replace the second bullet with:

> - Delete the block's private `getCellValue` (`collection-block-widget.ts:492-506`) and call `getPropertyValue` at `:456`, so the block gets `file.basename` and every key above.

### 2. Name the pinned tests and record that rewriting them is in scope

Evidence: `src/tests/lib/features/collection/collection-logic.test.ts:669-674` asserts `getPropertyValue(record, 'note.status')` is `null` on a record whose `status` is `'active'`. It also asserts that a literal `note.status` key is read. `:676-680` asserts that a literal `property.status` key is read. The fix turns the first assertion red, and a literal-key read is no longer the contract. The owner's global rule says "Never weaken, skip or delete tests ... change it only with approval". Issue 068 records such an approval as a Comment (`068-desc-sort-nulls-last.md`, Comments), and 067 has none, so a careful agent stops here.

Add to the acceptance list:

> - [ ] Rewrite `collection-logic.test.ts:669-674` ("returns note.* prefixed properties") and `:676-680` ("returns property.* prefixed properties"): they pin the literal-key bug. `note.status` and `property.status` read the `status` key. Keep the `formula.doubled` case (`:663-667`) as is.

And add under `## Comments` (owner to confirm, as on 068):

> - <date>, owner decision: rewriting the pinned tests `collection-logic.test.ts:669-680` is approved.

### 3. Resolve the Blocked-by line against the queue

Evidence: ledger "Next up": "An Issue can start when its status is `todo` and every Issue in its "Blocked by" is `done`" (`.scratch/open-itens/ledger.md`, Next up). The ledger row says `| 067 | ... | 010 | todo |` (`ledger.md:104`). The owner's queue runs 067 before 010. The archived PRD gives the reason for the block as shared files only: `collection.logic.ts` (02, 03, 04, 08) and `collection-block-widget.ts` (02, 03, 06, 16) (`.scratch/archived/view-engine-fixes/PRD.md:37`). The hunks do not overlap:

- 010 edits `validateExpression` (`evaluator.ts:308-`), `evaluateFilterCached` and the `executeQuery` result shape, and adds a failure count to the block.
- 067 edits `getPropertyValue`, two `export` keywords and `getCellValue`.

Replace `**Blocked by:** 010` with `**Blocked by:** none`. Add to Notes:

> - Shares `collection.logic.ts`, `evaluator.ts`, `collection-block-widget.ts` and `collection-logic.test.ts` with 010: run them in series, never in parallel.

The orchestrator must also change the ledger's Blocked by cell through `relay ledger`, not by hand.

### 4. Own the agent-doc markers

Evidence: `docs/agents/view-files.md:7` says: "Items marked **(changes: open-itens/NNN)** are scheduled to change ... When that Issue is done, update the item." This Issue owns three items:

- `:90-95`, the column and sort key list, the "(changes: open-itens/067)" line, and "Sort by `_type`, not `type`";
- `:149`, "render `file.basename` cells empty **(changes: open-itens/067)**";
- `:353`, gotcha 11.

010 carries the analogous criterion. 067 does not.

Add:

> - [ ] `docs/agents/view-files.md`: rewrite § Column and sort keys (`:90-95`) to the keys that now resolve, drop the `file.basename` clause at `:149`, and remove gotcha 11 (`:353`, renumber the list).

## Should-fix edits

1. **Mark the `archived` test as a guard, and pin how its record is built.** It passes today: `archived` reads the literal projected key, `false`. It is not a failing test. A `makeRecord` record (`collection-logic.test.ts:13-35`) carries no projected flags, so with it the test reads null in both implementations and proves nothing. Replace the line with:
   > an `archived` column on `buildNoteRecord('/vault/a.md', '---\ntitle: x\n---\n')` reads `false` (a guard: it passes today and fails if `canonicalizeKey` is used).
2. **Put the sort test through `executeQuery`, with unsorted input.** Today's no-op keeps the input order (`collection.logic.ts:199-211`, `:442`), so an already-sorted input passes in red. Replace "a sort by `type` orders rows by `_type`" with:
   > `executeQuery` with `sort: [{ column: 'type', direction: 'ASC' }]` over records whose `_type` is `'B'` then `'A'` returns `A` first.
3. **Add a `property.` case, since the text promises both prefixes.** Add `note.type` reading `_type` as well: the alias applies after the prefix, as in `evaluator.ts:170-172`.
4. **Decide `file.properties`.** Through `resolveFileProperty` it becomes an object (`evaluator.ts:207-213`). Both renderers then call `formatCellValue` (`collection.logic.ts:393-414`) or `String()`, so the cell shows `[object Object]` where it shows a dash today. Add a Notes line:
   > `file.properties` resolves to the same object filters see; its cell display is out of scope.

   Otherwise, drop `file.properties` from the bug description.
5. **Correct the stale line citations.** Each cited range drifted at HEAD:

   | Cited | At HEAD |
   |---|---|
   | `collection.logic.ts:406-424` | `:417-436` |
   | `evaluator.ts:193-212` | `:196-216`, plus `:170-172` for `note`/`property` |
   | `evaluator.ts:93-95` | `:95-97` |
   | `frontmatter-aliases.ts:9-11` | `:8-10` |
   | `help/documentation/12-collection.md:316-325` | `:311-328` |

   The help table is the expression reference, not a column-key list. Reword "The help lists `file.tags` as a working field" to:
   > The expression reference lists `file.tags` (`help/documentation/12-collection.md:323`), and columns accept no such key.
6. **Note the sibling aliases left out of scope.** `color`, `icon`, `sort` and `order` are also canonicalized on parse (`frontmatter-aliases.ts:7-22`). So `colorProperty: color` reads null before and after this Issue, as in filters. One Notes line stops an agent from widening the alias set.

## Dossier errors

- **Wrong reuse target.** The dossier frames the reuse as `resolveMember` and never names `resolvePropertyPath` (`evaluator.ts:614-631`), the dotted-path resolver that `getPropertyValue` should mirror. Its plan, exporting `resolveFileProperty` and `canonicalPropertyName`, is right.
- **Missed agent-doc markers.** It did not find `docs/agents/view-files.md:90-95`, `:149` and `:353`, the three items marked for this Issue.
- **Scope creep.** Its step 4 edits `help/documentation/12-collection.md`. The Issue does not ask for that, and help-doc rewording belongs to 228, which lists 067 as a blocker (`ledger.md:243`).
- **Wrong reason for rewriting tests.** It says to "record in the commit" why the pinned tests at `:669-680` change. Under the owner's global rule, changing a pinned test needs approval, not a commit-message note, which is why 068 carries an owner Comment.
- **`archived` test.** It says this test "proves no `canonicalizeKey` regression" but does not say that it passes today, so it cannot serve as a failing-first test.
- **Blocker understated.** It calls the 010 blocker "only a file overlap, so proceeding is safe". The ledger's Next up rule does enforce Blocked by for un-forced runs, so the Issue and the ledger must change, not just the agent's assumption.
- **Missed confirmation.** It marks "a literal `type` key should not exist" as inference. It is verified: `canonicalizeKey` runs on every parsed key (`properties.logic.ts:297`, `:454`, `:484`).
- **Overstated help claim.** It calls `file.tags` a help-advertised column key. It is listed in the expression reference (`12-collection.md:311-328`); the column docs (`:55`, `:86-90`) speak only of frontmatter properties.
- **Header and range.** The HEAD in its header is `115d8d576`; HEAD is now `318b6e9b5`, with no relevant change in between. It cites the help range as `:305-325`, which starts in § Display Helpers; the `file.*` table is `:311-328`.
- **What it got right:** the five callers, the widget's drifted copy, the duplicate branch at `:432-434`, the `file.tags ?? []` and `[object Object]` side effects, and the run order (before 068 and 143).

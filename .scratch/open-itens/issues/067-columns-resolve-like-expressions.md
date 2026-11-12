# 067: Columns and sort keys resolve like expressions

**Origin:** `view-engine-fixes` Issue 03, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-engine-fixes/`. Issue numbers in the text below are this folder's numbers; `priority-2026-11-08.md` in this folder maps them to the origin numbers.

**What to build:** `getPropertyValue` resolves only `file.name|basename|path|folder|ext|size|ctime|mtime`, `formula.<name>` and the exact stored key (`src/lib/features/collection/collection.logic.ts:417-436`). Its `formula.`/`note.`/`property.` branch (`:432-434`) is the same literal lookup as the fallthrough, so `note.status` reads a key literally named `note.status`. `file.tags`, `file.properties`, the `note.` and `property.` prefixes and the alias `type` read null, though filters resolve them (`evaluator.ts:196-216`, `note`/`property` at `:170-172`, alias at `:95-97`). The parser stores `type` as `_type` (`canonicalizeKey` on every key, `properties.logic.ts:297`), so a `type` column or sort is always null and a sort by it keeps the input order. A Tags column shows only dashes. The expression reference lists `file.tags` (`help/documentation/12-collection.md:323`), and columns accept no such key. The inline block keeps its own drifted copy, `getCellValue` (`collection-block-widget.ts:492-506`), which has no `file.basename` case.

- Export `resolveFileProperty` and `canonicalPropertyName` from `src/lib/features/collection/expression/evaluator.ts` (both are module-private today, `:196`, `:100`) and make `getPropertyValue` dispatch like `resolvePropertyPath` (`evaluator.ts:614-631`):
  - `file.<x>` returns `resolveFileProperty(x, record)`;
  - `formula.<name>` returns the stored `record.properties.get(column) ?? null` (`executeQuery` step 3 precomputes formulas, `collection.logic.ts:176-193`; do not evaluate them);
  - `note.<x>` and `property.<x>` return `record.properties.get(canonicalPropertyName(x)) ?? null`;
  - any other key returns `record.properties.get(canonicalPropertyName(column)) ?? null`.
- Never parse or evaluate the column as an expression: keys with spaces or hyphens (`due date`, `my-prop`) must keep working, and the table, block and calendar callers have no `EvalContext`. Never use `canonicalizeKey`: it maps `archived`, `organized` and `favorite` to their `_` keys (`src/lib/utils/frontmatter-aliases.ts:8-10`), while the record holds those three as always-present projected flags (`collection.logic.ts:63-65`), so an `archived` column would turn empty. Filters alias only `type`.
- Delete the block's `getCellValue` and call `getPropertyValue` at `collection-block-widget.ts:456`, so the block gets `file.basename` and every key above.
- Other callers of `getPropertyValue` change with it, each for the better or not at all: `CollectionTableView.svelte:60`, `calendar.logic.ts:69` (`dateProperty`), `linear-calendar.logic.ts:154`, `:273` (`colorProperty: type` starts coloring by `_type`).

**Blocked by:** 010

**Status:** ready-for-agent

**Answered:** owner, 2026-11-12: rewriting the tests that pin the literal `note.` and `property.` keys is approved. 067 stays blocked by 010, and 010 runs first. Nothing open.

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first, in `src/tests/lib/features/collection/collection-logic.test.ts`:
  - § `getPropertyValue`: a `file.tags` column value equals the record's tags; `note.status` and `property.status` read the `status` key; `type` and `note.type` read `_type`.
  - § `executeQuery`: `sort: [{ column: 'type', direction: 'ASC' }]` over records whose `_type` is `'B'` then `'A'` returns `A` first (unsorted input, so today's no-op fails it).
  - Guard (green today, fails if `canonicalizeKey` is used): an `archived` column on `buildNoteRecord('/vault/a.md', '---\ntitle: x\n---\n')` reads `false`.
- [ ] Rewrite `collection-logic.test.ts:669-674` ("returns note.* prefixed properties") and `:676-680` ("returns property.* prefixed properties"): they pin the literal-key bug. `note.status` and `property.status` read the `status` key. Keep the `formula.doubled` case (`:663-667`) as is. The commit message names both rewritten tests.
- [ ] `src/tests/lib/features/collection/collection-block-widget.test.ts`: a `file.basename` cell renders its text.
- [ ] `docs/agents/view-files.md`: rewrite § Column and sort keys (`:90-95`) to the keys that now resolve and drop its `(changes: open-itens/067)` line; drop the `file.basename` clause at `:149`; remove gotcha 11 (`:353`) and renumber the list.

## Notes

- **Out of scope:** `file.properties` resolves to the same object filters see; its cell display (`[object Object]` through `formatCellValue`, `collection.logic.ts:393-414`) is out of scope. The aliases `color`, `icon`, `sort` and `order` are also canonicalized on parse (`frontmatter-aliases.ts:7-22`), so `colorProperty: color` reads null before and after this Issue, as in filters: do not widen the alias set. Help-doc rewording is 228's work.
- **Series:** shares `collection.logic.ts`, `evaluator.ts`, `collection-block-widget.ts` and `collection-logic.test.ts` with 010, and `collection.logic.ts` and its test file with 068 and 047. Views chain: `068 -> 009 -> 070 -> 010 -> 067 -> 012 -> 047`. Never run beside any of them. Land it before 143, which builds on the deleted `getCellValue`.
- **Read first:** `docs/agents/live-preview-rules.md` (the block widget). The edit is inside the cell loop only; it does not touch the query-data cache, `eq()` or the mousedown guard.
- **Size:** S.

## Comments

- 2026-11-12, owner decision: rewriting the pinned tests "returns note.* prefixed properties" and "returns property.* prefixed properties" in `collection-logic.test.ts` (at `:669-680` on 2026-11-12) is approved.
- 2026-11-12: deep dive (`research/deep-dive-2026-11-12/`, refute-067). Named the helpers to reuse (`resolveFileProperty`, `canonicalPropertyName`, mirroring `resolvePropertyPath`) instead of "the evaluator's member lookup", and forbade evaluating the key. Added the pinned-test rewrite, the `view-files.md` markers, `property.` and `note.type` cases, an `executeQuery` sort test with unsorted input, and marked the `archived` test as a guard. Kept `Blocked by: 010` with 010 run first, as the owner chose. Fixed stale line numbers.

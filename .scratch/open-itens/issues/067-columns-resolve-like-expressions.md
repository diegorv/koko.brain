# 067: Columns and sort keys resolve like expressions

**Origin:** `view-engine-fixes` Issue 03, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/view-engine-fixes/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** `getPropertyValue` resolves only `file.name|basename|path|folder|ext|size|ctime|mtime`, `formula.<name>` and the exact stored key (`src/lib/features/collection/collection.logic.ts:406-424`). `file.tags`, `file.properties`, the `note.` and `property.` prefixes and alias spellings (`type`) read null, though filters resolve them (`evaluator.ts:193-212`). A Tags column shows only dashes, and sorting by an alias does nothing. The help lists `file.tags` as a working field (`help/documentation/12-collection.md:316-325`). The inline block also loses `file.basename` as a column (`collection-block-widget.ts:492-506`).

- Resolve column and sort keys through the evaluator's member lookup and its `canonicalPropertyName` (shared code, not a copy). Not `canonicalizeKey`: it maps `archived`, `organized` and `favorite` to their `_` keys (`src/lib/utils/frontmatter-aliases.ts:9-11`), while the record holds those three as always-present projected flags (`collection.logic.ts:63-65`), so an `archived` column would turn empty. Filters alias only `type` (`evaluator.ts:93-95`).
- Fix the block's `file.basename` cell.

**Blocked by:** 010

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `src/tests/lib/features/collection/collection-logic.test.ts`: a `file.tags` column value equals the record's tags; a sort by `type` orders rows by `_type`; a `note.status` column reads `status`; an `archived` column still reads `false` for a note without `_archived`.
  - `src/tests/lib/features/collection/collection-block-widget.test.ts`: a `file.basename` cell renders its text.

## Notes

- **Size:** S-M.

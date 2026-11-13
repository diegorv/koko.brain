# 20: Inline `collection` blocks follow the row rule

**What to build:** An inline block runs a plain query with no row rule (`collection-block-widget.ts:116`, `collection.logic.ts:139`). An unfiltered block lists type definitions, system-folder notes, archived notes and `.view` files, while a view with the same filter hides them.

Add a port method `blockRows(records, view, definition)` (`view-row-set.port.ts`, `boot.ts`), backed by a pure `blockRowSet` in `lens.logic.ts`:

1. `excludeSystemFolder(records, ...)`. It is generic over `{path}`.
2. Drop `.view` files and `_type === 'Type'`.
3. Drop archived unless the filters cite it (`filterCitesArchived`, Issue 19).
4. Apply `limit`.

Read **records, not entries**. Records update on the save, while entries lag 2 to 10 s, and the block's `rebuildOn` would not refetch for a just-created note. Keep query order: an inline block gets no `_sort` and no pins.

**Blocked by:** 19

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing tests first, in `collection-block-click.test.ts` style, with the real CodeMirror widget and real store, port registered:
  - An archived note, a `_system/` note, a type definition and a `.view` are absent.
  - A block citing `archived` shows the archived note.
  - A record with no entry stays listed.
  - `limit` counts after the rule.
  - Query order is unchanged.
- [x] `src/tests/help/collection-features.test.ts` runs samples through `blockRowSet`. Its current checks would stay green if a sample silently matched no rows, so add a check for that where a sample is expected to match.
- [x] `collection-block.spec` and `click-reveal/collection-block.spec` still pass under `bash scripts/e2e.sh`.
- [x] `help/documentation/12-collection.md`, Inline Collection, states the rule.

## Notes

- **Behavior change for existing blocks:** they lose archived notes unless cited, and type definitions, system-folder notes and `.view` rows, with no opt-out for the system folder. `limit` now counts after that.
- `collectionCache` is keyed by `collectionStore.version` only, so a system-folder setting change shows at the next bump. Recoverable, no code.
- Whether the help example folders hold `_type: Type` notes that their blocks list today was not checked.
- **Size:** M.

- 2026-11-05, branch issue/20-inline-block-row-rule: inline `collection` blocks list rows through `blockRowSet` (the row rule), wired through the boot port. Review fixes: boot test now covers `port.blockRows` (excluded rows dropped, systemFolder read per call); the help samples' "lists at least one note" check covers `.collection` samples too. Tests: pnpm check 0 errors; full suite at 855cf849a: vitest 541 files, 12875 passed, 1 skipped, 1 todo; pnpm build passed. Reviews: round 1 APPROVED, round 2 APPROVED.

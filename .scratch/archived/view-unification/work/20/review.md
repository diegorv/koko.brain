VERDICT: APPROVED

## Acceptance criteria

- [met] Failing tests first, in `collection-block-click.test.ts` style, with the real CodeMirror widget and real store, port registered: — `src/tests/lib/features/collection/collection-block-row-rule.test.ts` mounts a real CodeMirror view with `collectionBlockRenderer` and `livePreviewExtensions`, uses the real `collectionStore`, `vaultStore` and `typeDefinitionsStore`, and calls `registerAppPorts()` in `beforeEach`. It covers each sub-case: archived / `_system/` / type definition / `.view` absent (`:369`), `archived == true` lists `old.md` (`:375`), a record with no entry listed while the type-definitions store is empty (`:380`), `limit: 2` gives n1, n2 after the rule (`:386`), and DESC name order kept with an `_order: 0` pin on n1 (`:392`). Probe: with main's `collection-block-widget.ts` checked out, 3 of the 5 tests failed (the absent rows, limit, order). The other 2 already passed against the plain query, as the build report says. The file was restored afterwards and the tree is clean.
- [met] `src/tests/help/collection-features.test.ts` runs samples through `blockRowSet`. Its current checks would stay green if a sample silently matched no rows, so add a check for that where a sample is expected to match. — `run()` (`:245`) routes inline blocks through `executeQuery(..., blockRowSet)` and `.collection` files through the plain query. The new test at `:265` requires every view of every inline block to list at least one row, except `MEANT_TO_BE_EMPTY = ['collection-edge-cases.md #1 [Empty Result]']`. It passes.
- [met] `collection-block.spec` and `click-reveal/collection-block.spec` still pass under `bash scripts/e2e.sh`. — I ran `bash scripts/e2e.sh e2e/specs/collection-block.spec.ts e2e/specs/live-preview/click-reveal/collection-block.spec.ts` in the worktree: exit 0, 16 passed.
- [met] `help/documentation/12-collection.md`, Inline Collection, states the rule. — `12-collection.md:182` states it: system folder, type definitions and `.view` files never listed, archived left out unless a top-level or view filter cites `archived`/`_archived`, `limit` taken after the rule, `sort` order kept, no `_sort` or `_order` pins. The Result Limit paragraph (`:161`) and the archived gotcha (`:407`) were updated to match.

## Checks run by this review

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run` on 12 files: exit 0, 417 tests passed. The files: `rail-shell/lens.logic.test.ts`, `collection/collection-block-row-rule.test.ts`, `collection-block-click.test.ts`, `collection-block-widget.test.ts`, `app/boot.test.ts`, `help/collection-features.test.ts`, `CollectionView.test.ts`, `CollectionView.restored-view.test.ts`, `architecture/layer-rules.test.ts`, and the tests that read the edited help docs (`settings-copy.test.ts`, `kb-api-contract.test.ts`, `event-calendar-keys.logic.test.ts`). My test verdict rests on these files, the probe above and the E2E run.
- The full suite and `pnpm build` are for deliver to run.

## Verified correctness points

- `blockRowSet` (`lens.logic.ts:737`) reads only records. `_type === 'Type'` on a record matches `entry.isA === 'Type'`: Rust `project_note_record` (`vault.rs:855`) writes `is_a` into `_type`, and TS `projectDerivedProperties` uses the same first-letter casing as `extract_is_a`. The `archived` boolean is set on both paths (`vault.rs:863`, `collection.logic.ts:64`).
- `executeQuery` with a `rowSet` hands it the records before the limit step and does not apply `limit` itself, so the `limit` in `blockRowSet` is the only limit. Without a registered port, the widget passes `undefined` and keeps the plain query and its limit.
- The widget is the only inline-block render path (`editor-host.ts:170`). The other `executeQuery` callers are the `.view` editor and the rail, and they are untouched.
- The layer baseline and `BASELINE_SIZE` are unchanged, and no composition root was added. The 25-types-and-relationships.md `limit` row was made stale by this change, so correcting it is in scope.

## Findings

1. minor, src/tests/lib/app/boot.test.ts:173: `boot.ts:62-66` adds the `blockRows` forwarding, but the boot test of the row-set port only exercises `rows` and `sortLabel`. The wiring is covered only indirectly by the widget test, which also only sees the default system folder. Fix: add a `port.blockRows(...)` case in that test. Assert that it drops the fixture's excluded rows and that it reads `settingsStore.templates.systemFolder` per call: set the folder to blank and the `_system/` note comes back.
2. nit, src/tests/help/collection-features.test.ts:265: the new "lists at least one note" check covers inline blocks only, so a `.collection` sample can still match nothing without failing a check. Fix: either include `.collection` samples, with `sprint-board.collection [Backlog]` added to the expected-empty list, or leave it because Issue 23 retires `.collection` files. The criterion is met either way, since it is about the samples that run through `blockRowSet`.

## Resolution

1. Fixed. `src/tests/lib/app/boot.test.ts`, the row-set port case, now calls `port.blockRows(...)`: the fixture's archived, `_system/`, type-definition and `.view` records drop out, and with `templates.systemFolder` set to blank the `_system/` note comes back, so the folder is read from the settings per call.
2. Fixed. The "lists at least one note" check in `src/tests/help/collection-features.test.ts` now covers the `.collection` samples too, run as a plain query, with `sprint-board.collection [Backlog]` on the expected-empty list.

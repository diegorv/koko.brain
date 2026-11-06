VERDICT: APPROVED

## Acceptance criteria

- [met] Failing tests first: — `FilesNavigator.menu.test.ts:238-266` runs the real `createFile` with only `invoke`/plugin-fs mocked and asserts `create_note` gets `Untitled.view` (and `Untitled 1.view` when taken) with the exact body carrying `_visible: false` and `_open_in_editor: true`, plus the prompt refresh asked before `create_note`; Rust `vault_test.rs:605-619` (`update_inner_indexes_the_new_table_body_with_both_view_keys`) passes and asserts both keys in the stored frontmatter (a characterization: Rust already parses a `.view` as raw YAML, as the Issue expects); `NoteRowMenu.show-in-views.test.ts:660-678` clicks Show in Views through the real `rewriteViewFile` and asserts the written YAML is `{ views: [...] }`, `update_note_in_index` was called, and `viewNavigatorRows` lists the row once the entry carries the written YAML. Test-first order taken from the build report (commit history alone cannot show it); all of these pass in my run.
- [met] `rail-shell.spec.ts`: New table opens a rendered table, there is no row in Views, and the Files row is present. — `rail-shell.spec.ts:776-805`: asserts the saved YAML, the active tab, the collection editor's source-mode button and a visible `table`, the Files list row, `viewRow(...).toHaveCount(0)` in Types, then Show in Views drops both keys and the Views row appears. Passed in my run of `bash scripts/e2e.sh e2e/specs/rail-shell.spec.ts e2e/specs/rail-list-toolbar.spec.ts --grep-invert "New here"` (32 passed).
- [met] `e2e/mocks/vault-index.ts:44,96-98` gains a raw-YAML branch mirroring `parse_frontmatter_raw_yaml`. Without it the mock parses no frontmatter for a `.view`, the Views row appears, and the spec fails. Do not weaken the spec to pass: the Rust test is the real proof, and the spec proves the UI against the mock. — `parseFrontmatterRawYaml` / `parseYamlBlock` (vault-index.ts:96-115) share the projection with `parseFrontmatter`; `isIndexedFile` admits `.view` in `rebuildAll` and `update` (the mock indexed no `.view` before, so the branch alone would have been dead); `buildViewEntry` matches `NoteEntry::from_view_frontmatter` (entry.rs:294-316: title, `_organized` default true, `_archived`, `_favorite`, empty links/tags/tasks). The spec asserts `toHaveCount(0)` in Views, not weakened.
- [met] `help/documentation/02-file-explorer.md`, `12-collection.md` and `25-types-and-relationships.md` describe New table and Show in Views. — 02:19,62,74; 12:28; 25:375-377,418,444. The text matches the code (body, `Untitled 1.view`, item shown only on `_visible: false`, comments not kept).

## Findings

1. nit, e2e/mocks/vault-index.ts:374-384 — `getBacklinks` now sees `.view` entries and its first branch matches a link by bare name (`link.target.toLowerCase() === targetName`), so a note with `[[Untitled]]` would list as a backlink of `Untitled.view` in the mock, while the resolution cache (`isLinkTargetFile`) and Rust treat a view as no link target. No spec hits this today. Fix: skip the lookup when `isViewPath(targetPath)`, as the two unlinked-mention lookups now do.

## Checks I ran

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/features/note-list src/tests/lib/features/rail-shell src/tests/lib/features/type-definitions src/tests/lib/features/collection/collection.service.test.ts src/tests/lib/architecture`: exit 0, 60 files, 1695 tests. My test verdict rests on these, which include every changed test file (`NoteRowMenu.show-in-views.test.ts`, `FilesNavigator.menu.test.ts`, `FilesNavigator.new-view.test.ts`, `collection.service.test.ts`, `type-definitions.service.test.ts`, `type-sidebar.logic.test.ts`) and the test files of the changed sources.
- `cargo test --manifest-path src-tauri/Cargo.toml --test commands_test update_inner_indexes_the_new_table`: 1 passed.
- E2E: the two view specs with `--grep-invert "New here"`: 32 passed. An earlier run with `--grep "view|View|table"` failed only `rail-shell.spec.ts:488` ("... New here creates a note of its type"): the saved note carries `_organized: false`, which comes from the `explicitOrganization: true` default in `settings.store.svelte.ts:148`, code this branch does not touch. Same class as the pre-existing New here failures the build report lists; deliver's E2E run of the whole spec will hit them.
- Full vitest suite, `pnpm build` and the full cargo suite: not run (deliver's).

## Notes (not findings)

- Show in Views also drops the `visible` alias; Rust folds it onto `_visible` (`aliases.rs:25`), so leaving it would keep the view hidden. `_open_in_editor` has no alias in Rust or the frontend.
- `isHiddenView` uses `getViewVisible(entry)`, so a `.view` with no entry yet does not show the item, consistent with how Views counts it visible.
- Renaming the creator id `builtin:collection` to `builtin:table` is safe: the id is only a key in `FilesNavigator.svelte`, nothing persists or looks it up.
- ADR 0004 still says New Collection; Issue 23 owns that amendment (`23-retire-collection-files.md:20`), and the rest of `12-collection.md` (`.collection` as the manual extension) too.
- Layer baseline and composition roots unchanged; `collection.service.ts` importing `core/vault/vault.store` is features -> core.

## Resolution

1. Fixed: `getBacklinks` in `e2e/mocks/vault-index.ts` returns `[]` when `isViewPath(targetPath)`, matching Rust and the unlinked-mention lookups.

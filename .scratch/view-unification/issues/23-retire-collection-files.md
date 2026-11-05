# 23: Retire `.collection` files

**What to build:** A `.collection` stops being a table and opens as plain text, like any other text file. **No conversion, no migration code, no prompt, no legacy read path.** This is an owner decision: the owner's vault is small and gets migrated by hand. Do not add any of these.

**Remove**
- `isCollectionFile` and its uses: `fs.logic.ts:70-73,127`, `editor.service.ts:137`, `lens.logic.ts:826,839`, `rail-shell.types.ts:34`, `layout.logic.ts:28`, `NoteRowMenu.svelte:18,212`.
- `CollectionView`'s `isView` branch (`:5,46-51,229,240`): it always uses the port.
- **Convert to view** (`NoteRowMenu.svelte:81-89,212-215`) and `NoteRowMenu.convert-to-view.test.ts`. The feature is removed by owner decision, so its test goes with it.

**Keep**
- Inline ` ```collection ` blocks: `parsers/collection-block.ts:23`, `code-block-field.ts:13`, `collection-block-field.ts:12`.
- Internal names: `features/collection`, `fileType: 'collection'`. Renaming fixes no defect.
- Rust: `.collection` stays unindexed (`utils/fs.rs:326`, `vault_file_ops_test.rs:48`).
- Test fixtures that only use a `.collection` path as a generic name, unless they stop making sense.

**Change**
- Convert the 9 files in `help/examples/collection-features` to `.view`, with the keys their behavior needs, and `src/tests/help/collection-features.test.ts:35,59`, `help/examples/SCOPING.md:53,123`, `examples-scoping.test.ts:228`.
- Tests: `CollectionView.test.ts:627,662`, `FilesNavigator.new-view.test.ts:111-117`, `collection.service.test.ts:562-576`, `lens.logic.test.ts:1708`.
- Docs: `help/documentation/12-collection.md:7,12,28-32,36,50,135,188`, `25-types-and-relationships.md:345,353,372,392,396,433`, `02-file-explorer.md:19,61,73`, `03-editor.md:99`, `16-table-of-contents.md:43`, `help/documentation/README.md:34`, `docs/FEATURES.md:43`. Add one short line for how to migrate by hand: rename to `.view`, add `_visible: false` and `_open_in_editor: true`.
- A new dated amendment in ADR 0004 replacing the two-kinds rule.
- Stale comments: `yaml-parser.ts:4,145,170,356`, `collection.types.ts:30,60`, `collection.store.svelte.ts:17`, `filter.logic.ts:538`, `EditorView.svelte:28`, `CollectionView.svelte:30`, `fs.logic.ts:75`.

**Blocked by:** 22

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`. Then `bash scripts/e2e.sh` for the specs touching this.

- [ ] Failing test first: opening `Foo.collection` gives a text tab, not a `collection` tab (`editor.service.test.ts`, `EditorView.test.ts:352`).
- [ ] Before removing each call, trace its callers (CLAUDE.md, Removing or Refactoring Code). The line list above is from one read at `4e382ea1e` and can be incomplete: `grep -rn -E "isCollectionFile|\.collection\b" src/lib src/tests help docs` should come back with only kept items.
- [ ] No row menu or navigator offers anything specific to `.collection`.
- [ ] No code reads, renames or rewrites a `.collection`.

## Notes

- **Effect on the owner's files:** `vault/resources/old/Collections` and `vault/resources/use-cases-test/examples/collection-features` in `brain-os-vault` open as text until migrated by hand. The owner accepted this.
- Check which editor mode and language a `.collection` gets once `fs.logic.ts:127` no longer maps it, and that it does not error.
- A `.collection` copied in later is just a text file.
- **Size:** M.

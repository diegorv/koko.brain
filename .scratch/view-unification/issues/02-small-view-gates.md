# 02: Small gates: Auto Move, property index, operator search, Open view

**What to build:** Four independent one- or two-line gates, grouped because each is tiny. Make one commit per gate.

**1. Auto Move never moves a `.view`.** The after-save observer has no extension gate (`auto-move.service.ts:95-117`), unlike the search observer (`search.service.ts:303`). `evaluateAndMove` tests every enabled rule, so a `file.*` rule can match a `.view` saved from the editor, while a sidebar write does not run the observer. Issue 03 sends more `.view` writes through a tab save, which would let a Pin click move a view, so this gate must land before it. Add an `isViewFile` gate at the top of the observer.

**2. The property index holds only indexed notes.** The note-change consumer skips only `.view` (`collection.service.ts:173-176`), so `updateNoteInIndex` inserts a record for anything else. Rust refuses `.collection` (`commands/vault.rs:325-330`), so that record exists only in TypeScript. It affects `.kanban` and `.canvas` too. It is reachable from opening the tab for 1 s (`src/routes/(app)/+layout.svelte:147-164`), `createFile` (`fs.service.ts:216`) and every save. `executeQuery` starts from all records (`collection.logic.ts:139`), and `kb-api.ts:472-474` keeps a record with no entry unless it is a view. So a new `Untitled.collection` lists itself and `kb.pages()` returns it, until the next `buildPropertyIndex`. Replace the gate:

```ts
if (!isMarkdownFile(path)) return;
```

`remove` stays. `isMarkdownFile` lowercases and accepts `.markdown` and `.MD`, and is false for `.view` (`fs.logic.ts:65-68`), so a view's record keeps coming only from Rust's delta. View records stay: `kb.page("x.view")` keeps working by owner decision.

**3. Operator-only search and the fallback skip `.view`.** Operator-only queries read `get_all_vault_entries_v2` with no kind filter (`search.service.ts:191-193`, `search.logic.ts:162-184`), so `path:Projects` lists a view. The FTS-failure fallback reads every entry's content (`search.service.ts:24-29,233`).
- `performOperatorOnlySearch`: add `if (isViewFile(entry.path)) continue;` first in the loop, before the `maxResults` break.
- `loadVaultContentMap`: drop view paths before `read_files_batch`.
- `loadVaultTagMap` only filters FTS results and needs no change.

**4. Palette Open view respects `_visible: false`.** `commands.ts:69-84` adds a command for every `.view`, including hidden ones, and its doc comment pins that. Once tables are hidden `.view` files (Issue 22), they would fill the palette. Skip a view when `!getViewVisible(entry)`. A view with no entry yet counts as visible (`type-sidebar.logic.ts:376`); keep that rule. A hidden view stays reachable through the Files navigator, the Quick Switcher (by file name), a pin and a meta-bind button.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] **Auto Move**, failing test first: with Auto Move on and a `file.folder` rule that matches, saving a `.view` through the real observer does not move it, and the same rule still moves a `.md` there. `help/documentation/22-auto-move.md` says a view is never moved.
- [ ] **Property index**, failing test first, with real `applyNoteChange` and the real store, only Tauri mocked: `.kanban`, `.canvas` and `.collection` upserts leave `propertyIndex` unchanged, and `.md` and `.MD` upserts add a record. `kb.pages()` does not return such a file through the real index.
- [ ] **Operator search**, failing tests first: in `search.logic.test.ts` (around `:371`), a `/vault/Projects.view` entry with a matching tag and path is returned by neither `tag:` nor `path:`. In `search.service.test.ts` (pattern at `:378`), with `search_fts` rejecting, `read_files_batch` paths exclude the `.view`, and `searchStore` results do not contain it.
- [ ] **Open view**, failing test first: `commands.test.ts:570` changes to the new behavior, so a hidden view has no command and a visible one does. Corrected docs: `help/documentation/06-search-and-navigation.md:61`, `01-getting-started.md:101`, the `_visible` row in `25-types-and-relationships.md:411`, and the `commands.ts` doc comment.

## Notes

- **Auto Move:** `evaluateAndMove`'s body and `findMatchingRule`'s handling of `file.*` fields were not read line by line. Confirm in the failing test that the rule really matches today. If it does not, report that before changing anything.
- **Operator search** ships alone: until Issue 12, full-text hits still list views.
- **Size:** S.

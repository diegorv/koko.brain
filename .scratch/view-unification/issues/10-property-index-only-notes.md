# 10: The property index holds only indexed notes

**What to build:** The collection note-change consumer skips only `.view` (`collection.service.ts:173-176`), then `updateNoteInIndex` inserts a record for anything else. Rust refuses `.collection` (`commands/vault.rs:325-330`), so the record exists only in TypeScript. It also affects `.kanban` and `.canvas`.

Reachable from: opening the tab for 1 s (`src/routes/(app)/+layout.svelte:147-164`), `createFile` (`fs.service.ts:216`) and every save. Readers have no extension filter: `executeQuery` starts from all records (`collection.logic.ts:139`), and `kb-api.ts:472-474` keeps a record with no entry unless it is a view. So a new `Untitled.collection` lists itself, and `kb.pages()` returns it with empty frontmatter, until the next `buildPropertyIndex`. `applyPropertyDelta` does not remove it, because Rust reports no path for it.

Replace the gate:

```ts
if (!isMarkdownFile(path)) return;
```

`remove` stays. `isMarkdownFile` lowercases and accepts `.markdown` and `.MD`, and is false for `.view` (`fs.logic.ts:65-68`), so a view's record keeps coming only from Rust's delta.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first, with real `applyNoteChange` and the real store, only Tauri mocked: `.kanban`, `.canvas` and `.collection` upserts leave `propertyIndex` unchanged. A `.md` and a `.MD` upsert add a record.
- [ ] `kb.pages()` does not return such a file through the real index.

## Notes

- `kb.page("x.view")` keeps working: view records stay, by owner decision. Do not remove them here.
- **Size:** S.

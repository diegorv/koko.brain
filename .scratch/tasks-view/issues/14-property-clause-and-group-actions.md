# 14: Property clause and "Only this / Hide this" actions

**What to build:** Two ways to make rules from the owner's note model and from what is on screen.

1. **Property clause.** A source clause on note frontmatter (edited through meta-bind and `.view` tables): `{ kind: 'property', key, op: 'is' | 'isNot' | 'contains' | 'exists', value? }`, read from `row.properties` (Issue 12), so a `status: active` project note can supply tasks. Strings, numbers and booleans compare as `String(value)`; object values never match `is` or `contains`.
   - `is`: case-insensitive equality with a scalar value, or with any element of a list value. `isNot` is the negation of `is`, so a note without the key passes.
   - `contains`: case-insensitive substring of a string value, or of any list element.
   - `exists`: the key is present and its value is not `null`, `''` or `[]`.
   - `NoteEntry.frontmatter` keys are already alias-resolved at parse time (`src-tauri/src/vault/entry.rs:395-397`), so the clause matches the stored key exactly (case-sensitive key).
   - Key and value are plain text fields in the Sources panel (Issue 13), with the op as a dropdown (`is`, `is not`, `contains`, `exists`; `exists` hides the value field). Issue 28 adds the key and value pickers.
2. **Group header actions.** Text buttons at the end of the group header (Issue 08), shown on hover and on focus within the header:
   - Folder group: "Only this folder" and "Hide this folder". Note group: "Hide this note". Other groupings get no actions here (Issue 15 adds type groups).
   - "Only this folder" keeps only that folder's tasks: with no cards it adds one card holding the folder clause; with cards it adds the folder clause to every card (AND), so a card cannot widen the list past that folder.
   - "Hide this folder" adds the folder to `query.exclude.folders`; "Hide this note" adds its `relPath` to `query.exclude.notes`. Nothing is added twice.
   - The rule sentence (`describeTaskQuery`, Issue 13) updates at once.

**Blocked by:** 08, 13

**Status:** ready-for-agent

**Answered:** PRD B6 (a), so Issue 13 stands as written (owner, 2026-11-06).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `task-query.logic.test.ts`: each property op on a scalar string, a number, a list, a missing key, an empty value and an object value. Fails today (no property clause).
- [ ] A pure `onlyThisFolder(query, folder)` and `hideFolder` / `hideNote` in `task-query.logic.ts` return the new query: tested with no cards, with one card, and with the folder already excluded.
- [ ] `TasksView.test.ts` with real stores: a property card `status is active` lists only tasks from notes with that frontmatter; "Hide this folder" on a folder group removes its tasks and the sentence names the exclude; "Only this folder" leaves only that folder's tasks.

## Notes

- **Size:** M.
- The heading parts of the panel follow Issue 13's status; this Issue does not touch them.

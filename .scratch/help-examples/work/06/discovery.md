# 06 discovery: scope type-definitions-features views

## Query sites in the folder
- `help/examples/type-definitions-features/active-projects.view:13` and `recent-meetings.view:9`:
  one string `filters:` each, no path predicate, no limit. These are the only sites
  (no queryjs/collection fences in the notes; `_types/*.md` have no filter field).
- Guard allowlist: `src/tests/help/examples-scoping.test.ts:68-69`.

## Render path (what "lists only notes in the folder" means)
- Sidebar count: `TypeSidebar.svelte:103` runs `executeQuery(parsed.definition, view, propertyIndex)`.
- List: `TypeNoteList.svelte:272` seeds toolbar groups from the YAML
  (`seedToolbarStateFromDefinition`, `type-note-list.logic.ts:41`), then
  `buildOverriddenQuery` (`:69`) rebuilds the filters from those groups before
  `executeQuery`. So the scope has to survive `parseFilterToGroups` ->
  `filterGroupsToFilter`; a compound string falls back to a `raw` row and round-trips verbatim
  (`filter.logic.ts:21-29`, `:38`).
- `file.folder` is the absolute parent folder (`src-tauri/src/commands/vault.rs:740`).

## Plan (template: SCOPING.md "Collection blocks, .collection and .view files")
1. Test first: `src/tests/help/type-definitions-views.test.ts` parses the real `.view`
   files and runs both render paths (`executeQuery` on the parsed definition, and seed ->
   override -> `executeQuery`) over a property index with matching notes inside the folder,
   in a nested copy, and outside it. Expect only in-folder notes. Red on today's files.
2. Append `&& file.folder.endsWith("/type-definitions-features")` to both filter strings
   (endsWith: the notes are flat, and it avoids the sibling-prefix match of `contains`).
   Remove the two allowlist entries. Green: new test + guard test.
3. README: one line that the views are scoped by folder name and that `_types/` type
   definitions stay vault-global (gap from SCOPING.md, nothing to scope).

## Prior art
- `src/tests/help/examples-scoping.test.ts` (reads `help/examples` from `process.cwd()`).
- `src/tests/features/collection/*` for `executeQuery` with hand-built `NoteRecord`s.

## Risks / defaults
- Scope by folder name: renaming the folder, or opening it as a vault under another name,
  empties both views. Accepted gap (filters cannot reference the holding file).
- Type definitions (`_types/`) merge with the vault's types of the same name; no API to
  scope them. Kept, documented in README, listed as a gap in the closing commit.
- `recent-meetings.view` keeps its 30-day `file.created` window; no help-vault data replaced.

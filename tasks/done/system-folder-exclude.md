# Exclude `_system` folder from TypeNoteList / Type sidebar

Templates inside `_system/templates/types/Task.md` (and similar) carry frontmatter `type: task`, so the Rust `VaultIndex` indexes them as ordinary type-tagged notes. They then appear in `TypeNoteList` mixed with real notes. Add a single vault-relative setting `templates.systemFolder` (default `_system`) and filter entries inside this folder out of the type sidebar surfaces (note list, nav counts, inbox dock badge). Other surfaces (search, backlinks, graph) stay untouched.

## Tasks

- [ ] Task 1: Add `systemFolder: string` to `TemplatesSettings` in `settings.types.ts`
- [ ] Task 2: Default `systemFolder: '_system'` in `DEFAULT_SETTINGS.templates` (`settings.store.svelte.ts`)
- [ ] Task 3: Add pure helpers `isInsideSystemFolder` + `excludeSystemFolder` in `type-sidebar.logic.ts`
- [ ] Task 4: Pre-filter entries in `TypeNoteList.svelte` before `getNotesForSelection` / `countSubFilters` / `loadViewNotes`
- [ ] Task 5: Pre-filter entries in `TypeSidebar.svelte` before `buildTypeSections` / `countNavItems`
- [ ] Task 6: Pre-filter entries in `AppShell.svelte` before `dockBadgeCount`
- [ ] Task 7: New `System folder` input in `TemplatesSection.svelte`
- [ ] Task 8: Tests covering `excludeSystemFolder` + counts/lists exclude system paths
- [ ] Task 9: Run `pnpm check` + `pnpm vitest run`

## Notes

- `NoteEntryV2.path` is absolute; `systemFolder` is vault-relative. Build absolute prefix as `${vaultPath}/${systemFolder}/`.
- Empty `systemFolder` (or missing `vaultPath`) = no exclusion.
- Logic file stays free of store imports — settings + vault path are passed in.
- Scope intentionally narrow: only sidebar/nav/dock badge filtered. Search, graph, backlinks, properties not touched.

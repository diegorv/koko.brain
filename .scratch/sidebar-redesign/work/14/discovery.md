# Issue 14 discovery: Files navigator and folder lens

No `spec.md`; the source is `PRD.md` (Lenses: Folder, Navigators: Files, Persistence, Q15, Q20). Builds on
`work/12` (navigator pane, once-per-open stale check, `layout.railTypesLens`); only the differences are listed.
Folder operations (menu) are Issue 15, drag and folder notes Issue 16: out of scope here.

## Files that change
- `rail-shell/lens.logic.ts`: `FILES_RAIL_ITEM = 'files'`, `FOLDER_LENS_KIND = 'folder'` (target = absolute folder
  path, none = vault root) in `RAIL_ITEM_LENSES`; `fileKind(name)` (markdown, canvas, kanban, view, collection,
  pdf, image, other); `navigatorFolders(nodes)` (directories, dot-prefixed left out); `resolveFolderLens` (direct
  file children in tree order, hidden left out, rule "in Work/projects/", root "in the vault root"; null when the
  folder is gone); `pickedFolderLens`; `staleFolderPickFix` (gone pick -> rail item Inbox when on Files, pick
  cleared, expanded list pruned); `newNoteRule` for folder (plain note in that folder, no frontmatter).
- `rail-shell.types.ts`: `LensContext.fileTree`; `LensNote.kind`.
- `core/settings/settings.types.ts:53-94`, `settings.store.svelte.ts:52-69`: `layout.railFolder: string | null`,
  `layout.railExpandedFolders: string[]` (own set, not `fsStore.expandedDirs`, so the classic tree is untouched).
- NEW `rail-shell/FilesNavigator.svelte`: vault root row, folder tree (chevron toggles, row picks).
- `Rail.svelte:37`: Files (Folder icon) after Types.
- `RailNoteList.svelte`: passes `fileTree`; row icon by kind when the file has no own icon.
- `note-list/NoteRow.svelte`: optional `fallbackIcon` (default FileText).
- `core/layout/AppShell.svelte:104-150,190-205`: Files navigator pane; the folder fix runs in the same once-per-open
  step as the Types fix.

## Plan (test-first)
1. `lens.logic.test.ts`: folder lens direct children only, every kind, rule, hidden out, root, gone folder; pick,
   stale fix, New here rule, `fileKind`, `navigatorFolders`.
2. `settings.service.test.ts`: defaults + round trip of `railFolder` / `railExpandedFolders`.
3. `FilesNavigator.test.ts` (new), `Rail.test.ts`, `RailNoteList.test.ts` (folder lens rows, kind icons, New here).
4. E2E `rail-shell.spec.ts`: pick folder, note + canvas listed, canvas opens; restart keeps pick + expanded; gone
   folder falls back.

## Defaults taken
- No pick: the vault root. Subfolders are not list rows (the navigator shows them). Every file kind is listed,
  archived notes included (the Lenses table sets no archived rule for Folder). Order: the tree's order.
- Title: file name without extension (rename keeps the extension); subtitle for non-markdown: the kind label.
- Fallback is "the default item" (Inbox, as Issue 12), not the PRD's Today: Today is Issue 19.
- Clicking a row picks; the chevron expands/collapses. The root row is always expanded.

## Risks
- AppShell effect covered only by E2E (as Issue 12).

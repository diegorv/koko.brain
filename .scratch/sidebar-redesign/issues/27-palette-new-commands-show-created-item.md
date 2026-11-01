# 27: Palette "New ..." commands show what they created

**What to build:** The command palette's **New File**, **New Folder**, **New Canvas** and **New Kanban Board** (`src/lib/features/command-palette/command-palette.service.ts`, the `file-explorer:new-file`, `file-explorer:new-folder`, `canvas:new` and `kanban:new` entries) create the item at the vault root and then call `fsStore.setRenamingPath(path)`. The only readers of `fsStore.renamingPath` left are `NoteRow` / `NoteRowMenu` (`src/lib/features/note-list/`), which act only on a note already in the current note list. Nothing reads it for a folder, and the Files navigator keeps its own local `renamingPath` (`FilesNavigator.svelte`). The classic tree's open-after-rename (`pendingCreationPath`) was what made these commands visible; with the classic shell gone (Issue 25), the item is created with no visible result.

Decide per command what "show it" means: open the created file in the editor (file, canvas, kanban), and for a folder, pick it in the Files navigator (rail item Files, `layout.railFolder`) or start its inline rename there. Drop the `setRenamingPath` call where nothing reads it.

**Blocked by:** none

**Status:** resolved

**Source:** Issue 25 review, finding 4. The rail on `main` already behaved this way before Issue 25, so this is not a regression of that branch.

- [x] Each of the four commands leaves the created item visible (open in the editor, or picked in the Files navigator)
- [x] No palette command writes `fsStore.renamingPath` unless a component reads it for that item
- [x] Tests assert on store state and rendered content, not only on calls

## Comments

- 2026-11-01, branch `issue/27-palette-new-commands-show-created-item`: New File / New Canvas / New Kanban Board now open the created file in the editor (`openFileInEditor`); New Folder picks the folder in the Files navigator (`railItem: files`, `railFolder`, panels visible). All `fsStore.setRenamingPath` calls are gone from the palette service. New jsdom test `command-palette.new-commands.test.ts` over the real editor service and stores; the failure case covers all four commands. Tests: `pnpm check` 0 errors; full suite 375 files, 9114 passed + 1 todo; `pnpm build` ok. Review round 1: APPROVED (finding 2 fixed, 1 left as an optional follow-up, 3 no change).

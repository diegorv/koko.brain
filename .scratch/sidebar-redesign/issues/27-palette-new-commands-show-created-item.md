# 27: Palette "New ..." commands show what they created

**What to build:** The command palette's **New File**, **New Folder**, **New Canvas** and **New Kanban Board** (`src/lib/features/command-palette/command-palette.service.ts`, the `file-explorer:new-file`, `file-explorer:new-folder`, `canvas:new` and `kanban:new` entries) create the item at the vault root and then call `fsStore.setRenamingPath(path)`. The only readers of `fsStore.renamingPath` left are `NoteRow` / `NoteRowMenu` (`src/lib/features/note-list/`), which act only on a note already in the current note list. Nothing reads it for a folder, and the Files navigator keeps its own local `renamingPath` (`FilesNavigator.svelte`). The classic tree's open-after-rename (`pendingCreationPath`) was what made these commands visible; with the classic shell gone (Issue 25), the item is created with no visible result.

Decide per command what "show it" means: open the created file in the editor (file, canvas, kanban), and for a folder, pick it in the Files navigator (rail item Files, `layout.railFolder`) or start its inline rename there. Drop the `setRenamingPath` call where nothing reads it.

**Blocked by:** none

**Status:** ready-for-agent

**Source:** Issue 25 review, finding 4. The rail on `main` already behaved this way before Issue 25, so this is not a regression of that branch.

- [ ] Each of the four commands leaves the created item visible (open in the editor, or picked in the Files navigator)
- [ ] No palette command writes `fsStore.renamingPath` unless a component reads it for that item
- [ ] Tests assert on store state and rendered content, not only on calls

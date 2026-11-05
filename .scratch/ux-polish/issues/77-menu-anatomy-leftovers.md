# 77: Menu anatomy leftovers from Issue 57

**What to build:** Issue 57 gave menu items one anatomy and dropped single-item groups in the menus the Issue and review R3 named. Its discovery left these out of scope; finish them with the same rules ("separators only between groups of 2 or more", sentence case, parallel labels, `variant="destructive"` for destructive items):
- Single-item groups in `src/lib/features/note-list/NoteRowMenu.svelte` (Open at `:199` alone above a separator; Change icon `:235`, Favorite `:241` and Reveal in Finder `:248` each between separators), `src/lib/features/rail-shell/FilesNavigator.svelte` (separators at `:356` and `:379`) and `src/lib/features/rail-shell/TypesNavigator.svelte` (separators at `:301-370`). Merge or drop separators so no group holds one item.
- Kanban delete items use `class="text-destructive"` instead of the primitive's `variant="destructive"`: `src/lib/plugins/kanban/KanbanCard.svelte:268` and `src/lib/plugins/kanban/KanbanLane.svelte:300`.
- "Copy block embed" (`src/lib/core/markdown-editor/MarkdownEditor.svelte:744`) does not parallel its neighbour "Copy link to block" (`:739`), as `.scratch/ux-polish/work/overlays.md:97` notes under P17. Pick one pattern for both labels (for example "Copy block link" / "Copy block embed") and update the help page that quotes them.

**Blocked by:** none

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Rendered menu tests (as in `KanbanView.test.ts` "card and lane menus") assert the entries of each changed menu with separators as `---`, and no group holds a single item.
- [ ] The two kanban delete items render with the destructive variant (`data-variant="destructive"`).
- [ ] The two block-copy labels follow one pattern; tests and help pages quote the new labels.

## Notes

- **Source:** Issue 57 review finding 1 (`.scratch/ux-polish/work/57/review.md`), from `.scratch/ux-polish/work/57/discovery.md` "Defaults taken". Line numbers checked against the Issue 57 branch.
- **Owner decision:** the label for the block-copy pair is copy; check with the owner before renaming a shipped label.
- **Out of scope:** the hand-rolled canvas menu (also listed in Issue 57 discovery); the KanbanCard color sub-menu keeps its separator above "Remove color", since it divides the swatch row (Issue 57 review finding 3).
- **Size:** S.

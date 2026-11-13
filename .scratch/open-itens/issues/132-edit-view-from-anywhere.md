# 132: Edit view opens from anywhere, hidden views included

**Origin:** `view-editor` Issue 04, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-editor/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** today Edit view exists only on a visible Types row (`TypesNavigator.svelte:147-152`, `:312`), and `viewNavigatorRows` skips `_visible: false` (`lens.logic.ts:646-647`). Every New table file starts hidden (`collection.service.ts:18-21`), and 07 lets the dialog hide a view, which would remove its own way back (PRD default D4).

- **One mount.** Mount one Edit view dialog in `src/lib/app/AppOverlays.svelte`, opened through a new `src/lib/features/type-definitions/view-dialog.store.svelte.ts` (`openEdit(path)`, getters for the open state and the path). `existingLabels` comes from `viewLabels(fsStore.fileTree, typeDefinitionsStore.entriesByPath, path)`, as at `TypesNavigator.svelte:481`. Remove the local Edit mount from `TypesNavigator.svelte` (`:117-119`, `:147-152`, `:479-482`); New view stays local in both navigators.
- **Entry points:**
  - The Types row menu, as today, through the store.
  - `NoteRowMenu.svelte` (`src/lib/features/note-list/`, items at `:205-268`): "Edit view" on any `.view` row, next to Show in Views.
  - A context menu on a view pin in the rail (`src/lib/features/rail-shell/Rail.svelte:138-157`, which has none today): Edit view, Open in editor, Unpin (`setViewRailPin(path, false)`, `type-definitions.service.ts:465`).
  - A header menu on a view's rail list (`RailNoteList.svelte`, beside the rule line): Edit view and Open in editor. Today `openFileInEditor` is reachable only from the error state (`RailNoteList.svelte:871`).

**Blocked by:** 131

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`; then `bash scripts/e2e.sh` for `rail-shell.spec.ts`.

- [ ] Failing tests first:
  - `src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts` (or a new `NoteRowMenu.edit-view.test.ts`): a hidden `.view` row's menu shows "Edit view"; clicking it renders a dialog titled "Edit view" whose name input holds the file's `_sidebar_label`.
  - `src/tests/lib/features/rail-shell/Rail.test.ts`: right-clicking a view pin shows Unpin, Edit view and Open in editor; Unpin writes content without `_rail`.
  - `src/tests/lib/features/rail-shell/RailNoteList.view.test.ts`: a view list that ran shows the header menu; Edit view opens the dialog.
  - `src/tests/lib/features/rail-shell/TypesNavigator.test.ts`: the existing Edit view tests pass through the store.
- [ ] `e2e/specs/rail-shell.spec.ts`: New table, then its Files row menu, Edit view: the dialog renders the file's name.
- [ ] `help/documentation/25-types-and-relationships.md` § Pinned Rail Items (pin menu), § Types Navigator Context Menu, § Creating a View (Show in Views paragraph) list the new entry points.

## Notes

- Needs 02 (the dialog takes a path and reads its label from the file). Blocked by 03 only to avoid a conflict: both edit `ViewDialog.svelte` and help § Creating a View.
- Shares `RailNoteList.svelte` with `view-engine-fixes/07` and `/10`; chain those after this Issue.
- **Size:** M.

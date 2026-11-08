# 16: A meta-bind button can open a view

**What to build:** Issue 15 makes a view unreachable by wikilink, so a note needs another way to open one. The owner chose a new button action:

````markdown
```meta-bind-button
label: Projetos
action:
  type: openView
  path: _system/views/Projects.view
```
````

- **`path`:** vault-relative. Refuse a path that leaves the vault or does not end in `.view`, with the existing inline error widget, for example `Invalid button: openView needs a .view path`.
- **What opens:** the same as a click on the view's row in the menu. It respects `_open_in_editor`: a hidden table opens in the editor, and an ordinary view fills the note list. It works for a `_visible: false` view, which has no row. Reuse `openRailView(path, opensInEditor)` (`app/rail-navigation.ts:32`), which the Open view commands call (`app/commands.ts:82`), with `getViewOpensInEditor`. `onPickView` (`AppShell.svelte:231`) does not read `_open_in_editor`.
- **Missing file:** show a clear error message and stop the button's remaining actions, like an `open` action with a bad link. Do not create anything.
- **Rename:** references are not rewritten. The error above is how the user finds out.

`core/` cannot import `features/` (ADR-0003), and the widget lives under `core/markdown-editor/`. Add a method to `EditorHost` (`core/markdown-editor/editor-host.ts`), which the widget already reads through the `editorHost` facet (`widgets/meta-bind-button-widget.ts`), and implement it in `appEditorHost` (`app/editor-host.ts:87`). Resolve `false` for a missing file, as `createNote` does, so `executeButtonAction` stops the remaining actions. Check `layer-rules.test.ts` adds no new violation.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing tests first:
  - Action validation (`meta-bind-button.logic.ts:57-77`, `VALID_ACTION_TYPES`; `parsers/meta-bind-button.ts` only finds the fenced blocks): `openView` with a path is valid. No path, a non-`.view` path and a `../` path give the inline error.
  - Widget, with real stores: clicking a button for a view with `_open_in_editor: true` opens the tab. Clicking one for an ordinary view picks it, and the note list shows its rows.
  - Missing file: an error message, no file created, and later actions in `actions:` do not run.
- [x] Unknown fields keep the behavior documented in `help/documentation/24-meta-bind.md`.
- [x] `24-meta-bind.md` documents the action, in the same section as `open` and `createNote`.

## Notes

- Interactive widget elements must `stopPropagation` on `mousedown` (CLAUDE.md, Performance rule 11). The button already does; keep it for this action.
- A view picked this way while another rail item is active: follow what `openRailView` does, and check that the Types navigator state stays consistent.
- **Size:** M.

## Comments

- 2026-11-05, branch issue/16-meta-bind-open-view-action: meta-bind buttons gain an `openView` action (validated `.view` path; opens `_open_in_editor` views as a tab, picks others in the rail; missing file shows a toast and stops later actions). Docs and example vault updated. Review round 1 APPROVED (findings fixed: example section 14a, hidden-view test, toast wording, case-sensitivity documented); round 2 APPROVED (one nit, not applied). Full suite at dff109638: 540 files, 12821 tests passed, pnpm build passed.
